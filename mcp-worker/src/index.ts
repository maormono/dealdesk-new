// DealDesk MCP — Cloudflare Worker, behind the Monogoto MCP gateway.
//
// A per-app MCP is NOT an OAuth server. It verifies the gateway's MGT-JWT
// against the gateway JWKS, gates each tool on claims.apps/scopes, runs it with
// the verified identity, and emits an audit row. All of that is the vendored
// core (src/core/*, from @monogoto/mcp-app-template); this entry just wires env
// → config and the DealDesk tool surface.

import { handleMcpRequest, type AppMcpConfig } from "./core/mcp.ts";
import { buildDealdeskTools, type ToolEnv } from "./tools.ts";

export interface Env extends ToolEnv {
  GATEWAY_JWKS_URL: string; // https://mcp.monogoto.io/.well-known/jwks.json
  GATEWAY_ISSUER: string; // https://mcp.monogoto.io
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CONFIRMATION_SECRET: string;
}

function configFromEnv(env: Env): AppMcpConfig {
  return {
    appId: "dealdesk",
    serverName: "monogoto-dealdesk-mcp",
    serverVersion: "0.1.0",
    instructions:
      "DealDesk pricing tools. Reads are open to anyone with dealdesk access; " +
      "saving an evaluation needs write; changing deal_rules needs admin. " +
      "Writes use preview→confirmation_token→apply: call the preview tool, then " +
      "pass its payload + confirmation_token to the matching apply tool.",
    verify: { jwksUrl: env.GATEWAY_JWKS_URL, issuer: env.GATEWAY_ISSUER },
    audit: { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY },
    tools: buildDealdeskTools(env),
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    return handleMcpRequest(req, configFromEnv(env));
  },
};
