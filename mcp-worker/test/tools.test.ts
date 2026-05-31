import { describe, it, expect, vi, afterEach } from "vitest";
import { dealdeskTools, APP_ID } from "../src/tools.ts";
import type { ToolContext } from "../src/core/mcp.ts";

const ENV = {
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
  CONFIRMATION_SECRET: "0".repeat(64),
};

function ctxFor(): ToolContext {
  return {
    claims: {} as never,
    appId: "dealdesk",
    userId: "user-1",
    email: "a@monogoto.io",
    traceId: null,
    env: ENV,
  };
}
const ctx = ctxFor();
const tool = (n: string) => dealdeskTools.find((t) => t.name === n)!;

// Route mocked fetch by URL: user_profiles (RBAC) / pricing / insert.
function route(opts: { profile?: Record<string, unknown>; pricing?: unknown[]; rules?: unknown[]; insert?: unknown }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      let body: unknown = [];
      if (String(url).includes("user_profiles")) body = opts.profile ? [opts.profile] : [];
      else if (String(url).includes("v_network_pricing_all")) body = opts.pricing ?? [];
      else if (String(url).includes("deal_rules")) body = opts.rules ?? [];
      else if (String(url).includes("deal_evaluations")) body = opts.insert ?? [];
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    }),
  );
  return calls;
}
const SALES = { role: "sales", can_see_costs: false, markup_percentage: 50 };
const ADMIN = { role: "admin", can_see_costs: true, markup_percentage: 0 };
afterEach(() => vi.restoreAllMocks());

describe("tool catalog", () => {
  it("exposes the four §7 tools with correct names + scopes", () => {
    expect(APP_ID).toBe("dealdesk");
    expect(dealdeskTools.map((t) => t.name).sort()).toEqual([
      "dealdesk_get_deal_rules",
      "dealdesk_get_realized_cost",
      "dealdesk_lookup_rate_card",
      "dealdesk_save_evaluation",
    ]);
    expect(tool("dealdesk_lookup_rate_card").requiredScope).toBe("read");
    expect(tool("dealdesk_save_evaluation").requiredScope).toBe("write");
  });
});

describe("dealdesk_lookup_rate_card", () => {
  it("queries v_network_pricing_all filtered by country + source", async () => {
    const calls = route({ profile: SALES, pricing: [{ tadig: "USACG", source_name: "A1", data_per_mb: 0.5 }] });
    await tool("dealdesk_lookup_rate_card").handler({ country: "United States", source: "A1" }, ctx);
    const url = calls.find((c) => c.url.includes("v_network_pricing_all"))!.url;
    expect(url).toContain("country=ilike.*United%20States*");
    expect(url).toContain("source_name=eq.A1");
  });

  it("masks raw cost for a sales (non-cost) user", async () => {
    route({ profile: SALES, pricing: [{ tadig: "USACG", source_name: "A1", data_per_mb: 0.5, imsi_access_fee: 1 }] });
    const out: any = await tool("dealdesk_lookup_rate_card").handler({ tadig: "USACG" }, ctx);
    expect(out.pricing_view).toBe("sell_price");
    expect(out.rows[0].data_per_mb).toBeUndefined();
    expect(out.rows[0].sell_price_per_mb).toBe(0.75);
  });

  it("returns raw cost for an admin", async () => {
    route({ profile: ADMIN, pricing: [{ tadig: "USACG", source_name: "A1", data_per_mb: 0.5, imsi_access_fee: 1 }] });
    const out: any = await tool("dealdesk_lookup_rate_card").handler({ tadig: "USACG" }, ctx);
    expect(out.pricing_view).toBe("cost");
    expect(out.rows[0].data_per_mb).toBe(0.5);
  });
});

describe("dealdesk_get_realized_cost", () => {
  it("denies a sales (non-cost) user", async () => {
    route({ profile: SALES, pricing: [] });
    await expect(tool("dealdesk_get_realized_cost").handler({ tadig: "USACG" }, ctx)).rejects.toThrow(/access denied/i);
  });

  it("returns the cheapest source for an admin", async () => {
    route({
      profile: ADMIN,
      pricing: [
        { tadig: "USACG", source_name: "A1", data_per_mb: 0.5, imsi_access_fee: 1, currency: "EUR" },
        { tadig: "USACG", source_name: "Tele2", data_per_mb: 0.3, imsi_access_fee: 2, currency: "EUR" },
      ],
    });
    const out: any = await tool("dealdesk_get_realized_cost").handler({ tadig: "USACG" }, ctx);
    expect(out.cheapest.source_name).toBe("Tele2");
    expect(out.cheapest.data_per_mb).toBe(0.3);
  });
});

describe("dealdesk_get_deal_rules", () => {
  it("returns the single-row rules JSONB", async () => {
    route({ rules: [{ rules: { minDealSize: 100, maxRiskScore: 7 } }] });
    const out: any = await tool("dealdesk_get_deal_rules").handler({}, ctx);
    expect(out.rules.minDealSize).toBe(100);
  });
});

describe("dealdesk_save_evaluation", () => {
  const base = { deal_request: { x: 1 }, sim_quantity: 500, countries: ["US"] };

  it("preview returns a confirmation_token and does NOT insert", async () => {
    const calls = route({});
    const out: any = await tool("dealdesk_save_evaluation").handler({ mode: "preview", ...base }, ctx);
    expect(out.confirmation_token).toMatch(/^v1\./);
    expect(out.preview.sim_quantity).toBe(500);
    expect(calls.find((c) => c.url.includes("deal_evaluations"))).toBeUndefined();
  });

  it("apply with a valid token inserts with claim identity", async () => {
    route({});
    const pv: any = await tool("dealdesk_save_evaluation").handler({ mode: "preview", ...base }, ctx);
    const calls = route({ insert: [{ id: "uuid-1" }] });
    const out: any = await tool("dealdesk_save_evaluation").handler(
      { mode: "apply", confirmation_token: pv.confirmation_token, ...base },
      ctx,
    );
    expect(out.saved.id).toBe("uuid-1");
    const insertCall = calls.find((c) => c.url.includes("deal_evaluations"))!;
    const body = JSON.parse(insertCall.init!.body as string);
    expect(body.user_id).toBe("user-1");
    expect(body.user_email).toBe("a@monogoto.io");
    expect(body.sim_quantity).toBe(500);
  });

  it("apply with a tampered payload is rejected", async () => {
    route({});
    const pv: any = await tool("dealdesk_save_evaluation").handler({ mode: "preview", ...base }, ctx);
    route({ insert: [{ id: "uuid-1" }] });
    await expect(
      tool("dealdesk_save_evaluation").handler(
        { mode: "apply", confirmation_token: pv.confirmation_token, ...base, sim_quantity: 999 },
        ctx,
      ),
    ).rejects.toThrow(/payload_mismatch|confirmation/i);
  });
});
