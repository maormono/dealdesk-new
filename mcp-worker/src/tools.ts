// DealDesk MCP tool surface. See dealdesk-new/MCP_ADOPTION.md §4.
//
// Scopes (Phase 1, per platform §10): the gateway issues read/write only.
//   read  → get_deal_rules, lookup_rate_card, get_realized_cost, evaluate_deal
//   write → preview/apply_save_evaluation
//   admin → preview/apply_update_deal_rules  (no "admin" scope yet, so these
//           are requiredScope:"write" AND adminOnly:true → claims.is_admin)
//
// Identity comes from the verified MGT-JWT (ctx.userId / ctx.email), never tool
// args. DB access is service-role via PostgREST (lib/supabase), tables scoped
// by GRANT to the DealDesk set.

import type { ToolDef, ToolContext } from "./core/mcp.ts";
import { sbSelect, sbInsert, sbUpdate, type DbEnv } from "./lib/supabase.ts";
import { issueToken, consumeToken } from "./lib/confirmation.ts";

export type ToolEnv = DbEnv & { CONFIRMATION_SECRET: string };

// Pricing POLICY (platform fee, price floor, margin, verdict) deliberately
// does NOT live here — it belongs to the monogoto-deal-pricing skill. The MCP
// exposes raw data + cost arithmetic only. `deal_rules` below are stored
// PARAMETERS (data), not the formula.

const DEFAULT_RULES = {
  minProfitPerActiveSim: 10,
  minProfitPerMegabyte: 0.01,
  minDataProfitMargin: 10,
  packageUnusedAllowance: 30,
  minDealSize: 100,
  maxRiskScore: 7,
};

interface CarrierRow {
  carrier_source: string;
  network_name: string;
  tadig: string;
  country: string;
  data_per_mb: number;
  imsi_access: number | null;
  sms_mo: number | null;
  lte: boolean;
  lte_m: boolean;
  nb_iot: boolean;
}

const TECH_COLUMN: Record<string, keyof CarrierRow> = {
  lte: "lte",
  "lte-m": "lte_m",
  nb_iot: "nb_iot",
};

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

async function getRules(env: ToolEnv): Promise<Record<string, number>> {
  const rows = await sbSelect<{ rules: Record<string, number> }>(env, "deal_rules", "select=rules&id=eq.1");
  return rows[0]?.rules ?? DEFAULT_RULES;
}

async function cheapestForCountry(
  env: ToolEnv,
  country: string,
  tech: string | undefined,
  limit: number,
): Promise<CarrierRow[]> {
  let q =
    "select=carrier_source,network_name,tadig,country,data_per_mb,imsi_access,sms_mo,lte,lte_m,nb_iot" +
    "&is_current=eq.true" +
    `&country=ilike.*${encodeURIComponent(country)}*` +
    "&data_per_mb=not.is.null" +
    "&order=data_per_mb.asc" +
    `&limit=${limit}`;
  const col = tech ? TECH_COLUMN[tech] : undefined;
  if (col) q += `&${col}=eq.true`;
  return sbSelect<CarrierRow>(env, "carrier_pricing", q);
}

export function buildDealdeskTools(env: ToolEnv): ToolDef[] {
  return [
    // ── reads ────────────────────────────────────────────────────────────
    {
      name: "dealdesk_get_deal_rules",
      description:
        "Return the current global deal-evaluation rules (margin %, per-SIM and per-MB profit floors, unused-allowance, max risk, min deal size).",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      requiredScope: "read",
      handler: async () => ({ rules: await getRules(env) }),
    },
    {
      name: "dealdesk_lookup_rate_card",
      description:
        "Source-aware carrier rate card for a country (one row per carrier_source × network), ranked by data cost per MB ascending. Optionally filter by radio tech.",
      inputSchema: {
        type: "object",
        properties: {
          country: { type: "string", description: "Country name or substring, e.g. 'Germany'." },
          tech: { type: "string", enum: ["lte", "lte-m", "nb_iot"], description: "Restrict to networks supporting this tech." },
          limit: { type: "number", description: "Max rows (default 25, max 200)." },
        },
        required: ["country"],
        additionalProperties: false,
      },
      requiredScope: "read",
      handler: async (args) => {
        const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 200);
        const rows = await cheapestForCountry(env, String(args.country), args.tech as string | undefined, limit);
        return { country: args.country, tech: args.tech ?? "any", count: rows.length, rows };
      },
    },
    {
      name: "dealdesk_get_realized_cost",
      description:
        "Realized network cost from daily_network_cost_snapshots over the last N days, aggregated per network/TADIG. Cross-check against rate-card list prices.",
      inputSchema: {
        type: "object",
        properties: {
          country: { type: "string", description: "Country name or substring." },
          tadig: { type: "string", description: "Exact TADIG to filter to." },
          days: { type: "number", description: "Look-back window in days (default 30, max 90)." },
        },
        additionalProperties: false,
      },
      requiredScope: "read",
      handler: async (args) => {
        const days = Math.min(Math.max(Number(args.days) || 30, 1), 90);
        const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
        let q =
          "select=tadig,network_name,mno_name,country,active_sims,gb_consumed,data_per_mb,total_cost_day,snapshot_date" +
          `&snapshot_date=gte.${since}&order=snapshot_date.desc&limit=2000`;
        if (args.country) q += `&country=ilike.*${encodeURIComponent(String(args.country))}*`;
        if (args.tadig) q += `&tadig=eq.${encodeURIComponent(String(args.tadig))}`;
        const rows = await sbSelect<{
          tadig: string; network_name: string; mno_name: string; country: string;
          gb_consumed: number; total_cost_day: number; data_per_mb: number;
        }>(env, "daily_network_cost_snapshots", q);

        const byTadig = new Map<string, { tadig: string; network_name: string; country: string; gb: number; cost: number; days: Set<string>; sumDataPerMb: number; n: number }>();
        for (const r of rows as Array<typeof rows[number] & { snapshot_date: string }>) {
          const k = r.tadig ?? r.network_name;
          const agg = byTadig.get(k) ?? { tadig: r.tadig, network_name: r.network_name, country: r.country, gb: 0, cost: 0, days: new Set<string>(), sumDataPerMb: 0, n: 0 };
          agg.gb += Number(r.gb_consumed) || 0;
          agg.cost += Number(r.total_cost_day) || 0;
          if (r.data_per_mb != null) { agg.sumDataPerMb += Number(r.data_per_mb); agg.n += 1; }
          agg.days.add(r.snapshot_date);
          byTadig.set(k, agg);
        }
        const summary = [...byTadig.values()].map((a) => ({
          tadig: a.tadig, network_name: a.network_name, country: a.country,
          days_observed: a.days.size, total_gb: +a.gb.toFixed(3), total_cost_usd: +a.cost.toFixed(2),
          realized_cost_per_mb: a.gb > 0 ? +(a.cost / (a.gb * 1000)).toFixed(6) : null,
          avg_list_data_per_mb: a.n > 0 ? +(a.sumDataPerMb / a.n).toFixed(6) : null,
        }));
        return { window_days: days, since, networks: summary.length, summary };
      },
    },
    {
      name: "dealdesk_get_cost_buildup",
      description:
        "Raw cost build-up per country: the cheapest viable network(s) from the rate card and their cost components (data cost per SIM at the given MB, IMSI/SIM access, SMS unit cost). PURE DATA — no platform fee, margin, floor, or verdict. The pricing formula (how these become a price/verdict) lives in the monogoto-deal-pricing skill, not here.",
      inputSchema: {
        type: "object",
        properties: {
          countries: { type: "array", items: { type: "string" } },
          monthly_data_per_sim_mb: { type: "number", description: "Expected MB per SIM per month, used only to multiply data_per_mb into a monthly data cost." },
          tech: { type: "string", enum: ["lte", "lte-m", "nb_iot"] },
          candidates_per_country: { type: "number", description: "How many cheapest networks to return per country (default 3, max 10)." },
        },
        required: ["countries", "monthly_data_per_sim_mb"],
        additionalProperties: false,
      },
      requiredScope: "read",
      handler: async (args) => {
        const mb = Number(args.monthly_data_per_sim_mb);
        const n = Math.min(Math.max(Number(args.candidates_per_country) || 3, 1), 10);
        const countries = (args.countries as string[]) ?? [];
        const per_country: Array<Record<string, unknown>> = [];
        for (const country of countries) {
          const rows = await cheapestForCountry(env, country, args.tech as string | undefined, n);
          per_country.push({
            country,
            found: rows.length > 0,
            candidates: rows.map((r) => ({
              carrier_source: r.carrier_source,
              network_name: r.network_name,
              tadig: r.tadig,
              data_per_mb: r.data_per_mb,
              imsi_access: Number(r.imsi_access) || 0,
              sms_mo: r.sms_mo,
              monthly_data_cost_per_sim: +(mb * Number(r.data_per_mb)).toFixed(6),
            })),
          });
        }
        return { monthly_data_per_sim_mb: mb, tech: args.tech ?? "any", per_country };
      },
    },

    // ── writes (preview/apply) ─────────────────────────────────────────────
    {
      name: "dealdesk_preview_save_evaluation",
      description:
        "Build the deal_evaluations insert payload for the current user and return it with a signed confirmation token. Does NOT write. Call dealdesk_apply_save_evaluation with the token + payload to commit.",
      inputSchema: {
        type: "object",
        properties: {
          deal_name: { type: "string" },
          sim_quantity: { type: "number" },
          countries: { type: "array", items: { type: "string" } },
          monthly_data_per_sim: { type: "number" },
          proposed_price_per_sim: { type: "number" },
          currency: { type: "string", description: "Default USD." },
          duration_months: { type: "number" },
          verdict: { type: "string" },
          profit_margin: { type: "number" },
          risk_score: { type: "number" },
          total_contract_value: { type: "number" },
          deal_request: { type: "object", description: "Raw request blob to store in deal_request jsonb." },
        },
        required: ["deal_name", "sim_quantity", "countries"],
        additionalProperties: true,
      },
      requiredScope: "write",
      handler: async (args, ctx: ToolContext) => {
        const payload = {
          user_id: ctx.userId,
          user_email: ctx.email,
          deal_name: args.deal_name,
          status: "evaluated",
          sim_quantity: args.sim_quantity ?? null,
          countries: args.countries ?? [],
          monthly_data_per_sim: args.monthly_data_per_sim ?? null,
          proposed_price_per_sim: args.proposed_price_per_sim ?? null,
          currency: args.currency ?? "USD",
          duration_months: args.duration_months ?? null,
          verdict: args.verdict ?? null,
          profit_margin: args.profit_margin ?? null,
          risk_score: args.risk_score ?? null,
          total_contract_value: args.total_contract_value ?? null,
          deal_request: args.deal_request ?? null,
        };
        const confirmation_token = await issueToken(env.CONFIRMATION_SECRET, ctx.userId, payload, nowSeconds());
        return { preview: payload, confirmation_token, expires_in_seconds: 300 };
      },
    },
    {
      name: "dealdesk_apply_save_evaluation",
      description:
        "Commit a previewed deal evaluation. Pass back the exact payload and confirmation_token from dealdesk_preview_save_evaluation. Returns the new row id.",
      inputSchema: {
        type: "object",
        properties: {
          confirmation_token: { type: "string" },
          payload: { type: "object" },
        },
        required: ["confirmation_token", "payload"],
        additionalProperties: false,
      },
      requiredScope: "write",
      handler: async (args, ctx: ToolContext) => {
        const payload = (args.payload ?? {}) as Record<string, unknown>;
        const check = await consumeToken(env.CONFIRMATION_SECRET, String(args.confirmation_token), ctx.userId, payload, nowSeconds());
        if (!check.ok) throw new Error(`confirmation failed: ${check.reason}`);
        // Re-stamp identity from claims — never trust the echoed user fields.
        payload.user_id = ctx.userId;
        payload.user_email = ctx.email;
        const row = await sbInsert<{ id: string }>(env, "deal_evaluations", payload);
        return { saved: true, id: row.id };
      },
    },

    // ── deal_rules mutation (admin) ────────────────────────────────────────
    {
      name: "dealdesk_preview_update_deal_rules",
      description:
        "Admin only. Merge a partial rules patch over the current deal_rules and return the proposed result + a diff + a signed confirmation token. Does NOT write.",
      inputSchema: {
        type: "object",
        properties: { rules: { type: "object", description: "Partial rules to merge over current." } },
        required: ["rules"],
        additionalProperties: false,
      },
      requiredScope: "write",
      adminOnly: true,
      handler: async (args, ctx: ToolContext) => {
        const current = await getRules(env);
        const proposed = { ...current, ...(args.rules as Record<string, number>) };
        const diff: Record<string, { from: unknown; to: unknown }> = {};
        for (const k of Object.keys(proposed)) {
          if (current[k] !== proposed[k]) diff[k] = { from: current[k] ?? null, to: proposed[k] };
        }
        const confirmation_token = await issueToken(env.CONFIRMATION_SECRET, ctx.userId, proposed, nowSeconds());
        return { current, proposed, diff, confirmation_token, expires_in_seconds: 300 };
      },
    },
    {
      name: "dealdesk_apply_update_deal_rules",
      description:
        "Admin only. Apply a previewed rules change. Pass back the exact proposed rules object and confirmation_token from the preview.",
      inputSchema: {
        type: "object",
        properties: { confirmation_token: { type: "string" }, rules: { type: "object" } },
        required: ["confirmation_token", "rules"],
        additionalProperties: false,
      },
      requiredScope: "write",
      adminOnly: true,
      handler: async (args, ctx: ToolContext) => {
        const proposed = (args.rules ?? {}) as Record<string, number>;
        const check = await consumeToken(env.CONFIRMATION_SECRET, String(args.confirmation_token), ctx.userId, proposed, nowSeconds());
        if (!check.ok) throw new Error(`confirmation failed: ${check.reason}`);
        const updated = await sbUpdate<{ rules: Record<string, number> }>(
          env, "deal_rules", "id=eq.1",
          { rules: proposed, updated_by: ctx.userId, updated_at: new Date().toISOString() },
        );
        return { updated: true, rules: updated[0]?.rules ?? proposed };
      },
    },
  ];
}
