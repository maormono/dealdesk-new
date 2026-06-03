// DealDesk per-app MCP tool surface (MCP_PLATFORM_REQUIREMENTS.md §7).
//
// Auth model: the gateway already verified identity (MGT-JWT) and gated app
// access (claims.apps["dealdesk"]) + coarse read/write. Per MCP_ACCESS_POLICY
// (2026-06-02), app-grant = full visibility — there is no per-field masking.

import type { ToolDef, ToolContext } from "./core/mcp.ts";
import { dbSelect, dbInsert, pgValue } from "./lib/supabase.ts";
import type { DbEnv } from "./lib/supabase.ts";
import { issueToken, verifyToken, type ConfirmationEnv } from "./lib/confirmation.ts";

export const APP_ID = "dealdesk";

type ToolEnv = DbEnv & ConfirmationEnv;
const envOf = (ctx: ToolContext): ToolEnv => ctx.env as unknown as ToolEnv;

// Real table is public.carrier_pricing (the view v_network_pricing_all does not
// exist in the live DB). Column names below match carrier_pricing exactly.
const PRICING_TABLE = "carrier_pricing";
const PRICING_COLS =
  "tadig,country,network_name,operator_name,carrier_source,data_per_mb,imsi_access,sms_mo,voice_moc,lte,five_g,lte_m,nb_iot,original_currency,is_current";

interface PricingRow {
  tadig: string;
  network_name: string;
  operator_name: string | null;
  country: string;
  carrier_source: string;
  original_currency: string | null;
  data_per_mb: number | null;
  imsi_access: number | null;
}

// ── READ: rate card lookup (source-aware) ──────────────────────────────────
const lookupRateCard: ToolDef = {
  name: "dealdesk_lookup_rate_card",
  description:
    "DealDesk's view of the carrier rate card (cost per MB, per network, source-aware: A1/Telefonica/Tele2/US Cellular). USE for: 'cheapest network for a deal in Germany', 'cost per MB for AT&T LTE-M', 'pricing options for a UK deal'. Returns raw carrier cost; for list-price-only without our cost context use reconciliation_get_pricing instead.",
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
    const q: string[] = [`select=${PRICING_COLS}`, "is_current=eq.true", `limit=${Number(args.limit ?? 50)}`];
    if (args.country) q.push(`country=ilike.*${pgValue(String(args.country))}*`);
    if (args.tadig) q.push(`tadig=eq.${pgValue(String(args.tadig))}`);
    if (args.source) q.push(`carrier_source=eq.${pgValue(String(args.source))}`);
    const rows = await dbSelect<PricingRow>(env, `${PRICING_TABLE}?${q.join("&")}`);
    return {
      count: rows.length,
      pricing_view: "cost",
      rows,
    };
  },
};

// ── READ: realized (cheapest) cost for a TADIG ─────────────────────────────
const getRealizedCost: ToolDef = {
  name: "dealdesk_get_realized_cost",
  description:
    "What we ACTUALLY paid per network over a recent window — realized cost cross-check vs. list pricing. USE for: 'what did we pay for AT&T last 30 days', 'realized vs list cost on DEUD2', 'are we paying the rate-card price'. Cross-check before quoting a customer. For LIST pricing only use dealdesk_lookup_rate_card; for active SIMs / GB consumed (no $) use reconciliation_get_usage_summary.",
  inputSchema: {
    type: "object",
    properties: { tadig: { type: "string", description: "TADIG code to price." } },
    required: ["tadig"],
    additionalProperties: false,
  },
  requiredScope: "read",
  handler: async (args, ctx) => {
    const env = envOf(ctx);
    const rows = await dbSelect<PricingRow>(
      env,
      `${PRICING_TABLE}?tadig=eq.${pgValue(String(args.tadig))}&is_current=eq.true&select=${PRICING_COLS}`,
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
    "Current global deal-evaluation rules (min margin %, min profit per SIM, max risk score, min deal size, platform fee). USE for: 'what's our pricing policy', 'min margin we accept', 'what rules apply when I price a deal'. These rules are inputs to the pricing skill, not the formula itself.",
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
    "Save a priced deal evaluation to deal_evaluations. TWO-STEP: call with mode='preview' to get the row that would be inserted + a confirmation_token; then call again with mode='apply' and the same confirmation_token + identical fields to persist. USE before persisting any pricing — shows the user what will be saved. The row is stamped with the calling user (identity taken from the verified token, not arguments).",
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
