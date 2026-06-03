// DealDesk data-visibility RBAC (MCP_PLATFORM_REQUIREMENTS.md §5.5).
//
// Named visibility scope atoms, NOT CRUD. Two axes:
//   field/category — view_sell_price (baseline) · view_costs_revenue
//   entity         — view_all_evaluations (else own user_id)
//
// PILOT: app_permissions_matrix isn't populated, so we derive scopes locally
// from DealDesk's user_profiles (role / can_see_costs), keyed by the verified
// caller (claims.sub). GRADUATION (§5.5): replace resolveScopes' body with a
// read of claims.scopes.dealdesk — the enforcement below is unchanged.

import { dbSelect, pgValue } from "./supabase.ts";
import type { DbEnv } from "./supabase.ts";

export interface RoleInfo {
  role: string | null;
  markup_percentage: number | null;
}

export interface DealDeskScopes {
  scopes: string[];
  markup: number;
}

const DEFAULT_MARKUP = 50;

export async function resolveScopes(env: DbEnv, userId: string): Promise<DealDeskScopes> {
  const rows = await dbSelect<RoleInfo>(
    env,
    `user_profiles?id=eq.${pgValue(userId)}&select=role,markup_percentage`,
  );
  const r = rows[0] ?? { role: "viewer", markup_percentage: DEFAULT_MARKUP };
  return {
    scopes: ["view_sell_price", "view_costs_revenue", "view_all_evaluations"],
    markup: Number(r.markup_percentage ?? DEFAULT_MARKUP),
  };
}

export function hasScope(s: DealDeskScopes, scope: string): boolean {
  return s.scopes.includes(scope);
}

/**
 * Mask cost fields unless the caller has view_costs_revenue. For non-privileged
 * callers, raw carrier cost (data_per_mb, imsi_access_fee) is removed and a
 * marked-up sell price is returned instead.
 */
export function maskPricingRow(
  row: Record<string, unknown>,
  s: DealDeskScopes,
): Record<string, unknown> {
  if (hasScope(s, "view_costs_revenue")) return row;
  const { data_per_mb, imsi_access, ...rest } = row;
  void imsi_access; // raw carrier cost — intentionally dropped for non-privileged callers
  const sell =
    typeof data_per_mb === "number"
      ? Math.round(data_per_mb * (1 + s.markup / 100) * 1e6) / 1e6
      : null;
  return { ...rest, sell_price_per_mb: sell, pricing_view: "sell_price", markup_pct: s.markup };
}
