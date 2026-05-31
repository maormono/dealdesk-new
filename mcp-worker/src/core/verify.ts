// MGT-JWT verification — the heart of the per-app MCP contract (§6.1–6.2).
//
// Every per-app MCP verifies the Bearer token against the gateway's JWKS and
// NEVER re-queries Supabase auth or Google. The gateway is the only identity
// authority. We verify signature, issuer, and expiry; the caller then gates on
// claims.apps / claims.scopes (see scopes.ts).
//
// Runtime-agnostic: imports the bare `jose` specifier (resolved from
// node_modules on Cloudflare Workers, and via the import map in deno.json on
// Supabase Edge Functions). Uses only Web-standard globals (fetch, crypto).

import {
  jwtVerify,
  createRemoteJWKSet,
  createLocalJWKSet,
  type JWTVerifyGetKey,
  type JSONWebKeySet,
} from "jose";
import type { MgtClaims } from "./claims.ts";

// One JWKS set per (jwksUrl) process, cached by jose with the `kid` from the
// token header. Apps that import this module keep the cache warm across calls.
const jwksCache = new Map<string, JWTVerifyGetKey>();

function keySetFor(config: VerifyConfig): JWTVerifyGetKey {
  // A static key set (config.jwks) bypasses the network — used when keys are
  // pinned, and by tests that inject a local public key. Otherwise fetch + cache
  // the gateway's remote JWKS.
  if (config.jwks) return createLocalJWKSet(config.jwks);
  let set = jwksCache.get(config.jwksUrl);
  if (!set) {
    set = createRemoteJWKSet(new URL(config.jwksUrl));
    jwksCache.set(config.jwksUrl, set);
  }
  return set;
}

export interface VerifyConfig {
  /** Gateway JWKS, e.g. https://mcp.monogoto.io/.well-known/jwks.json */
  jwksUrl: string;
  /** Expected issuer, e.g. https://mcp.monogoto.io */
  issuer: string;
  /** Optional static JWKS — pins keys / injected by tests. Skips the network. */
  jwks?: JSONWebKeySet;
}

export type VerifyResult =
  | { ok: true; claims: MgtClaims }
  | { ok: false; reason: string };

/** Pull the Bearer token out of an Authorization header value. */
export function bearerFrom(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return m ? m[1] : null;
}

/** Verify an MGT-JWT. Returns typed claims or a reason for the 401. */
export async function verifyMgtJwt(
  token: string,
  config: VerifyConfig,
): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, keySetFor(config), {
      issuer: config.issuer,
      algorithms: ["RS256"],
    });
    // jose already enforced exp/iss/signature. Surface as typed claims.
    return { ok: true, claims: payload as unknown as MgtClaims };
  } catch (err) {
    return { ok: false, reason: `invalid_token: ${String((err as Error)?.message ?? err)}` };
  }
}
