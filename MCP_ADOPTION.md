# MCP Adoption — DealDesk

**Companion to:** [`monogoto-os/MCP_PLATFORM_REQUIREMENTS.md`](../monogoto-os/MCP_PLATFORM_REQUIREMENTS.md)
**Index:** [`monogoto-os/MCP_ADOPTION_INDEX.md`](../monogoto-os/MCP_ADOPTION_INDEX.md)
**App ID (registry):** `dealdesk`
**Phase:** **1 (Pilot — green-field build)**
**Status:** Highest-priority — the deal-pricing Cowork skill is waiting on this MCP.

Read the cross-app rules in the index first; this guide only covers what is specific to DealDesk.

## 1. What this app contributes

DealDesk owns operator pricing analysis and deal evaluation. The data the MCP exposes:

- **Deal rules** (`public.deal_rules`, single-row JSONB of margin / per-SIM / per-MB thresholds). Owned exclusively by DealDesk; admin-update-only via RLS.
- **Rate-card lookups** against the shared OS Supabase carrier tables (`carrier_pricing`, `network_pricing`, `daily_network_cost_snapshots`). Reconciliation owns ingest; DealDesk owns the evaluation-shaped reads.
- **Deal evaluations** (`public.deal_evaluations`), the log of every priced deal — currently being populated by the executive deal-pricing skill.

This is the MCP the executive deal-pricing skill will migrate onto. Until it exists, the skill talks to raw Supabase using shared service credentials, which is the exact pattern the platform requirements doc is replacing.

## 2. Current state

No MCP today. The deal-pricing skill (`monogoto-deal-pricing`) currently runs SQL through whichever Supabase MCP the user has connected, and writes to HubSpot through the HubSpot MCP. There is no DealDesk-owned auth, no tool surface, no audit beyond what Supabase logs.

## 3. What changes for gateway adoption

1. **Create a new Cloudflare Worker MCP** at `dealdesk-new/mcp-worker/`. Clone the structure of `monogoto-os/apps/onboarding/mcp-worker/` once Phase 0 has extracted the gateway. The worker:
   - Verifies `Authorization: Bearer <MGT-JWT>` against the gateway JWKS.
   - Rejects the request if `claims.apps` does not include `"dealdesk"`.
   - For each tool, checks the required scope against `claims.scopes.dealdesk`.
   - Writes one row to `public.mcp_audit_log` before forwarding to the data layer.
2. **Wrap each existing SQL query that the pricing skill uses** as a typed tool handler in the Worker. The SQL is already known good — see `monogoto-deal-pricing/references/data-sources.md` in the skill. Move that SQL into the Worker so the skill stops needing direct Supabase access.
3. **Add a Supabase service-role client** scoped to read `carrier_pricing`, `network_pricing`, `daily_network_cost_snapshots`, `deal_rules`, `deal_evaluations` only. Configure the role's GRANTs explicitly; do not reuse a broad service key.
4. **Adopt preview/apply for writes** (`dealdesk_save_evaluation`, `dealdesk_update_deal_rules`). Copy `services/vendor-management-mcp/src/lib/confirmation.ts` into the Worker as `lib/confirmation.ts`.
5. **Register `dealdesk` as a routable app in the gateway** — add a route map entry pointing `dealdesk_*` tools at the Worker URL.
6. **Update the deal-pricing skill** (`outputs/monogoto-deal-pricing/SKILL.md` and references) to call `dealdesk_*` tools instead of writing raw SQL. The skill stops asking the user to have a Supabase MCP connected.
7. **Migrate the existing reads in the skill onto the new tools** in this order: `dealdesk_get_deal_rules` (lowest risk) → `dealdesk_lookup_rate_card` (cost-first source-aware path) → `dealdesk_get_realized_cost` → `dealdesk_save_evaluation` (preview/apply, last because it writes).

## 4. Tool surface (initial)

All tools are JSON-RPC over Streamable HTTP. Parameters are TypeScript types in `dealdesk-new/mcp-worker/src/tools/`.

| Tool | Verb | Scope | Purpose |
|---|---|---|---|
| `dealdesk_get_deal_rules` | read | `read` | Return the current `deal_rules` JSON (margin %, per-SIM, per-MB, platform fee, unused-allowance, max risk, min deal size). |
| `dealdesk_lookup_rate_card` | read | `read` | Source-aware rate card for a country (one row per `carrier_source × network`). Filter by tech (LTE / LTE-M / NB-IoT). Ranks by total cost per SIM at the deal's usage. |
| `dealdesk_get_realized_cost` | read | `read` | Realized cost from `daily_network_cost_snapshots` over the last N days, per country/network/TADIG. Used as a cross-check flag. |
| `dealdesk_evaluate_deal` | read | `read` | Score a proposed deal against current rules; returns cost build-up, floor price, recommended price, verdict, risk score. No persistence. |
| `dealdesk_preview_save_evaluation` | write | `write` | Build the `deal_evaluations` insert payload, return it + a signed confirmation token. No DB write. |
| `dealdesk_apply_save_evaluation` | write | `write` | Consume a confirmation token from preview and insert into `deal_evaluations`. Returns the new row id. |
| `dealdesk_preview_update_deal_rules` | write | `admin` | Build the rule-set diff vs current, return diff + signed token. Admin only. |
| `dealdesk_apply_update_deal_rules` | write | `admin` | Apply the diff. Admin only. |

## 5. Scopes & permissions

- `read` — everyone with `dealdesk` in `claims.apps`. Covers all read tools and `evaluate_deal`.
- `write` — sales reps who are allowed to log priced deals. Covers `preview_save_evaluation` / `apply_save_evaluation`.
- `admin` — pricing owners only. Covers the `deal_rules` mutation tools. The Worker also requires `claims.is_admin === true` as a belt-and-braces check on rule updates.

Phase 1 hard-codes `read + write` for every user with app access (per platform doc §10). Phase 3 reads action scopes from `app_permissions_matrix` when that's activated.

## 6. Tokens to sunset

None for DealDesk (it had no legacy auth). On the *skill* side, the pricing skill stops needing a personal Supabase token once Stage 1 of this migration ships — so the team can drop "everyone needs Supabase access" from the deployment plan.

## 7. Code pointers

- New: `dealdesk-new/mcp-worker/` — Worker source, `wrangler.toml`, `src/index.ts`, `src/tools/*.ts`, `src/lib/{auth.ts,audit.ts,confirmation.ts,supabase.ts}`.
- Existing data:
  - `dealdesk-new/supabase/migrations/create_deal_rules_table.sql` — `deal_rules` schema + RLS.
  - Shared OS Supabase project `uddmjjgnexdazfedrytt` — `carrier_pricing`, `network_pricing`, `daily_network_cost_snapshots`, `deal_evaluations`.
- Existing skill (to migrate):
  - `outputs/monogoto-deal-pricing/SKILL.md`
  - `outputs/monogoto-deal-pricing/references/data-sources.md` — exact SQL the Worker tools should wrap.
  - `outputs/monogoto-deal-pricing/references/output-templates.md` — Stage 3/4 mapping that becomes the `save_evaluation` payload shape.
- Reference Worker to copy: `monogoto-os/apps/onboarding/mcp-worker/` (post Phase-0 split).
- Preview/apply pattern to copy: `monogoto-os/services/vendor-management-mcp/src/lib/confirmation.ts`.

## 8. Open questions

1. **Carrier rate-card ownership vs Reconciliation.** Both apps consume the same root tables. Confirm before pilot: reconciliation owns ingest + the normalized view; DealDesk's MCP only reads. No `lookup_rate_card` tool in the Reconciliation MCP.
2. **HubSpot write-back.** Today the skill writes pricing fields to a deal via the HubSpot MCP. Keep that as a separate user-side MCP, or move it into DealDesk MCP behind a `dealdesk_apply_to_hubspot` tool? Recommendation: keep HubSpot as a separate MCP (it's already per-user OAuth'd), but have DealDesk return a ready-to-apply payload so the skill doesn't compose field maps.
3. **Multi-network split math.** The blended cost calculation currently runs in the skill. Move into `dealdesk_evaluate_deal` so the math is centrally owned, or keep skill-side for transparency? Recommendation: move into the tool; expose the breakdown in the response.
4. **Where does the `PER_MB_USAGE_CAP` (100 MB) live?** Today it's a constant in the skill. Migrate into `deal_rules` so it's editable without redeploying the skill or the Worker.
