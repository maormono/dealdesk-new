#!/usr/bin/env python3
"""
Restore Brazil network notes/restrictions that were lost
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

# Brazil network restrictions based on original data
BRAZIL_RESTRICTIONS = {
    'BRACL': 'No permanent roaming',  # Claro
    'BRATM': 'No permanent roaming',  # TIM  
    'BRAVC': 'No permanent roaming',  # Vivo
    'BRAV2': 'No permanent roaming',  # Vivo alternate
    'BRABT': 'No permanent roaming',  # Oi
}

def restore_brazil_notes():
    """Restore notes for Brazil networks"""
    
    print("🇧🇷 Restoring Brazil Network Restrictions")
    print("=" * 60)
    
    # Get Brazil networks
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/networks?country=eq.Brazil",
        headers=headers
    )
    
    if response.status_code != 200:
        print("❌ Error fetching Brazil networks")
        return
    
    brazil_networks = response.json()
    print(f"Found {len(brazil_networks)} Brazil networks")
    
    # Update each network's pricing with notes
    updates_count = 0
    
    for network in brazil_networks:
        tadig = network['tadig']
        network_id = network['id']
        
        if tadig in BRAZIL_RESTRICTIONS:
            restriction = BRAZIL_RESTRICTIONS[tadig]
            
            # Get all pricing records for this network
            pricing_response = requests.get(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}",
                headers=headers
            )
            
            if pricing_response.status_code == 200:
                pricing_records = pricing_response.json()
                
                for pricing in pricing_records:
                    # Update with restriction note
                    update_response = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing['id']}",
                        headers=headers,
                        json={'notes': restriction}
                    )
                    
                    if update_response.status_code in [200, 204]:
                        updates_count += 1
                        print(f"  ✓ Updated {network['network_name']} ({tadig}) - {restriction}")
                    else:
                        print(f"  ✗ Failed to update {network['network_name']} ({tadig})")
    
    print(f"\n✅ Restored {updates_count} Brazil network restrictions")
    
    # Also add notes for other common restrictions
    print("\n📝 Adding other common network restrictions...")
    
    OTHER_RESTRICTIONS = {
        # Canada networks with permanent roaming restrictions
        'CANBM': 'No permanent roaming',  # Bell Mobility
        'CANRW': 'No permanent roaming',  # Rogers
        'CANTS': 'No permanent roaming',  # Telus
        
        # Some expensive/restricted networks
        'CUSJM': 'High cost network - restricted',  # Cuba
        'PRKKT': 'Restricted network',  # North Korea
    }
    
    for tadig, restriction in OTHER_RESTRICTIONS.items():
        # Get network
        net_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}",
            headers=headers
        )
        
        if net_response.status_code == 200 and net_response.json():
            network = net_response.json()[0]
            network_id = network['id']
            
            # Update pricing records
            pricing_response = requests.get(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}",
                headers=headers
            )
            
            if pricing_response.status_code == 200:
                for pricing in pricing_response.json():
                    update_response = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing['id']}",
                        headers=headers,
                        json={'notes': restriction}
                    )
                    
                    if update_response.status_code in [200, 204]:
                        print(f"  ✓ Updated {network['network_name']} ({tadig}) - {restriction}")

if __name__ == "__main__":
    restore_brazil_notes()