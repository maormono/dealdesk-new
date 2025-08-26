#!/usr/bin/env python3
"""
Verify and fix Israel IoT coverage based on Monogoto documentation
According to docs.monogoto.io/getting-started/coverage-lists/lp-wan-coverage:

Israel networks with IoT support:
1. Pelephone (ISRPL): LTE-M on profiles B, E, P | NB-IoT on profiles B, P
2. Partner (ISR01): LTE-M on profiles B, C, E | NB-IoT on profiles B, C, E  
3. Cellcom (ISRCL): LTE-M on profile E only
4. Hot Mobile (ISRMS): LTE-M on profile B only

Since we only have B=Tele2, E=A1, O=Telefonica in our system (P and C are not available),
we need to update accordingly.
"""

import requests
import json

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def check_and_fix_israel_iot():
    """Check current Israel IoT coverage and fix if needed"""
    
    print("🇮🇱 Checking Israel IoT Coverage")
    print("=" * 60)
    
    # Get Israel networks
    israel_networks = {
        'ISRPL': 'Pelephone',
        'ISR01': 'Partner/Orange', 
        'ISRCL': 'Cellcom',
        'ISRMS': 'Hot Mobile'
    }
    
    # Correct IoT support from Monogoto docs
    # We can only use profiles B (Tele2), E (A1), O (Telefonica)
    correct_coverage = {
        'ISRPL': {
            'Tele2': {'lte_m': True, 'nb_iot': True},   # Profile B
            'A1': {'lte_m': True, 'nb_iot': False},      # Profile E  
        },
        'ISR01': {
            'Tele2': {'lte_m': True, 'nb_iot': True},   # Profile B
            'A1': {'lte_m': True, 'nb_iot': True},       # Profile E
        },
        'ISRCL': {
            'A1': {'lte_m': True, 'nb_iot': False},      # Profile E only
        },
        'ISRMS': {
            'Tele2': {'lte_m': True, 'nb_iot': False},   # Profile B only
        }
    }
    
    # Get network and source IDs
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_map = {s['source_name']: s['id'] for s in sources}
    
    print("\n📊 Current vs Expected IoT Coverage:\n")
    
    fixes_needed = []
    
    for tadig, network_name in israel_networks.items():
        if tadig not in network_map:
            print(f"  ⚠️  {network_name} ({tadig}) - Network not found in database")
            continue
            
        network_id = network_map[tadig]
        print(f"  {network_name} ({tadig}):")
        
        # Check each operator's pricing
        for operator in ['Tele2', 'A1', 'Telefonica']:
            if operator not in source_map:
                continue
                
            # Get current pricing
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_map[operator]}",
                headers=headers
            )
            
            if response.status_code == 200 and response.json():
                pricing = response.json()[0]
                current_lte_m = pricing.get('lte_m', False)
                current_nb_iot = pricing.get('nb_iot', False)
                
                # Check if this operator should have IoT for this network
                if tadig in correct_coverage and operator in correct_coverage[tadig]:
                    expected = correct_coverage[tadig][operator]
                    expected_lte_m = expected['lte_m']
                    expected_nb_iot = expected['nb_iot']
                    
                    if current_lte_m != expected_lte_m or current_nb_iot != expected_nb_iot:
                        print(f"    {operator}: ❌ Current: LTE-M={current_lte_m}, NB-IoT={current_nb_iot}")
                        print(f"              Expected: LTE-M={expected_lte_m}, NB-IoT={expected_nb_iot}")
                        fixes_needed.append({
                            'pricing_id': pricing['id'],
                            'network': network_name,
                            'operator': operator,
                            'updates': expected
                        })
                    else:
                        if expected_lte_m or expected_nb_iot:
                            print(f"    {operator}: ✅ LTE-M={current_lte_m}, NB-IoT={current_nb_iot}")
                else:
                    # Should have no IoT support
                    if current_lte_m or current_nb_iot:
                        print(f"    {operator}: ❌ Has IoT but shouldn't - LTE-M={current_lte_m}, NB-IoT={current_nb_iot}")
                        fixes_needed.append({
                            'pricing_id': pricing['id'],
                            'network': network_name,
                            'operator': operator,
                            'updates': {'lte_m': False, 'nb_iot': False}
                        })
    
    # Apply fixes
    if fixes_needed:
        print(f"\n🔧 Applying {len(fixes_needed)} fixes...")
        
        for fix in fixes_needed:
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{fix['pricing_id']}",
                headers=headers,
                json=fix['updates']
            )
            
            if response.status_code in [200, 204]:
                print(f"  ✓ Fixed {fix['network']} - {fix['operator']}: {fix['updates']}")
            else:
                print(f"  ✗ Failed to fix {fix['network']} - {fix['operator']}")
        
        print("\n✅ Israel IoT coverage corrected based on Monogoto documentation!")
    else:
        print("\n✅ Israel IoT coverage is already correct!")
    
    # Show final summary
    print("\n📱 Final Israel IoT Coverage Summary:")
    print("  Pelephone: LTE-M (Tele2, A1), NB-IoT (Tele2)")
    print("  Partner/Orange: LTE-M (Tele2, A1), NB-IoT (Tele2, A1)")
    print("  Cellcom: LTE-M (A1 only)")
    print("  Hot Mobile: LTE-M (Tele2 only)")

if __name__ == "__main__":
    check_and_fix_israel_iot()