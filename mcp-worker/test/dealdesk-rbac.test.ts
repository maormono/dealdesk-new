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

describe("resolveScopes", () => {
  it("sales without cost visibility → sell price only", async () => {
    stubProfile({ role: "sales", can_see_costs: false, markup_percentage: 40 });
    const s = await resolveScopes(env, "u1");
    expect(s.scopes).toEqual(["view_sell_price"]);
    expect(s.markup).toBe(40);
  });

  it("can_see_costs adds view_costs_revenue", async () => {
    stubProfile({ role: "sales", can_see_costs: true, markup_percentage: 50 });
    const s = await resolveScopes(env, "u1");
    expect(s.scopes).toContain("view_costs_revenue");
    expect(s.scopes).not.toContain("view_all_evaluations");
  });

  it("admin gets cost + all-evaluations", async () => {
    stubProfile({ role: "admin", can_see_costs: false, markup_percentage: 0 });
    const s = await resolveScopes(env, "u1");
    expect(s.scopes).toEqual(expect.arrayContaining(["view_sell_price", "view_costs_revenue", "view_all_evaluations"]));
  });

  it("missing profile defaults to least privilege", async () => {
    stubProfile(null);
    const s = await resolveScopes(env, "u1");
    expect(s.scopes).toEqual(["view_sell_price"]);
  });
});

describe("maskPricingRow", () => {
  const row = { tadig: "USACG", data_per_mb: 0.5, imsi_access: 1.2, lte: true };

  it("masks raw cost for sell-price-only users", () => {
    const s: DealDeskScopes = { scopes: ["view_sell_price"], markup: 50 };
    const out = maskPricingRow(row, s);
    expect(out.data_per_mb).toBeUndefined();
    expect(out.imsi_access).toBeUndefined();
    expect(out.sell_price_per_mb).toBe(0.75); // 0.5 * 1.5
    expect(out.pricing_view).toBe("sell_price");
    expect(out.tadig).toBe("USACG");
  });

  it("returns raw row when cost visibility granted", () => {
    const s: DealDeskScopes = { scopes: ["view_sell_price", "view_costs_revenue"], markup: 50 };
    expect(maskPricingRow(row, s)).toBe(row);
  });
});
