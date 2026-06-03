// Thin PostgREST helper. Service-role key — RBAC is enforced in tool handlers
// via MGT-JWT claims (cross-app rule #4) + DealDesk visibility scopes
// (dealdesk-rbac.ts), NOT Postgres RLS. Callers MUST apply claim-derived row
// filters for user-owned data and mask confidential fields.

export interface DbEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function headers(env: DbEnv): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

/** GET /rest/v1/<pathAndQuery>. `pathAndQuery` is a PostgREST path incl. query string. */
export async function dbSelect<T = unknown>(env: DbEnv, pathAndQuery: string): Promise<T[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: headers(env) });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
  return (await res.json()) as T[];
}

/** POST one row, return the inserted representation. */
export async function dbInsert<T = unknown>(
  env: DbEnv,
  table: string,
  row: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers(env), Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`supabase insert ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as T[];
  return rows[0];
}

/** Encode a value for a PostgREST filter (e.g. eq.<v>). */
export function pgValue(v: string | number | boolean): string {
  return encodeURIComponent(String(v));
}
