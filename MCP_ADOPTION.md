# DealDesk — MCP Adoption Guide

**App ID:** `dealdesk` · **Phase:** 1 (Pilot #1) · **Status:** built (`mcp-worker/`)
**Platform docs:** [`monogotoos/MCP_PLATFORM_REQUIREMENTS.md`](../monogotoos/MCP_PLATFORM_REQUIREMENTS.md) (§5.5 RBAC, §6 contract, §7 DealDesk), [`MCP_ADOPTION_INDEX.md`](../monogotoos/MCP_ADOPTION_INDEX.md) (cross-app rules).

## 1. What this app contributes

Carrier deal-pricing data: rate cards (per network/source), realized network cost, global deal-evaluation rules, and saved deal evaluations. Powers the executive deal-pricing Cowork skill. Data lives in the shared OS Supabase project `uddmjjgnexdazfedrytt`.

## 2. Current state

No MCP previously. The DealDesk web app (`backend/src/routes/pricingRoutes.ts`) reads the same tables over Supabase. This worker is the first MCP surface; it replaces the "every employee gets a Supabase user" plan.

## 3. What changes for gateway adoption

New Cloudflare Worker at [`mcp-worker/`](./mcp-worker/), built from `@monogoto/mcp-app-template`. It verifies the gateway MGT-JWT (no Google/OAuth/KV/signing key of its own), gates on `claims.apps["dealdesk"]`, enforces DealDesk visibility scopes, and emits `mcp_audit_log`. Register its deployed URL in the gateway's `DEALDESK_MCP_URL` var (route already in `services/mcp-gateway/src/routing.ts`).

## 4. Tool surface (initial)

| Tool | Verb | Coarse scope | Purpose |
|---|---|---|---|
| `dealdesk_lookup_rate_card` | read | `read` | Per-source rate-card lookup by country/TADIG/source. Cost-masked. |
| `dealdesk_get_realized_cost` | read | `read` + `view_costs_revenue` | Cheapest source (realized cost) for a TADIG. Cost-visibility only. |
| `dealdesk_get_deal_rules` | read | `read` | Global profit-threshold / risk rules (non-confidential). |
| `dealdesk_save_evaluation` | write | `write` | Save a deal evaluation (preview→apply, HMAC `confirmation_token`). |

## 5. Scopes & permissions (RBAC catalog)

Named data-visibility scopes (cross-app rule #8), carried in `claims.scopes.dealdesk`:

| Scope | Axis | Reveals | Granted (pilot derivation) |
|---|---|---|---|
| `view_sell_price` | field | marked-up sell price only | every user with dealdesk access (baseline / least-privilege) |
| `view_costs_revenue` | field | raw `data_per_mb`, `imsi_access_fee`, margins | `user_profiles.role='admin'` OR `can_see_costs=true` |
| `view_all_evaluations` | entity | all users' saved evals (else own `user_id`) | `role='admin'` (latent until a list-evaluations tool ships) |

**Default view** (app access, no extra scopes): rate cards as **sell price** (cost × `(1 + markup_percentage/100)`); raw cost fields **removed**. `dealdesk_get_realized_cost` is **denied**. **Masked fields:** `data_per_mb`, `imsi_access_fee` (and any margin/revenue).

**Pilot derivation:** `app_permissions_matrix` isn't populated yet, so the worker derives scopes locally from `user_profiles` (`role`/`can_see_costs`) keyed by `claims.sub` ([`mcp-worker/src/lib/dealdesk-rbac.ts`](./mcp-worker/src/lib/dealdesk-rbac.ts)). **Graduation (§5.5):** when `whoami` emits `claims.scopes.dealdesk` from `app_permissions_matrix.metadata`, swap `resolveScopes` to read the claim — enforcement unchanged.

## 6. Tokens to sunset

None — greenfield. No legacy bearer/API key to remove in Phase 4.

## 7. Code pointers

- Worker: [`mcp-worker/src/tools.ts`](./mcp-worker/src/tools.ts), `src/lib/{supabase,confirmation,dealdesk-rbac}.ts`, `src/worker/index.ts`
- Vendored contract core: `mcp-worker/src/core/` (from `monogotoos/packages/mcp-app-template`)
- Schema: `create-deal-evaluations-table.sql`, `supabase/migrations/create_deal_rules_table.sql`, `supabase-schema-fixed.sql` (networks/pricing), `implement-user-roles.sql` (role/markup/can_see_costs)
- Tests: `mcp-worker/test/` (29 tests — token, REST, RBAC masking, tools, e2e contract)

## 8. Open questions

1. **Write tool shape** — one `save_evaluation` with `mode` (current) vs the rule-#6 two-tool `preview_/apply_` split.
2. **`get_realized_cost`** for non-cost users — **deny** (current) vs masked sell-price.
3. **Single-use confirmation** — stateless HMAC token is best-effort single-use; add KV/DO nonce store if strict single-use is required.
4. **Two intentional template-core enhancements** (fold back upstream into `mcp-app-template`): `toolEnv`/`ctx.env` (tool DB access) and `VerifyConfig.jwks` (static key set for pinning/tests).
