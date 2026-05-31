// DealDesk per-app MCP tool surface (MCP_PLATFORM_REQUIREMENTS.md §7).
//
// Auth model: the gateway already verified identity (MGT-JWT) and gated app
// access (claims.apps["dealdesk"]) + coarse read/write. These handlers add the
// DealDesk data-visibility RBAC (§5.5) via dealdesk-rbac.ts: raw carrier cost
// is masked for callers without view_costs_revenue.

import type { ToolDef, ToolContext } from "./core/mcp.ts";
import { dbSelect, dbInsert, pgValue } from "./lib/supabase.ts";
import type { DbEnv } from "./lib/supabase.ts";
import { issueToken, verifyToken, type ConfirmationEnv } from "./lib/confirmation.ts";
import { resolveScopes, maskPricingRow, hasScope } from "./lib/dealdesk-rbac.ts";

export const APP_ID = "dealdesk";

type ToolEnv = DbEnv & ConfirmationEnv;
const envOf = (ctx: ToolContext): ToolEnv => ctx.env as unknown as ToolEnv;

const PRICING_COLS =
  "tadig,network_name,country,region,source_name,currency,data_per_mb,imsi_access_fee,sms_mo,voice_moc,lte_4g,lte_5g,volte";

interface PricingRow {
  tadig: string;
  network_name: string;
  country: string;
  source_name: string;
  currency: string;
  data_per_mb: number | null;
  imsi_access_fee: number | null;
}

// ── READ: rate card lookup (source-aware, cost-masked) ─────────────────────
const lookupRateCard: ToolDef = {
  name: "dealdesk_lookup_rate_card",
  description:
    "Look up carrier rate-card pricing from the DealDesk pricing tables. Filter by country (substring), TADIG (exact), and/or pricing source (A1, Telefonica, Tele2, US Cellular, ...). Returns per-source rates and tech flags. Raw carrier cost is shown only to users with cost visibility; others see a marked-up sell price.",
  inputSchema: {
    type: "object",
    properties: {
      country: { type: "string", description: "Country name, case-insensitive substring (e.g. 'United States')." },
      tadig: { type: "string", description: "Exact TADIG code (e.g. 'USACG')." },
      source: { type: "string", description: "Pricing source name (A1, Telefonica, Tele2, ...)." },
      limit: { type: "integer", minimum: 1, maximum: 200, description: "Max rows (default 50)." },
    },
    additionalProperties: false,
  },
  requiredScope: "read",
  handler: async (args, ctx) => {
    const env = envOf(ctx);
    const scopes = await resolveScopes(env, ctx.userId);
    const q: string[] = [`select=${PRICING_COLS}`, `limit=${Number(args.limit ?? 50)}`];
    if (args.country) q.push(`country=ilike.*${pgValue(String(args.country))}*`);
    if (args.tadig) q.push(`tadig=eq.${pgValue(String(args.tadig))}`);
    if (args.source) q.push(`source_name=eq.${pgValue(String(args.source))}`);
    const rows = await dbSelect<PricingRow>(env, `v_network_pricing_all?${q.join("&")}`);
    return {
      count: rows.length,
      pricing_view: hasScope(scopes, "view_costs_revenue") ? "cost" : "sell_price",
      rows: rows.map((r) => maskPricingRow(r as unknown as Record<string, unknown>, scopes)),
    };
  },
};

// ── READ: realized (cheapest) cost for a TADIG — cost-visibility only ──────
const getRealizedCost: ToolDef = {
  name: "dealdesk_get_realized_cost",
  description:
    "For one TADIG, compare data cost across all pricing sources and return the cheapest source (min data_per_mb with that source's IMSI access fee) — Monogoto's realized network cost. Requires cost-visibility permission; denied for sell-price-only users.",
  inputSchema: {
    type: "object",
    properties: { tadig: { type: "string", description: "TADIG code to price." } },
    required: ["tadig"],
    additionalProperties: false,
  },
  requiredScope: "read",
  handler: async (args, ctx) => {
    const env = envOf(ctx);
    const scopes = await resolveScopes(env, ctx.userId);
    if (!hasScope(scopes, "view_costs_revenue")) {
      throw new Error(
        "access denied: dealdesk_get_realized_cost requires the view_costs_revenue permission (raw carrier cost).",
      );
    }
    const rows = await dbSelect<PricingRow>(
      env,
      `v_network_pricing_all?tadig=eq.${pgValue(String(args.tadig))}&select=${PRICING_COLS}`,
    );
    const priced = rows.filter((r) => typeof r.data_per_mb === "number");
    if (priced.length === 0) return { tadig: args.tadig, cheapest: null, sources: rows };
    const cheapest = priced.reduce((a, b) =>
      (b.data_per_mb as number) < (a.data_per_mb as number) ? b : a,
    );
    return { tadig: args.tadig, cheapest, sources: priced };
  },
};

// ── READ: global deal rules (non-confidential) ─────────────────────────────
const getDealRules: ToolDef = {
  name: "dealdesk_get_deal_rules",
  description:
    "Return the global DealDesk evaluation rules (profit thresholds, min deal size, max risk score) from the single-row deal_rules config.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  requiredScope: "read",
  handler: async (_args, ctx) => {
    const rows = await dbSelect<{ rules: unknown }>(envOf(ctx), "deal_rules?id=eq.1&select=rules");
    return { rules: rows[0]?.rules ?? null };
  },
};

// ── WRITE: save a deal evaluation (preview → apply) ────────────────────────
function evaluationRow(args: Record<string, unknown>, ctx: ToolContext) {
  return {
    user_id: ctx.userId, // from MGT-JWT, never args
    user_email: ctx.email, // from MGT-JWT, never args
    deal_name: (args.deal_name as string) ?? null,
    status: "evaluated",
    deal_request: args.deal_request,
    basic_evaluation: (args.basic_evaluation as unknown) ?? null,
    enhanced_analysis: (args.enhanced_analysis as unknown) ?? null,
    comprehensive_analysis: (args.comprehensive_analysis as unknown) ?? null,
    sim_quantity: args.sim_quantity,
    countries: args.countries,
    duration_months: (args.duration_months as number) ?? null,
    verdict: (args.verdict as string) ?? null,
    profit_margin: (args.profit_margin as number) ?? null,
    risk_score: (args.risk_score as number) ?? null,
    total_contract_value: (args.total_contract_value as number) ?? null,
  };
}

// The payload bound into the confirmation token = user-supplied fields only;
// identity is added from ctx at apply-time and bound via the HMAC.
function tokenPayload(args: Record<string, unknown>) {
  return {
    deal_request: args.deal_request,
    sim_quantity: args.sim_quantity,
    countries: args.countries,
    deal_name: args.deal_name ?? null,
    duration_months: args.duration_months ?? null,
    verdict: args.verdict ?? null,
    profit_margin: args.profit_margin ?? null,
    risk_score: args.risk_score ?? null,
    total_contract_value: args.total_contract_value ?? null,
  };
}

const saveEvaluation: ToolDef = {
  name: "dealdesk_save_evaluation",
  description:
    "Save a deal evaluation to the user's DealDesk history. TWO-STEP: call with mode='preview' to get a diff + confirmation_token; then call again with mode='apply' and the same confirmation_token (and identical fields) to persist. The row is always attributed to the authenticated caller — user identity is taken from the verified token, not arguments.",
  inputSchema: {
    type: "object",
    properties: {
      mode: { type: "string", enum: ["preview", "apply"], description: "preview (default) returns a token; apply persists." },
      confirmation_token: { type: "string", description: "Required for apply; the token returned by preview." },
      deal_request: { type: "object", description: "Full deal request payload (inputs)." },
      sim_quantity: { type: "integer", minimum: 1 },
      countries: { type: "array", items: { type: "string" }, minItems: 1 },
      deal_name: { type: "string" },
      duration_months: { type: "integer", minimum: 1 },
      verdict: { type: "string" },
      profit_margin: { type: "number" },
      risk_score: { type: "integer" },
      total_contract_value: { type: "number" },
      basic_evaluation: { type: "object" },
      enhanced_analysis: { type: "object" },
      comprehensive_analysis: { type: "object" },
    },
    required: ["deal_request", "sim_quantity", "countries"],
    additionalProperties: false,
  },
  requiredScope: "write",
  handler: async (args, ctx) => {
    const env = envOf(ctx);
    const mode = (args.mode as string) ?? "preview";
    const payload = tokenPayload(args);
    if (mode === "preview") {
      const confirmation_token = await issueToken(env, ctx.userId, payload);
      return {
        mode: "preview",
        preview: { ...payload, user_email: ctx.email },
        confirmation_token,
        note: "Call again with mode='apply', this confirmation_token, and identical fields to save.",
      };
    }
    const token = String(args.confirmation_token ?? "");
    if (!token) throw new Error("confirmation_token required for apply");
    const v = await verifyToken(env, token, ctx.userId, payload);
    if (!v.ok) throw new Error(`confirmation failed: ${v.reason}`);
    const saved = await dbInsert(env, "deal_evaluations", evaluationRow(args, ctx));
    return { mode: "apply", saved };
  },
};

export const dealdeskTools: ToolDef[] = [lookupRateCard, getRealizedCost, getDealRules, saveEvaluation];
