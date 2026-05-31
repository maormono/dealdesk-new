// Supabase Edge Function (Deno) entry for the DealDesk MCP.
//
// Identical core + tools as the Cloudflare Worker entry (src/index.ts) — this
// just deploys to Supabase instead, which removes the Cloudflare dependency for
// the DATA plane. Only the gateway then needs Cloudflare.
//
// Why this variant is nice:
//   • Supabase auto-injects SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, so the
//     authenticated-only tools (get_deal_rules, get_realized_cost,
//     save_evaluation) work with zero manual secret handling.
//   • No new infra to provision — you (Supabase admin) own it end to end.
//
// The `jose` import inside ./core resolves via deno.json's import map (→ esm.sh).
//
// Deploy:  supabase functions deploy dealdesk-mcp --no-verify-jwt
//   (--no-verify-jwt because WE verify the gateway's MGT-JWT, not Supabase's JWT.)
// Set once the gateway URL is known (if not mcp.monogoto.io):
//   supabase secrets set GATEWAY_JWKS_URL=<url>/.well-known/jwks.json GATEWAY_ISSUER=<url>
//   supabase secrets set CONFIRMATION_SECRET=<random hex>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleMcpRequest, type AppMcpConfig } from "./core/mcp.ts";
import { buildDealdeskTools } from "./tools.ts";

function config(): AppMcpConfig {
  const env = {
    SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    CONFIRMATION_SECRET: Deno.env.get("CONFIRMATION_SECRET") ?? "dealdesk-dev-confirmation-secret",
  };
  return {
    appId: "dealdesk",
    serverName: "monogoto-dealdesk-mcp",
    serverVersion: "0.1.0",
    instructions:
      "DealDesk pricing data tools. Reads are open to anyone with dealdesk access; " +
      "saving an evaluation needs write; changing deal_rules needs admin. Writes use " +
      "preview→confirmation_token→apply. Pricing policy lives in the deal-pricing skill, not here.",
    verify: {
      jwksUrl: Deno.env.get("GATEWAY_JWKS_URL") ?? "https://mcp.monogoto.io/.well-known/jwks.json",
      issuer: Deno.env.get("GATEWAY_ISSUER") ?? "https://mcp.monogoto.io",
    },
    audit: { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY },
    tools: buildDealdeskTools(env),
  };
}

serve((req) => handleMcpRequest(req, config()));
