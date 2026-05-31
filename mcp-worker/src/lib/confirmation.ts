// Stateless preview→apply token for Cloudflare Workers.
//
// CF Workers are multi-isolate and stateless, so the in-process Map used by
// services/vendor-management-mcp/src/lib/confirmation.ts is unreliable here.
// Instead the token is a self-describing signed blob: HMAC-SHA256 over
// (exp, userId, payloadHash) keyed by CONFIRMATION_SECRET. verifyToken
// recomputes the MAC and checks exp + payload binding. The token never
// contains the userId or payload in clear — both are re-supplied at verify
// time from the verified MGT-JWT claims and the apply-call args, so a token
// can't be reused for a different edit or by another user.
//
// Token wire format:  v1.<exp_ms>.<payloadHash>.<sig_hex>

export interface ConfirmationEnv {
  CONFIRMATION_SECRET: string;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function canonicalPayloadHash(payload: unknown): Promise<string> {
  // Stable stringify: sort object keys so {a,b} and {b,a} hash equal.
  const stable = (v: unknown): unknown =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v as object)
            .sort()
            .map((k) => [k, stable((v as Record<string, unknown>)[k])]),
        )
      : v;
  return sha256Hex(JSON.stringify(stable(payload)));
}

export async function issueToken(
  env: ConfirmationEnv,
  userId: string,
  payload: unknown,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<string> {
  const exp = Date.now() + ttlMs;
  const payloadHash = await canonicalPayloadHash(payload);
  const sig = await hmacHex(env.CONFIRMATION_SECRET, `${exp}.${userId}.${payloadHash}`);
  return `v1.${exp}.${payloadHash}.${sig}`;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export async function verifyToken(
  env: ConfirmationEnv,
  token: string,
  userId: string,
  payload: unknown,
): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return { ok: false, reason: "malformed" };
  const [, expStr, payloadHash, sig] = parts;
  const expected = await hmacHex(env.CONFIRMATION_SECRET, `${expStr}.${userId}.${payloadHash}`);
  if (!timingSafeEqual(sig, expected)) return { ok: false, reason: "bad_signature" };
  if (Date.now() > Number(expStr)) return { ok: false, reason: "expired" };
  const actual = await canonicalPayloadHash(payload);
  if (!timingSafeEqual(payloadHash, actual)) return { ok: false, reason: "payload_mismatch" };
  return { ok: true };
}
