import { describe, it, expect, vi, afterEach } from "vitest";
import { dbSelect, dbInsert } from "../src/lib/supabase.ts";

const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test" };

function mockFetch(jsonBody: unknown, status = 200) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(jsonBody), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("dbSelect", () => {
  it("GETs /rest/v1/<path> with service-role headers", async () => {
    const f = mockFetch([{ id: 1 }]);
    vi.stubGlobal("fetch", f);
    const rows = await dbSelect(env, "v_network_pricing_all?country=eq.US&select=*");
    expect(rows).toEqual([{ id: 1 }]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/v_network_pricing_all?country=eq.US&select=*");
    expect((init as RequestInit).headers).toMatchObject({
      apikey: "sb_secret_test",
      Authorization: "Bearer sb_secret_test",
    });
  });

  it("throws on non-OK", async () => {
    vi.stubGlobal("fetch", mockFetch({ message: "boom" }, 400));
    await expect(dbSelect(env, "networks")).rejects.toThrow(/boom/);
  });
});

describe("dbInsert", () => {
  it("POSTs a row and returns the representation", async () => {
    const f = mockFetch([{ id: "uuid-1" }], 201);
    vi.stubGlobal("fetch", f);
    const row = await dbInsert(env, "deal_evaluations", { sim_quantity: 5 });
    expect(row).toEqual({ id: "uuid-1" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://x.supabase.co/rest/v1/deal_evaluations");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({ Prefer: "return=representation" });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ sim_quantity: 5 });
  });
});
