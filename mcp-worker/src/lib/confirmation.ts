// Preview → confirmation_token → apply, Worker-safe.
//
// The canonical reference (vendor-management-mcp/src/lib/confirmation.ts) keeps
// tokens in an in-process Map. A Cloudflare Worker has no stable in-process
// store across instances, so we use a STATELESS signed token instead: an
// HMAC-SHA256 over { sub, payload_hash, exp }. The apply call echoes back the
// exact payload; we recompute the hash and verify the signature, so a token
// can't be reused for a different edit or by a different user, and it expires.
//
// Tradeoff vs the in-memory version: not single-use (a token is replayable
// until exp). For the DealDesk pilot — short 5-min TTL, payload+user binding —
// that is acceptable. If strict single-use is required later, back it with the
// gateway KV (see vendor-management MCP_ADOPTION §3.4).

const TTL_SECONDS = 5 * 60;
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlJson(obj: unknown): string {
  return b64url(enc.encode(JSON.stringify(obj)));
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return b64url(new Uint8Array(sig));
}
async function sha256(msg: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(msg));
  return b64url(new Uint8Array(d));
}

export async function issueToken(
  secret: string,
  sub: string,
  payload: unknown,
  nowSeconds: number,
): Promise<string> {
  const body = { sub, ph: await sha256(JSON.stringify(payload)), exp: nowSeconds + TTL_SECONDS };
  const head = b64urlJson(body);
  const sig = await hmac(secret, head);
  return `${head}.${sig}`;
}

export async function consumeToken(
  secret: string,
  token: string,
  sub: string,
  payload: unknown,
  nowSeconds: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [head, sig] = token.split(".");
  if (!head || !sig) return { ok: false, reason: "malformed_token" };
  if ((await hmac(secret, head)) !== sig) return { ok: false, reason: "bad_signature" };
  let body: { sub: string; ph: string; exp: number };
  try {
    body = JSON.parse(atob(head.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return { ok: false, reason: "malformed_token" };
  }
  if (body.exp < nowSeconds) return { ok: false, reason: "token_expired" };
  if (body.sub !== sub) return { ok: false, reason: "token_user_mismatch" };
  if (body.ph !== (await sha256(JSON.stringify(payload)))) {
    return { ok: false, reason: "token_payload_mismatch" };
  }
  return { ok: true };
}
