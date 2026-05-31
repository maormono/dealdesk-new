// App-side audit emitter (§8, cross-app rule #5).
//
// The gateway writes the primary mcp_audit_log row for every dispatch. A
// per-app MCP MAY write its own detail row to the SAME table, joined on the
// trace_id the gateway forwards in the `X-Trace-Id` header — useful when the
// app wants to record an app-specific result the gateway can't see.
//
// Never log raw params — only a sha256. Audit failures must never break a tool
// call.

export interface AppAuditEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface AppAuditRecord {
  user_id: string;
  email: string;
  app_id: string;
  tool_name: string;
  params: unknown;
  result: "ok" | "denied" | "error";
  latency_ms?: number;
  trace_id?: string | null;
  client_id?: string | null;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Write one detail row. Fire-and-forget semantics — logs and swallows errors. */
export async function emitAudit(
  env: AppAuditEnv,
  rec: AppAuditRecord,
): Promise<void> {
  try {
    const params_hash = await sha256Hex(JSON.stringify(rec.params ?? null));
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/mcp_audit_log`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: rec.user_id,
        email: rec.email,
        app_id: rec.app_id,
        tool_name: rec.tool_name,
        params_hash,
        result: rec.result,
        latency_ms: rec.latency_ms ?? null,
        trace_id: rec.trace_id ?? null,
        client_id: rec.client_id ?? null,
      }),
    });
    if (!res.ok) {
      console.warn(`[audit] app emit non-OK ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.warn(`[audit] app emit threw: ${String(err)}`);
  }
}
