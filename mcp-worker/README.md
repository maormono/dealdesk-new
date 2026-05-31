# DealDesk MCP

Per-app MCP behind the [Monogoto MCP gateway](../../monogoto-os/services/mcp-gateway).
Phase-1 pilot. Built from `@monogoto/mcp-app-template` (the `src/core/` files are
vendored from it).

Employees never connect here directly — they connect the gateway, and the
gateway brokers these tools into that one connection for users who have
`dealdesk` access in Monogoto OS.

## Tools

| Tool | Scope | Notes |
|---|---|---|
| `dealdesk_get_deal_rules` | read | Current `deal_rules` JSON. |
| `dealdesk_lookup_rate_card` | read | Source-aware `carrier_pricing` by country, ranked by data/MB; tech filter. |
| `dealdesk_get_realized_cost` | read | Aggregated `daily_network_cost_snapshots` over N days. |
| `dealdesk_get_cost_buildup` | read | Cheapest network(s) per country + cost components. Pure data — no policy. |
| `dealdesk_preview_save_evaluation` / `_apply_` | write | Insert into `deal_evaluations` via preview→token→apply. |
| `dealdesk_preview_update_deal_rules` / `_apply_` | write + admin | Mutate `deal_rules`. `is_admin` required. |

**Scope note (Phase 1):** the gateway only issues `read`/`write` today, derived
from `user_project_permissions.can_view`/`can_edit`. The `deal_rules` mutators
are `requiredScope:"write"` **and** `adminOnly:true` (`claims.is_admin`) until a
real `admin` scope arrives with `app_permissions_matrix` (Phase 3).

**Pricing policy is NOT in this MCP.** The MCP exposes raw data and cost
arithmetic only — `get_cost_buildup` returns the cheapest networks + cost
components with no platform fee, margin, floor, or verdict. The pricing formula
(how those become a price/verdict) lives in the `monogoto-deal-pricing` skill,
which only its creator can edit. `deal_rules` here are stored *parameters*
(data), not the formula. Two-key model: an employee needs DealDesk data access
(granted by the OS admin → these tools) **and** the skill (the method) to price
a deal; neither alone is enough.

## Layout

```
src/
  core/         vendored from @monogoto/mcp-app-template (verify, scopes, audit, mcp)
  lib/
    supabase.ts service-role PostgREST client
    confirmation.ts  stateless HMAC preview→apply tokens (Worker-safe)
  tools.ts      the DealDesk tool surface (handlers close over env)
  index.ts      Worker entry: env → AppMcpConfig
```

## Setup

```bash
npm install
npm run typecheck

# Secrets:
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # GRANTs scoped to DealDesk tables
npx wrangler secret put CONFIRMATION_SECRET         # random 32-byte hex

npx wrangler deploy
```

After deploy, set `DEALDESK_MCP_URL` on the gateway to this Worker's URL
(the `dealdesk` route already exists in the gateway's `routing.ts`). Then a user
with DealDesk access calls `gateway_ping_app dealdesk` or just lists tools — the
`dealdesk_*` tools appear in their single Monogoto connection.

## Data tables (shared OS Supabase, project `uddmjjgnexdazfedrytt`)

`deal_rules`, `deal_evaluations`, `carrier_pricing`, `daily_network_cost_snapshots`.
The service-role key's GRANTs should be limited to these (+ `network_pricing`),
per [`../MCP_ADOPTION.md`](../MCP_ADOPTION.md) §3.3.
