// App + scope gating (§6.3–6.5).
//
// After verifying the MGT-JWT, a per-app MCP must:
//   • reject the call if its app_id is not in claims.apps;
//   • require "write" for any tool that mutates state, "delete" for deletes.
//
// These helpers return a typed allow/deny so tool handlers stay one-liners.

import type { MgtClaims, Scope } from "./claims.ts";

export type GateResult = { allow: true } | { allow: false; reason: string };

/** §6.3 — the only app-level gate. Domain/admin live in the gateway. */
export function checkApp(claims: MgtClaims, appId: string): GateResult {
  if (!claims.apps?.includes(appId)) {
    return { allow: false, reason: `no access to app "${appId}"` };
  }
  return { allow: true };
}

/** §6.5 — require a specific action scope for this app. */
export function checkScope(
  claims: MgtClaims,
  appId: string,
  scope: Scope,
): GateResult {
  const app = checkApp(claims, appId);
  if (!app.allow) return app;
  const granted = claims.scopes?.[appId] ?? [];
  if (!granted.includes(scope)) {
    return {
      allow: false,
      reason: `tool requires "${scope}" scope on "${appId}"; you have [${granted.join(", ") || "none"}]`,
    };
  }
  return { allow: true };
}

/** Admin-only tools (e.g. a prompts namespace). */
export function checkAdmin(claims: MgtClaims): GateResult {
  return claims.is_admin
    ? { allow: true }
    : { allow: false, reason: "admin only" };
}
