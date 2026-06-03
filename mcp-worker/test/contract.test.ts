import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import { generateKeyPair, exportJWK, SignJWT, calculateJwkThumbprint } from "jose";
import { handleMcpRequest, type AppMcpConfig } from "../src/core/mcp.ts";
import { dealdeskTools, APP_ID } from "../src/tools.ts";

const ISSUER = "https://gw.test";
const JWKS_URL = "https://gw.test/.well-known/jwks.json";
let priv: CryptoKey;
let pubJwk: Record<string, unknown>;
let kid: string;

beforeAll(async () => {
  const kp = await generateKeyPair("RS256");
  priv = kp.privateKey;
  pubJwk = (await exportJWK(kp.publicKey)) as Record<string, unknown>;
  kid = await calculateJwkThumbprint(pubJwk as never);
  pubJwk.kid = kid;
  pubJwk.alg = "RS256";
  pubJwk.use = "sig";
});

async function mint(claims: Record<string, unknown>) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(priv);
}

afterEach(() => vi.restoreAllMocks());

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (u: string) => {
      if (String(u).includes("/.well-known/jwks.json")) {
        return new Response(JSON.stringify({ keys: [pubJwk] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
}

function config(): AppMcpConfig {
  return {
    appId: APP_ID,
    serverName: "t",
    serverVersion: "0",
    // Inject the local public key (jose's createRemoteJWKSet can't be reached
    // by vi.stubGlobal — it captures fetch at load and would hit the network).
    verify: { jwksUrl: JWKS_URL, issuer: ISSUER, jwks: { keys: [pubJwk as never] } },
    toolEnv: { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", CONFIRMATION_SECRET: "0".repeat(64) },
    tools: dealdeskTools,
  };
}

function rpc(method: string, params?: unknown, token?: string) {
  return new Request("https://dd.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

describe("per-app contract", () => {
  it("401 without a token", async () => {
    stubFetch();
    const res = await handleMcpRequest(rpc("tools/list"), config());
    expect(res.status).toBe(401);
  });

  it("a read token lists read tools but not the write tool", async () => {
    stubFetch();
    const tok = await mint({ sub: "u1", email: "a@monogoto.io", name: "A", is_admin: false, apps: ["dealdesk"], scopes: { dealdesk: ["read"] } });
    const res = await handleMcpRequest(rpc("tools/list", {}, tok), config());
    const body = (await res.json()) as any;
    const names = body.result.tools.map((t: any) => t.name);
    expect(names).toContain("dealdesk_lookup_rate_card");
    expect(names).not.toContain("dealdesk_save_evaluation");
  });

  it("denies the write tool for a read-only caller", async () => {
    stubFetch();
    const tok = await mint({ sub: "u1", email: "a@monogoto.io", name: "A", is_admin: false, apps: ["dealdesk"], scopes: { dealdesk: ["read"] } });
    const res = await handleMcpRequest(
      rpc("tools/call", { name: "dealdesk_save_evaluation", arguments: { mode: "preview", deal_request: {}, sim_quantity: 1, countries: ["US"] } }, tok),
      config(),
    );
    const body = (await res.json()) as any;
    expect(body.error.code).toBe(-32002); // RPC_FORBIDDEN
  });

  it("denies all tools when dealdesk not in claims.apps", async () => {
    stubFetch();
    const tok = await mint({ sub: "u1", email: "a@monogoto.io", name: "A", is_admin: false, apps: ["leadradar"], scopes: { leadradar: ["read"] } });
    const res = await handleMcpRequest(rpc("tools/list", {}, tok), config());
    const body = (await res.json()) as any;
    expect(body.result.tools).toEqual([]);
  });
});
