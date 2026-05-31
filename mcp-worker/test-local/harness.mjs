// Local test harness for the DealDesk MCP — no Cloudflare, no gateway needed.
//
// Generates an EPHEMERAL RS256 keypair (any keypair works locally as long as
// the JWKS we serve and the tokens we mint share it), writes a JWKS file the
// worker can fetch, and mints two test MGT-JWTs:
//   token-rw.txt  → is_admin + scopes {dealdesk:[read,write]}  (sees all tools)
//   token-ro.txt  → scopes {dealdesk:[read]}                   (write tools hidden)
//
// Run: node test-local/harness.mjs [ISSUER]
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { writeFileSync } from "node:fs";

const KID = "test-local";
const ISS = process.argv[2] || "http://127.0.0.1:8799";
const here = (f) => new URL(f, import.meta.url);

const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
const jwk = await exportJWK(publicKey);
writeFileSync(here("./jwks.json"), JSON.stringify({ keys: [{ ...jwk, kid: KID, use: "sig", alg: "RS256" }] }));

// Date.now() is fine in plain node.
const now = Math.floor(Date.now() / 1000);
async function mint(scopes, isAdmin) {
  return new SignJWT({
    email: "maor@monogoto.io",
    name: "Maor (local test)",
    is_admin: isAdmin,
    apps: ["dealdesk"],
    scopes: { dealdesk: scopes },
  })
    .setProtectedHeader({ alg: "RS256", kid: KID, typ: "JWT" })
    .setIssuer(ISS)
    .setSubject("00000000-0000-0000-0000-000000000000")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

writeFileSync(here("./token-rw.txt"), await mint(["read", "write"], true));
writeFileSync(here("./token-ro.txt"), await mint(["read"], false));
console.log(`OK — jwks.json + token-rw.txt + token-ro.txt written. ISS=${ISS}`);
