// Minimal MCP-over-Streamable-HTTP JSON-RPC handler for a per-app MCP.
//
// A per-app MCP behind the gateway is NOT an OAuth server — it's a plain HTTP
// endpoint the gateway forwards JSON-RPC to, carrying an MGT-JWT. This handler
// wraps the whole §6 contract so an app team only writes tools:
//
//   verify MGT-JWT → (per tool) gate on app/scope → run → emit audit row.
//
// Transport mirrors lr-mcp-prompts: one POST = one JSON-RPC round trip, no SSE.
// Methods: initialize, tools/list, tools/call. Runtime-agnostic (Workers + Deno).

import type { MgtClaims, Scope } from "./claims.ts";
import { verifyMgtJwt, bearerFrom, type VerifyConfig } from "./verify.ts";
import { checkApp, checkScope, checkAdmin } from "./scopes.ts";
import { emitAudit, type AppAuditEnv } from "./audit.ts";

export interface ToolContext {
  claims: MgtClaims;
  appId: string;
  /** Supabase auth.users.id of the caller. Use for row-level filters. */
  userId: string;
  email: string;
  traceId: string | null;
  /** Tool runtime env (DB creds, secrets). Populated from AppMcpConfig.toolEnv. */
  env: Record<string, unknown>;
}

export interface ToolDef {
  name: string; // <app_id>_<verb>_<noun>
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema object
  /** Action scope this tool requires. Omit for an unguarded read within the app. */
  requiredScope?: Scope;
  /** Mark admin-only tools (e.g. a prompts namespace). */
  adminOnly?: boolean;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

export interface AppMcpConfig {
  appId: string;
  serverName: string;
  serverVersion: string;
  /** Surfaced to the model in initialize — explain the tools' workflow. */
  instructions?: string;
  verify: VerifyConfig;
  audit?: AppAuditEnv; // omit to skip app-side detail rows
  /** Runtime env passed to every tool handler via ctx.env (DB creds, secrets). */
  toolEnv?: Record<string, unknown>;
  tools: ToolDef[];
}

// ── JSON-RPC plumbing ──────────────────────────────────────────────────────
const RPC_PARSE_ERROR = -32700;
const RPC_INVALID_REQUEST = -32600;
const RPC_METHOD_NOT_FOUND = -32601;
const RPC_INTERNAL_ERROR = -32603;
const RPC_UNAUTHORIZED = -32001;
const RPC_FORBIDDEN = -32002;

type JsonRpcId = string | number | null;

function ok(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function err(id: JsonRpcId, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}
function toolText(payload: unknown) {
  return { content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) }] };
}
function toolError(message: string) {
  return { isError: true, content: [{ type: "text", text: message }] };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/**
 * Handle one HTTP request to a per-app MCP. Wire this from a Worker fetch() or
 * a Deno serve() handler — both just pass the Request in.
 */
export async function handleMcpRequest(req: Request, config: AppMcpConfig): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonResponse(err(null, RPC_INVALID_REQUEST, "POST only"), 405);

  // 1. Verify the MGT-JWT (§6.1–6.2). One identity check, no Supabase.
  const token = bearerFrom(req.headers.get("Authorization"));
  if (!token) return jsonResponse(err(null, RPC_UNAUTHORIZED, "missing bearer token"), 401);
  const verified = await verifyMgtJwt(token, config.verify);
  if (!verified.ok) return jsonResponse(err(null, RPC_UNAUTHORIZED, verified.reason), 401);
  const claims = verified.claims;
  const traceId = req.headers.get("X-Trace-Id");

  // 2. Parse JSON-RPC.
  let body: { id?: JsonRpcId; method?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(err(null, RPC_PARSE_ERROR, "invalid JSON"));
  }
  const id = body.id ?? null;
  const method = body.method;

  if (method === "initialize") {
    return jsonResponse(
      ok(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: config.serverName, version: config.serverVersion },
        capabilities: { tools: {} },
        instructions: config.instructions ?? "",
      }),
    );
  }

  if (method === "notifications/initialized") {
    return jsonResponse(ok(id, {}));
  }

  if (method === "tools/list") {
    // Only advertise tools the caller can actually use, so the agent never
    // sees a tool it will be denied (app gate + per-tool scope/admin).
    const appGate = checkApp(claims, config.appId);
    const visible = !appGate.allow
      ? []
      : config.tools.filter((t) => {
          if (t.adminOnly && !claims.is_admin) return false;
          if (t.requiredScope && !checkScope(claims, config.appId, t.requiredScope).allow) return false;
          return true;
        });
    return jsonResponse(
      ok(id, {
        tools: visible.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }),
    );
  }

  if (method === "tools/call") {
    const name = String(body.params?.name ?? "");
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const tool = config.tools.find((t) => t.name === name);
    if (!tool) return jsonResponse(err(id, RPC_METHOD_NOT_FOUND, `unknown tool: ${name}`));

    const ctx: ToolContext = {
      claims,
      appId: config.appId,
      userId: claims.sub,
      email: claims.email,
      traceId,
      env: config.toolEnv ?? {},
    };

    // Gate: app access, then admin, then scope (§6.3–6.5).
    const gate =
      checkApp(claims, config.appId).allow === false
        ? checkApp(claims, config.appId)
        : tool.adminOnly && checkAdmin(claims).allow === false
          ? checkAdmin(claims)
          : tool.requiredScope
            ? checkScope(claims, config.appId, tool.requiredScope)
            : { allow: true as const };

    if (!gate.allow) {
      if (config.audit) {
        await emitAudit(config.audit, {
          user_id: claims.sub, email: claims.email, app_id: config.appId,
          tool_name: name, params: args, result: "denied", trace_id: traceId,
        });
      }
      return jsonResponse(err(id, RPC_FORBIDDEN, gate.reason));
    }

    const started = Date.now();
    try {
      const result = await tool.handler(args, ctx);
      if (config.audit) {
        await emitAudit(config.audit, {
          user_id: claims.sub, email: claims.email, app_id: config.appId,
          tool_name: name, params: args, result: "ok",
          latency_ms: Date.now() - started, trace_id: traceId,
        });
      }
      return jsonResponse(ok(id, toolText(result)));
    } catch (e) {
      if (config.audit) {
        await emitAudit(config.audit, {
          user_id: claims.sub, email: claims.email, app_id: config.appId,
          tool_name: name, params: args, result: "error",
          latency_ms: Date.now() - started, trace_id: traceId,
        });
      }
      return jsonResponse(ok(id, toolError(String((e as Error)?.message ?? e))));
    }
  }

  return jsonResponse(err(id, RPC_METHOD_NOT_FOUND, `unknown method: ${method}`));
}
