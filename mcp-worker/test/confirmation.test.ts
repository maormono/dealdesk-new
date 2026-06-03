import { describe, it, expect } from "vitest";
import { issueToken, verifyToken } from "../src/lib/confirmation.ts";

const env = { CONFIRMATION_SECRET: "0".repeat(64) };
const user = "user-123";
const payload = { table: "deal_evaluations", sim_quantity: 500, countries: ["US"] };

describe("confirmation token", () => {
  it("round-trips a valid token", async () => {
    const tok = await issueToken(env, user, payload);
    const r = await verifyToken(env, tok, user, payload);
    expect(r.ok).toBe(true);
  });

  it("is order-insensitive on payload keys", async () => {
    const tok = await issueToken(env, user, { a: 1, b: 2 });
    const r = await verifyToken(env, tok, user, { b: 2, a: 1 });
    expect(r.ok).toBe(true);
  });

  it("rejects a tampered payload", async () => {
    const tok = await issueToken(env, user, payload);
    const r = await verifyToken(env, tok, user, { ...payload, sim_quantity: 999 });
    expect(r).toEqual({ ok: false, reason: "payload_mismatch" });
  });

  it("rejects a different user (user is in the signed message)", async () => {
    const tok = await issueToken(env, user, payload);
    const r = await verifyToken(env, tok, "someone-else", payload);
    expect(r).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects an expired token", async () => {
    const tok = await issueToken(env, user, payload, -1000);
    const r = await verifyToken(env, tok, user, payload);
    expect(r).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a corrupted signature", async () => {
    const tok = await issueToken(env, user, payload);
    const bad = tok.slice(0, -2) + (tok.endsWith("aa") ? "bb" : "aa");
    const r = await verifyToken(env, bad, user, payload);
    expect(r.ok).toBe(false);
  });
});
