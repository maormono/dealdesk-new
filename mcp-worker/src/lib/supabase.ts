// Thin PostgREST client over the shared OS Supabase project, service-role.
//
// Per the per-app contract (cross-app rule #4): the Worker uses the service
// role for DB access but always filters rows by the verified caller identity
// from claims — never client-provided identity. The role's GRANTs should be
// scoped to exactly the DealDesk tables (see MCP_ADOPTION §3.3); this client
// just speaks REST.

export interface DbEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function headers(env: DbEnv, extra: Record<string, string> = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function sbSelect<T = unknown>(
  env: DbEnv,
  table: string,
  query: string,
): Promise<T[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: headers(env),
  });
  if (!res.ok) throw new Error(`select ${table} HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as T[];
}

export async function sbInsert<T = unknown>(
  env: DbEnv,
  table: string,
  row: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: headers(env, { Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert ${table} HTTP ${res.status}: ${await res.text()}`);
  const rows = (await res.json()) as T[];
  return rows[0];
}

export async function sbUpdate<T = unknown>(
  env: DbEnv,
  table: string,
  query: string,
  patch: Record<string, unknown>,
): Promise<T[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: headers(env, { Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update ${table} HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as T[];
}
