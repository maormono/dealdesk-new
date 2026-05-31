#!/usr/bin/env python3
# Fire a battery of questions at the locally-running DealDesk MCP and print a
# concise summary of each answer. Run after test-local/run.sh (worker on :8787).
import json, urllib.request, pathlib

BASE = "http://127.0.0.1:8787/"
TOKEN = (pathlib.Path(__file__).parent / "token-rw.txt").read_text().strip()

def call(name, args):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                       "params": {"name": name, "arguments": args}}).encode()
    req = urllib.request.Request(BASE, data=body, headers={
        "Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    try:
        resp = json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        return {"_http_error": e.code, "_body": e.read().decode()[:200]}
    if "error" in resp:
        return {"_rpc_error": resp["error"]}
    r = resp["result"]
    txt = r["content"][0]["text"]
    try:
        return {"isError": r.get("isError"), "data": json.loads(txt)}
    except Exception:
        return {"isError": r.get("isError"), "text": txt[:200]}

def cheapest(rows):
    return rows[0] if rows else None

# (label, tool, args)
QUESTIONS = [
    ("1.  Cheapest networks in the United States",        "dealdesk_lookup_rate_card", {"country": "United States", "limit": 3}),
    ("2.  Cheapest in the United Kingdom",                "dealdesk_lookup_rate_card", {"country": "United Kingdom", "limit": 3}),
    ("3.  Cheapest in France",                            "dealdesk_lookup_rate_card", {"country": "France", "limit": 3}),
    ("4.  Cheapest in India (248 networks)",              "dealdesk_lookup_rate_card", {"country": "India", "limit": 3}),
    ("5.  Cheapest in Brazil",                            "dealdesk_lookup_rate_card", {"country": "Brazil", "limit": 3}),
    ("6.  Cheapest in Israel",                            "dealdesk_lookup_rate_card", {"country": "Israel", "limit": 3}),
    ("7.  Cheapest NB-IoT network in Germany",            "dealdesk_lookup_rate_card", {"country": "Germany", "tech": "nb_iot", "limit": 3}),
    ("8.  Cheapest LTE-M network in the US",              "dealdesk_lookup_rate_card", {"country": "United States", "tech": "lte-m", "limit": 3}),
    ("9.  Cheapest in Canada",                            "dealdesk_lookup_rate_card", {"country": "Canada", "limit": 3}),
    ("10. Cheapest in Italy",                             "dealdesk_lookup_rate_card", {"country": "Italy", "limit": 3}),
    ("11. Nonexistent country 'Atlantis' (graceful?)",   "dealdesk_lookup_rate_card", {"country": "Atlantis", "limit": 3}),
    ("12. Cost build-up 100MB across DE/FR/ES",           "dealdesk_get_cost_buildup", {"countries": ["Germany", "France", "Spain"], "monthly_data_per_sim_mb": 100}),
    ("13. Cost build-up 10MB NB-IoT in India",            "dealdesk_get_cost_buildup", {"countries": ["India"], "monthly_data_per_sim_mb": 10, "tech": "nb_iot"}),
    ("14. Cost build-up 25MB across UK/CA/IT",            "dealdesk_get_cost_buildup", {"countries": ["United Kingdom", "Canada", "Italy"], "monthly_data_per_sim_mb": 25}),
    ("15. get_deal_rules (authenticated-only table)",     "dealdesk_get_deal_rules", {}),
]

for label, tool, args in QUESTIONS:
    print(f"\n{label}")
    res = call(tool, args)
    if "_http_error" in res:
        print(f"    HTTP {res['_http_error']}: {res['_body']}")
    elif "_rpc_error" in res:
        print(f"    RPC error: {res['_rpc_error']['message']}")
    elif res.get("isError"):
        print(f"    tool error: {res.get('text') or res.get('data')}")
    elif tool == "dealdesk_lookup_rate_card":
        d = res["data"]; c = cheapest(d["rows"])
        if not c:
            print(f"    {d['count']} rows (no networks found)")
        else:
            print(f"    {d['count']} networks; cheapest: {c['carrier_source']} / {c['network_name']} "
                  f"({c['tadig']}) @ ${c['data_per_mb']}/MB")
    elif tool == "dealdesk_get_cost_buildup":
        for pc in res["data"]["per_country"]:
            if pc["found"]:
                t = pc["candidates"][0]
                print(f"    {pc['country']:16} cheapest {t['carrier_source']}/{t['network_name']} "
                      f"@ ${t['data_per_mb']}/MB → ${t['monthly_data_cost_per_sim']}/SIM/mo")
            else:
                print(f"    {pc['country']:16} (no network found)")
    else:
        print(f"    {res.get('data') or res.get('text')}")
print("\n— battery complete —")
