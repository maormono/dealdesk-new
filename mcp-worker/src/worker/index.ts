// Cloudflare Worker entry for the DealDesk per-app MCP behind the Monogoto
// MCP gateway. Thin: wires env → AppMcpConfig and hands every request to the
// runtime-agnostic core handler (verify MGT-JWT → gate → run → audit).

import { handleMcpRequest, type AppMcpConfig } from "../core/mcp.ts";
import { dealdeskTools, APP_ID } from "../tools.ts";

export interface Env {
  GATEWAY_JWKS_URL: string;
  GATEWAY_ISSUER: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CONFIRMATION_SECRET: string;
}

function configFromEnv(env: Env): AppMcpConfig {
  return {
    appId: APP_ID,
    serverName: "monogoto-dealdesk-mcp",
    serverVersion: "0.1.0",
    instructions:
      "DealDesk MCP — operator rate-card pricing, realized-cost cross-check, and saving priced deals. " +
      "Tool routing: 'cheapest network / price per MB for a deal' → dealdesk_lookup_rate_card. " +
      "'what did we actually pay' / 'realized cost' → dealdesk_get_realized_cost. " +
      "'raw cost build-up for skill' → dealdesk_get_cost_buildup. " +
      "'what are our pricing rules' → dealdesk_get_deal_rules. " +
      "'save / log a priced deal' → preview/apply_save_evaluation. " +
      "'change pricing policy' → preview/apply_update_deal_rules (admin). " +
      "For active SIMs / GB consumed (no $) use Reconciliation. For list pricing only use Reconciliation.",
    verify: { jwksUrl: env.GATEWAY_JWKS_URL, issuer: env.GATEWAY_ISSUER },
    audit:
      env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
        ? { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY }
        : undefined,
    toolEnv: {
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      CONFIRMATION_SECRET: env.CONFIRMATION_SECRET,
    },
    tools: dealdeskTools,
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    return handleMcpRequest(req, configFromEnv(env));
  },
};
