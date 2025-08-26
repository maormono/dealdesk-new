#!/usr/bin/env python3
"""
Consolidate networks with same name and same pricing
Also standardize network name capitalization
"""

import requests
import json
from collections import defaultdict

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def standardize_name(name):
    """Standardize network names with consistent capitalization"""
    if not name:
        return 'Unknown'
    
    # Define standard capitalizations
    standards = {
        'tim': 'TIM',
        'claro': 'Claro',
        'vivo': 'Vivo',
        'oi': 'Oi',
        'telefonica': 'Telefónica',
        'telefónica': 'Telefónica',
        'vodafone': 'Vodafone',
        'orange': 'Orange',
        't-mobile': 'T-Mobile',
        'mtn': 'MTN',
        'mts': 'MTS',
        'stc': 'STC',
        'airtel': 'Airtel',
        'movistar': 'Movistar',
        'telenor': 'Telenor',
        'telia': 'Telia',
        'three': 'Three',
        'o2': 'O2',
        'ee': 'EE',
        'bt': 'BT',
        'at&t': 'AT&T',
        'verizon': 'Verizon',
        'sprint': 'Sprint'
    }
    
    # Check if the name matches a standard
    name_lower = name.lower().strip()
    if name_lower in standards:
        return standards[name_lower]
    
    # Otherwise return with first letter capitalized
    return name.strip()

def get_pricing_key(pricing):
    """Create a key from pricing data for comparison"""
    return (
        round(pricing.get('data_per_mb', 0), 6),
        round(pricing.get('sms_mo', 0), 6),
        round(pricing.get('voice_moc', 0), 6),
        round(pricing.get('imsi_access_fee', 0), 2),
        pricing.get('source_id')
    )

def consolidate_networks():
    """Consolidate networks with same name, country, and pricing"""
    
    print("🔄 Fetching all networks and pricing...")
    
    # Get all networks
    networks_response = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers)
    networks = networks_response.json()
    print(f"  Found {len(networks)} networks")
    
    # Get all pricing with pagination
    all_pricing = []
    offset = 0
    while True:
        headers_with_range = {**headers, 'Range': f'{offset}-{offset+999}'}
        pricing_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/network_pricing",
            headers=headers_with_range
        )
        
        if pricing_response.status_code == 200:
            data = pricing_response.json()
            if not data:
                break
            all_pricing.extend(data)
            if len(data) < 1000:
                break
            offset += 1000
        else:
            break
    
    print(f"  Found {len(all_pricing)} pricing records")
    
    # Create network map
    network_map = {n['id']: n for n in networks}
    
    # Group networks by name, country, and pricing
    consolidation_groups = defaultdict(lambda: {
        'networks': [],
        'pricing_by_source': defaultdict(list)
    })
    
    for pricing in all_pricing:
        network_id = pricing['network_id']
        if network_id not in network_map:
            continue
        
        network = network_map[network_id]
        standard_name = standardize_name(network['network_name'])
        
        # Create consolidation key
        key = (standard_name, network['country'])
        
        # Add to group
        consolidation_groups[key]['networks'].append(network)
        pricing_key = get_pricing_key(pricing)
        consolidation_groups[key]['pricing_by_source'][pricing['source_id']].append({
            'pricing': pricing,
            'network': network,
            'key': pricing_key
        })
    
    # Find consolidation candidates
    print("\n📊 Analyzing consolidation opportunities...")
    consolidations = []
    
    for (name, country), group_data in consolidation_groups.items():
        networks_in_group = group_data['networks']
        
        if len(networks_in_group) > 1:
            # Check if all networks have identical pricing for each source
            can_consolidate = True
            consolidation_info = {
                'name': name,
                'country': country,
                'networks': [],
                'primary_tadig': None,
                'sources': set()
            }
            
            # Group by source and check if pricing matches
            for source_id, pricing_list in group_data['pricing_by_source'].items():
                unique_prices = set(p['key'] for p in pricing_list)
                
                if len(unique_prices) > 1:
                    # Different prices for same source - can't consolidate
                    can_consolidate = False
                    break
                
                consolidation_info['sources'].add(source_id)
            
            if can_consolidate and len(networks_in_group) > 1:
                # Get unique TADIGs
                tadigs = list(set(n['tadig'] for n in networks_in_group))
                consolidation_info['networks'] = tadigs
                consolidation_info['primary_tadig'] = sorted(tadigs)[0]  # Use first alphabetically
                consolidations.append(consolidation_info)
    
    # Show consolidation plan
    if consolidations:
        print(f"\n✅ Found {len(consolidations)} consolidation opportunities:")
        for cons in consolidations[:10]:
            print(f"\n  {cons['name']} ({cons['country']}):")
            print(f"    TADIGs to consolidate: {', '.join(cons['networks'])}")
            print(f"    Primary TADIG: {cons['primary_tadig']}")
    else:
        print("\n  No consolidation opportunities found")
    
    # Update network names to standard format
    print("\n🔧 Standardizing network names...")
    updated_count = 0
    
    for network in networks:
        old_name = network['network_name']
        new_name = standardize_name(old_name)
        
        if new_name != old_name:
            # Update the network name
            update_response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/networks?id=eq.{network['id']}",
                headers=headers,
                json={'network_name': new_name}
            )
            
            if update_response.status_code in [200, 204]:
                updated_count += 1
                if updated_count <= 10:
                    print(f"  {network['tadig']}: '{old_name}' → '{new_name}'")
    
    print(f"\n✅ Updated {updated_count} network names")
    
    # For actual consolidation, we would need to:
    # 1. Keep one network record (primary TADIG)
    # 2. Delete duplicate network records
    # 3. Update pricing records to point to primary network
    # But this requires careful consideration of data integrity
    
    print("\n📝 Consolidation Summary:")
    print(f"  Total networks: {len(networks)}")
    print(f"  Networks with standardized names: {updated_count}")
    print(f"  Potential consolidations: {len(consolidations)}")
    
    if consolidations:
        # Calculate how many networks would be removed
        total_removals = sum(len(c['networks']) - 1 for c in consolidations)
        print(f"  Networks that could be consolidated: {total_removals}")
        print(f"  Final network count after consolidation: {len(networks) - total_removals}")

if __name__ == "__main__":
    consolidate_networks()