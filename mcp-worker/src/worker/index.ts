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
      "DealDesk pricing tools. Reads need 'read'; dealdesk_save_evaluation needs 'write' " +
      "and uses a preview→apply confirmation step. Raw carrier cost is shown only to users " +
      "with cost visibility; others see a marked-up sell price. Saved evaluations are " +
      "attributed to your verified identity.",
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
