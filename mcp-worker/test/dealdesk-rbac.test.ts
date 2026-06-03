import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveScopes, maskPricingRow, type DealDeskScopes } from "../src/lib/dealdesk-rbac.ts";

const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };

function stubProfile(row: Record<string, unknown> | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(row ? [row] : []), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}
afterEach(() => vi.restoreAllMocks());

// Per MCP_ACCESS_POLICY (2026-06-02): app-grant = full visibility. Every caller
// resolves to the same three scopes; only `markup` varies by profile.
const ALL_SCOPES = ["view_sell_price", "view_costs_revenue", "view_all_evaluations"];

describe("resolveScopes", () => {
  it("sales user gets full visibility", async () => {
    stubProfile({ role: "sales", markup_percentage: 40 });
    const s = await resolveScopes(env, "u1");
    expect(s.scopes).toEqual(ALL_SCOPES);
    expect(s.markup).toBe(40);
  });

  it("admin user gets full visibility", async () => {
    stubProfile({ role: "admin", markup_percentage: 0 });
    const s = await resolveScopes(env, "u1");
    expect(s.scopes).toEqual(ALL_SCOPES);
    expect(s.markup).toBe(0);
  });

  it("missing profile falls back to default markup, still full visibility", async () => {
    stubProfile(null);
    const s = await resolveScopes(env, "u1");
    expect(s.scopes).toEqual(ALL_SCOPES);
    expect(s.markup).toBe(50); // DEFAULT_MARKUP
  });
});

describe("maskPricingRow (legacy helper — kept for callers, no longer used by tools)", () => {
  const row = { tadig: "USACG", data_per_mb: 0.5, imsi_access: 1.2, lte: true };

  it("returns raw row when cost visibility granted", () => {
    const s: DealDeskScopes = { scopes: ["view_sell_price", "view_costs_revenue"], markup: 50 };
    expect(maskPricingRow(row, s)).toBe(row);
  });

  it("strips raw cost when only sell-price scope is present", () => {
    const s: DealDeskScopes = { scopes: ["view_sell_price"], markup: 50 };
    const out = maskPricingRow(row, s);
    expect(out.data_per_mb).toBeUndefined();
    expect(out.sell_price_per_mb).toBe(0.75);
  });
});
