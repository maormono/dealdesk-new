#!/usr/bin/env python3
"""
Automatically import restrictions from Excel files to database
This script can be run whenever new pricing files are uploaded
"""

import pandas as pd
import requests
import json
import sys
from datetime import datetime

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def import_tele2_restrictions(filename='0- Invoice Monogoto 2025-04.xlsx'):
    """Import restrictions from Tele2/Invoice file"""
    print(f"\n📄 Importing Tele2 restrictions from {filename}...")
    
    try:
        df = pd.read_excel(filename, sheet_name='Pricelist 2024-11-01', header=0)
    except FileNotFoundError:
        print(f"  ❌ File not found: {filename}")
        return 0
    except Exception as e:
        print(f"  ❌ Error reading file: {e}")
        return 0
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next((s['id'] for s in sources if s['source_name'] == 'Tele2'), None)
    if not source_id:
        print("  ❌ Tele2 source not found in database")
        return 0
    
    # Get networks
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    updated = 0
    restrictions_found = {}
    
    for _, row in df.iterrows():
        tadig = str(row.get('TADIG', '')).strip()
        comment = row.get('Comments', '')
        
        if tadig not in network_map or not tadig or tadig == 'TADIG':
            continue
        
        # Process comment
        restriction = None
        if pd.notna(comment) and comment:
            comment = str(comment).strip()
            # Skip non-restrictive comments
            if comment.lower() not in ['access fee', 'direct roaming', '']:
                restriction = comment
                restrictions_found[tadig] = restriction
        
        # Update database if we have a restriction or need to clear one
        network_id = network_map[tadig]
        
        # Check if pricing record exists
        check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}"
        response = requests.get(check_url, headers=headers)
        
        if response.status_code == 200 and response.json():
            pricing_id = response.json()[0]['id']
            current_restriction = response.json()[0].get('restrictions')
            
            # Only update if changed
            if current_restriction != restriction:
                update_response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json={'restrictions': restriction}
                )
                
                if update_response.status_code in [200, 204]:
                    updated += 1
                    if restriction:
                        print(f"  ✓ {tadig}: {restriction[:50]}...")
    
    print(f"  📊 Found {len(restrictions_found)} restrictions, updated {updated} records")
    return updated

def import_a1_restrictions(filename='202509_Country Price List A1 IMSI Sponsoring.xlsx'):
    """Import restrictions from A1 file"""
    print(f"\n📘 Importing A1 restrictions from {filename}...")
    
    try:
        df = pd.read_excel(filename, sheet_name='prices A1 WS', header=7)
    except FileNotFoundError:
        print(f"  ❌ File not found: {filename}")
        return 0
    except Exception as e:
        print(f"  ❌ Error reading file: {e}")
        return 0
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next((s['id'] for s in sources if s['source_name'] == 'A1'), None)
    if not source_id:
        print("  ❌ A1 source not found in database")
        return 0
    
    # Get networks
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    updated = 0
    restrictions_found = {}
    
    for _, row in df.iterrows():
        tadig = str(row.get('TADIG', '')).strip()
        restriction_raw = row.get('Restrictions', '')
        
        if tadig not in network_map or not tadig or tadig == 'TADIG':
            continue
        
        # Process restriction
        restriction = None
        if pd.notna(restriction_raw) and restriction_raw:
            restriction = str(restriction_raw).strip()
            restrictions_found[tadig] = restriction
        
        # Update database
        network_id = network_map[tadig]
        
        # Check if pricing record exists
        check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}"
        response = requests.get(check_url, headers=headers)
        
        if response.status_code == 200 and response.json():
            pricing_id = response.json()[0]['id']
            current_restriction = response.json()[0].get('restrictions')
            
            # Only update if changed
            if current_restriction != restriction:
                update_response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json={'restrictions': restriction}
                )
                
                if update_response.status_code in [200, 204]:
                    updated += 1
                    if restriction:
                        print(f"  ✓ {tadig}: {restriction}")
    
    print(f"  📊 Found {len(restrictions_found)} restrictions, updated {updated} records")
    return updated

def import_telefonica_restrictions(filename='20250205 Monogoto TGS UK V1.xlsx'):
    """Import service availability from Telefonica file"""
    print(f"\n📙 Importing Telefonica service restrictions from {filename}...")
    
    try:
        df = pd.read_excel(filename, sheet_name='Format All', header=0)
    except FileNotFoundError:
        print(f"  ❌ File not found: {filename}")
        return 0
    except Exception as e:
        print(f"  ❌ Error reading file: {e}")
        return 0
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next((s['id'] for s in sources if s['source_name'] == 'Telefonica'), None)
    if not source_id:
        print("  ❌ Telefonica source not found in database")
        return 0
    
    # Get networks
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    updated = 0
    restrictions_found = {}
    
    for _, row in df.iterrows():
        tadig = str(row.get('Tadig', '')).strip()
        
        if tadig not in network_map or not tadig or tadig == 'Tadig':
            continue
        
        # Check for service unavailability
        restrictions = []
        
        if row.get('VoLTE') == 'Unavailable':
            restrictions.append('VoLTE unavailable')
        
        if row.get('LTE-M') == 'Unavailable':
            restrictions.append('LTE-M unavailable')
        
        if row.get('NB-IoT') == 'Unavailable':
            restrictions.append('NB-IoT unavailable')
        
        # Check if data is 0 or unavailable
        data_value = row.get('Data')
        if pd.isna(data_value) or data_value == 0 or str(data_value).lower() == 'unavailable':
            restrictions.append('Data service unavailable')
        
        restriction = ', '.join(restrictions) if restrictions else None
        
        if restriction:
            restrictions_found[tadig] = restriction
        
        # Update database
        network_id = network_map[tadig]
        
        # Check if pricing record exists
        check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}"
        response = requests.get(check_url, headers=headers)
        
        if response.status_code == 200 and response.json():
            pricing_id = response.json()[0]['id']
            current_restriction = response.json()[0].get('restrictions')
            
            # Only update if changed
            if current_restriction != restriction:
                update_response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json={'restrictions': restriction}
                )
                
                if update_response.status_code in [200, 204]:
                    updated += 1
                    if restriction:
                        print(f"  ✓ {tadig}: {restriction[:50]}...")
    
    print(f"  📊 Found {len(restrictions_found)} service restrictions, updated {updated} records")
    return updated

def compare_restrictions():
    """Compare current restrictions with previous version to show changes"""
    print("\n🔍 Checking for restriction changes...")
    
    # This would ideally compare with a previous snapshot
    # For now, just show current restrictions summary
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/network_pricing?select=restrictions&restrictions=not.is.null",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Count by restriction type
        restriction_types = {}
        for record in data:
            restriction = record.get('restrictions', '')
            if restriction:
                # Categorize
                if 'no permanent roaming' in restriction.lower():
                    key = 'No permanent roaming'
                elif 'data not launched' in restriction.lower() or 'data unavailable' in restriction.lower():
                    key = 'Data unavailable'
                elif 'prohibited' in restriction.lower() or 'blocked' in restriction.lower():
                    key = 'Prohibited/Blocked'
                elif 'no resell' in restriction.lower():
                    key = 'No resale allowed'
                elif 'services not available' in restriction.lower():
                    key = 'Services limited'
                elif restriction in ['X', 'XX']:
                    key = 'Special restrictions (X/XX)'
                else:
                    key = 'Other restrictions'
                
                restriction_types[key] = restriction_types.get(key, 0) + 1
        
        print("\n📊 Restriction Summary:")
        for rtype, count in sorted(restriction_types.items(), key=lambda x: -x[1]):
            print(f"  • {rtype}: {count} networks")
        
        print(f"\n  Total: {len(data)} networks with restrictions")

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     📋 AUTOMATIC RESTRICTION IMPORT")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # Check if specific file is provided
    if len(sys.argv) > 1:
        filename = sys.argv[1]
        print(f"\n🎯 Processing specific file: {filename}")
        
        # Determine source based on filename
        if 'invoice' in filename.lower() or 'tele2' in filename.lower():
            import_tele2_restrictions(filename)
        elif 'a1' in filename.lower():
            import_a1_restrictions(filename)
        elif 'telefonica' in filename.lower() or 'tgs' in filename.lower():
            import_telefonica_restrictions(filename)
        else:
            print("  ⚠️  Cannot determine operator from filename")
            print("  Please include 'A1', 'Telefonica', or 'Invoice/Tele2' in filename")
    else:
        # Import from all default files
        total_updated = 0
        
        total_updated += import_tele2_restrictions()
        total_updated += import_a1_restrictions()
        total_updated += import_telefonica_restrictions()
        
        print(f"\n✅ Import complete! Total updates: {total_updated}")
    
    # Show comparison/summary
    compare_restrictions()
    
    print("\n🎉 Restrictions are now in the database!")
    print("   The website will automatically display them from the database.")

if __name__ == "__main__":
    main()