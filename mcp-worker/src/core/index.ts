// @monogoto/mcp-app-template — runtime-agnostic core.
//
// The auth/scope/audit primitives every per-app MCP needs, written against Web
// standards so the same code runs on Cloudflare Workers and Supabase Edge
// Functions (Deno). Pick an entry under ../worker or ../edge-function.

export type { MgtClaims, Scope } from "./claims.ts";
export { verifyMgtJwt, bearerFrom, type VerifyConfig, type VerifyResult } from "./verify.ts";
export { checkApp, checkScope, checkAdmin, type GateResult } from "./scopes.ts";
export { emitAudit, sha256Hex, type AppAuditEnv, type AppAuditRecord } from "./audit.ts";
export {
  handleMcpRequest,
  type AppMcpConfig,
  type ToolDef,
  type ToolContext,
} from "./mcp.ts";
