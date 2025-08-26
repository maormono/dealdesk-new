#!/usr/bin/env python3
"""
Fix network names - remove country prefix and clean up duplicates
"""

import requests
import re

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def clean_network_name(name, country):
    """Remove country from network name and clean it up"""
    if not name:
        return 'unknown'
    
    # Convert to lowercase for processing
    name_lower = name.lower().strip()
    country_lower = country.lower().strip() if country else ''
    
    # Remove country prefix if it exists
    if country_lower and name_lower.startswith(country_lower + ' / '):
        name_lower = name_lower[len(country_lower) + 3:]
    elif country_lower and name_lower.startswith(country_lower + '/'):
        name_lower = name_lower[len(country_lower) + 1:]
    
    # Also remove if country is at the end
    if country_lower and name_lower.endswith(' / ' + country_lower):
        name_lower = name_lower[:-len(country_lower) - 3]
    elif country_lower and name_lower.endswith('/' + country_lower):
        name_lower = name_lower[:-len(country_lower) - 1]
    
    # Remove duplicate country names within the string
    if country_lower:
        # Remove patterns like "brazil tim brazil" -> "tim"
        name_lower = re.sub(f'{country_lower}\\s+(.+?)\\s+{country_lower}', r'\1', name_lower)
        # Remove country at beginning
        name_lower = re.sub(f'^{country_lower}\\s+', '', name_lower)
        # Remove country at end
        name_lower = re.sub(f'\\s+{country_lower}$', '', name_lower)
    
    # Clean up multiple spaces and slashes
    name_lower = re.sub(r'\s+', ' ', name_lower)
    name_lower = re.sub(r'/+', '/', name_lower)
    name_lower = name_lower.strip(' /')
    
    return name_lower if name_lower else 'unknown'

def main():
    print("🔧 Fixing network names...")
    
    # Get all networks
    response = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers)
    networks = response.json()
    
    print(f"Found {len(networks)} networks to process")
    
    updated = 0
    examples = []
    
    for network in networks:
        old_name = network['network_name']
        country = network['country']
        
        # Clean the network name
        new_name = clean_network_name(old_name, country)
        
        # Only update if changed
        if new_name != old_name:
            # Update the network
            update_response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/networks?id=eq.{network['id']}",
                headers=headers,
                json={'network_name': new_name}
            )
            
            if update_response.status_code in [200, 204]:
                updated += 1
                if len(examples) < 10:
                    examples.append(f"  {network['tadig']}: '{old_name}' → '{new_name}'")
                
                if updated % 50 == 0:
                    print(f"  Updated {updated} networks...")
    
    print(f"\n✅ Updated {updated} network names")
    
    if examples:
        print("\nExample changes:")
        for example in examples:
            print(example)
    
    # Check for duplicates
    print("\n🔍 Checking for duplicate network names...")
    
    # Get updated networks
    response = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers)
    networks = response.json()
    
    # Group by country and network name
    duplicates = {}
    for network in networks:
        key = f"{network['country']}|{network['network_name']}"
        if key not in duplicates:
            duplicates[key] = []
        duplicates[key].append(network['tadig'])
    
    # Show duplicates
    dup_count = 0
    for key, tadigs in duplicates.items():
        if len(tadigs) > 1:
            country, name = key.split('|', 1)
            if dup_count < 5:  # Show first 5 duplicates
                print(f"  {country} - {name}: {', '.join(tadigs)}")
            dup_count += 1
    
    if dup_count > 0:
        print(f"\n⚠️  Found {dup_count} network names that appear multiple times")
        print("   These might be legitimate (different TADIGs for same operator)")
    
    print("\n✅ Network name cleanup complete!")

if __name__ == "__main__":
    main()