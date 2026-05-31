#!/bin/bash
# Resume the local DealDesk MCP test harness.
cd "$(dirname "$0")/.."
node test-local/harness.mjs
( cd test-local && python3 -m http.server 8799 --bind 127.0.0.1 >/tmp/jwks-server.log 2>&1 & )
npx wrangler dev --port 8787 --local --ip 127.0.0.1 &
echo "JWKS on :8799, worker on :8787. Tokens in test-local/token-{rw,ro}.txt"
