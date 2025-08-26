#!/usr/bin/env python3
"""
Complete Network Import Script
- Imports ALL networks from ALL operators
- Uses TADIG as primary key for correlation
- Standardizes network names (lowercase, handles duplicates)
"""

import pandas as pd
import requests
from datetime import datetime
import re

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def standardize_name(name):
    """Standardize network names - lowercase, remove extra spaces"""
    if not name or name == 'Unknown':
        return 'unknown'
    # Convert to lowercase and clean up
    name = str(name).lower().strip()
    # Remove extra spaces
    name = re.sub(r'\s+', ' ', name)
    return name

def clear_database():
    """Clear all existing data for fresh import"""
    print("🗑️  Clearing existing data for fresh import...")
    
    # Delete all pricing first (due to foreign keys)
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/network_pricing?id=neq.00000000-0000-0000-0000-000000000000",
        headers=headers
    )
    
    # Delete all networks
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/networks?id=neq.00000000-0000-0000-0000-000000000000", 
        headers=headers
    )
    
    print("  ✅ Database cleared")

def get_source_ids():
    """Get source IDs from database"""
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    return {s['source_name']: s['id'] for s in sources}

def import_tele2_networks():
    """Import ALL Tele2 networks from invoice"""
    print("\n📄 Importing Tele2 (Invoice) - 573 networks...")
    
    source_ids = get_source_ids()
    source_id = source_ids['Tele2']
    
    # Load Tele2/Invoice file
    df = pd.read_excel('0- Invoice Monogoto 2025-04.xlsx', sheet_name='Pricelist 2024-11-01', header=0)
    
    networks = {}
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if not tadig or tadig == 'TADIG':
            continue
        
        # Collect network info
        network_name = standardize_name(row.get('Network', 'unknown'))
        country = str(row.get('Country', 'Unknown')).strip()
        
        # Store network keyed by TADIG
        if tadig not in networks:
            networks[tadig] = {
                'names': set(),
                'country': country,
                'pricing': {}
            }
        
        networks[tadig]['names'].add(network_name)
        
        # Parse pricing
        imsi_fee = 0
        if 'Access fee per IMSI, EUR/month' in row:
            val = row['Access fee per IMSI, EUR/month']
            if not pd.isna(val):
                try:
                    imsi_fee = float(val)
                except:
                    imsi_fee = 0
        
        networks[tadig]['pricing']['Tele2'] = {
            'data_per_mb': float(row['Data/MB']) if 'Data/MB' in row and not pd.isna(row['Data/MB']) else 0,
            'sms_mo': float(row['SMS']) if 'SMS' in row and not pd.isna(row['SMS']) else 0,
            'voice_moc': float(row['MOC/Min']) if 'MOC/Min' in row and not pd.isna(row['MOC/Min']) else 0,
            'imsi_access_fee': imsi_fee
        }
    
    print(f"  ✅ Found {len(networks)} Tele2 networks")
    return networks

def import_a1_networks():
    """Import ALL A1 networks"""
    print("\n📘 Importing A1 - 464 networks...")
    
    source_ids = get_source_ids()
    source_id = source_ids['A1']
    
    # Load A1 file
    df = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)
    
    networks = {}
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if not tadig or tadig == 'TADIG':
            continue
        
        # Collect network info
        country = str(row.iloc[0]).strip() if not pd.isna(row.iloc[0]) else 'Unknown'
        network_name = standardize_name(row.iloc[1] if not pd.isna(row.iloc[1]) else 'unknown')
        
        # Store network keyed by TADIG
        if tadig not in networks:
            networks[tadig] = {
                'names': set(),
                'country': country,
                'pricing': {}
            }
        
        networks[tadig]['names'].add(network_name)
        
        # Parse pricing
        networks[tadig]['pricing']['A1'] = {
            'data_per_mb': float(row['price/MB']) if 'price/MB' in row and not pd.isna(row.get('price/MB')) else 0,
            'imsi_access_fee': float(row['General']) if 'General' in row and not pd.isna(row.get('General')) else 0
        }
    
    print(f"  ✅ Found {len(networks)} A1 networks")
    return networks

def import_telefonica_networks():
    """Import ALL Telefonica networks"""
    print("\n📙 Importing Telefonica - 517 networks...")
    
    source_ids = get_source_ids()
    source_id = source_ids['Telefonica']
    
    # Load Telefonica file - Format All sheet has all networks
    df = pd.read_excel('20250205 Monogoto TGS UK V1.xlsx', sheet_name='Format All', header=0)
    
    networks = {}
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('Tadig')):
            continue
        
        tadig = str(row['Tadig']).strip()
        if not tadig or tadig == 'Tadig':
            continue
        
        # Collect network info
        country = str(row.get('Country', 'Unknown')).strip()
        network_name = standardize_name(row.get('Operator', 'unknown'))
        
        # Store network keyed by TADIG
        if tadig not in networks:
            networks[tadig] = {
                'names': set(),
                'country': country,
                'pricing': {}
            }
        
        networks[tadig]['names'].add(network_name)
        
        # Parse pricing
        networks[tadig]['pricing']['Telefonica'] = {
            'data_per_mb': float(row['Data']) if 'Data' in row and not pd.isna(row['Data']) else 0,
            'voice_moc': float(row['MOC']) if 'MOC' in row and not pd.isna(row['MOC']) else 0,
            'imsi_access_fee': 0  # Telefonica doesn't have IMSI fees
        }
    
    print(f"  ✅ Found {len(networks)} Telefonica networks")
    return networks

def merge_and_import_all():
    """Merge all networks by TADIG and import to database"""
    print("\n🔄 Merging all networks by TADIG...")
    
    # Import from all sources
    tele2_networks = import_tele2_networks()
    a1_networks = import_a1_networks()
    telefonica_networks = import_telefonica_networks()
    
    # Merge all networks by TADIG
    all_networks = {}
    
    # Add Tele2 networks
    for tadig, data in tele2_networks.items():
        if tadig not in all_networks:
            all_networks[tadig] = {
                'names': set(),
                'country': data['country'],
                'pricing': {}
            }
        all_networks[tadig]['names'].update(data['names'])
        all_networks[tadig]['pricing'].update(data['pricing'])
    
    # Add A1 networks
    for tadig, data in a1_networks.items():
        if tadig not in all_networks:
            all_networks[tadig] = {
                'names': set(),
                'country': data['country'],
                'pricing': {}
            }
        all_networks[tadig]['names'].update(data['names'])
        all_networks[tadig]['pricing'].update(data['pricing'])
        # Update country if it was Unknown
        if all_networks[tadig]['country'] == 'Unknown' and data['country'] != 'Unknown':
            all_networks[tadig]['country'] = data['country']
    
    # Add Telefonica networks
    for tadig, data in telefonica_networks.items():
        if tadig not in all_networks:
            all_networks[tadig] = {
                'names': set(),
                'country': data['country'],
                'pricing': {}
            }
        all_networks[tadig]['names'].update(data['names'])
        all_networks[tadig]['pricing'].update(data['pricing'])
        # Update country if it was Unknown
        if all_networks[tadig]['country'] == 'Unknown' and data['country'] != 'Unknown':
            all_networks[tadig]['country'] = data['country']
    
    print(f"  ✅ Total unique TADIGs across all sources: {len(all_networks)}")
    
    # Now import to database
    print("\n📥 Importing to database...")
    
    source_ids = get_source_ids()
    network_batch = []
    network_id_map = {}
    
    # First, create all networks
    for tadig, data in all_networks.items():
        # Combine all network names if there are multiple
        names_list = [n for n in data['names'] if n and n != 'unknown']
        if names_list:
            # Join multiple names with " / "
            network_name = ' / '.join(sorted(set(names_list)))
        else:
            network_name = 'unknown'
        
        network_batch.append({
            'tadig': tadig,
            'network_name': network_name,
            'country': data['country'],
            'is_active': True
        })
        
        # Insert in batches of 100
        if len(network_batch) >= 100:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/networks",
                headers={**headers, 'Prefer': 'return=representation'},
                json=network_batch
            )
            if response.status_code == 201:
                for net in response.json():
                    network_id_map[net['tadig']] = net['id']
                print(f"  Created {len(network_id_map)} networks...")
            network_batch = []
    
    # Insert remaining networks
    if network_batch:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/networks",
            headers={**headers, 'Prefer': 'return=representation'},
            json=network_batch
        )
        if response.status_code == 201:
            for net in response.json():
                network_id_map[net['tadig']] = net['id']
    
    print(f"  ✅ Created {len(network_id_map)} networks")
    
    # Now add all pricing data
    pricing_batch = []
    pricing_count = 0
    
    for tadig, data in all_networks.items():
        if tadig not in network_id_map:
            continue
        
        network_id = network_id_map[tadig]
        
        # Add pricing for each source that has data for this network
        for source_name, pricing_data in data['pricing'].items():
            pricing_batch.append({
                'network_id': network_id,
                'source_id': source_ids[source_name],
                'data_per_mb': pricing_data.get('data_per_mb', 0),
                'imsi_access_fee': pricing_data.get('imsi_access_fee', 0),
                'sms_mo': pricing_data.get('sms_mo', 0),
                'voice_moc': pricing_data.get('voice_moc', 0),
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            })
            
            # Insert in batches of 100
            if len(pricing_batch) >= 100:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/network_pricing",
                    headers=headers,
                    json=pricing_batch
                )
                if response.status_code in [201, 204]:
                    pricing_count += len(pricing_batch)
                    print(f"  Added {pricing_count} pricing records...")
                pricing_batch = []
    
    # Insert remaining pricing
    if pricing_batch:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/network_pricing",
            headers=headers,
            json=pricing_batch
        )
        if response.status_code in [201, 204]:
            pricing_count += len(pricing_batch)
    
    print(f"  ✅ Added {pricing_count} pricing records")
    
    return len(network_id_map), pricing_count

def verify_import():
    """Verify the import results"""
    print("\n📊 Verifying import...")
    
    # Get final counts
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    pricing = requests.get(f"{SUPABASE_URL}/rest/v1/network_pricing?select=*,pricing_sources(source_name)", headers=headers).json()
    
    # Count by source
    by_source = {'A1': set(), 'Telefonica': set(), 'Tele2': set()}
    for p in pricing:
        source = p.get('pricing_sources', {}).get('source_name')
        network_id = p.get('network_id')
        if source in by_source:
            by_source[source].add(network_id)
    
    print(f"\n✅ IMPORT COMPLETE!")
    print(f"  Total unique networks (by TADIG): {len(networks)}")
    print(f"  Total pricing records: {len(pricing)}")
    
    print(f"\nNetworks with pricing by source:")
    print(f"  Tele2: {len(by_source['Tele2'])} networks (expected ~573)")
    print(f"  A1: {len(by_source['A1'])} networks (expected ~464)")
    print(f"  Telefonica: {len(by_source['Telefonica'])} networks (expected ~517)")
    
    # Show sample of merged names
    print("\nSample of standardized network names:")
    for i, net in enumerate(networks[:5]):
        print(f"  {net['tadig']}: {net['network_name']}")

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     ⚠️  WARNING: THIS SCRIPT HAS KNOWN BUGS! ⚠️")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("\n⚠️  CRITICAL ISSUES:")
    print("  • CANST gets country='Unknown' and network='Canada' (SWAPPED!)")
    print("  • 294 Tele2 networks get country='Unknown'")
    print("  • HTML entities not cleaned (AT&amp;T)")
    print("  • READ: IMPORTANT-DATA-IMPORT-README.md")
    print("\n✅ USE INSTEAD: npx tsx import-with-fixed-parser.js")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    response = input("\n⚠️  Have you read IMPORTANT-DATA-IMPORT-README.md? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Please read the README first to understand the issues.")
        print("   Run: cat IMPORTANT-DATA-IMPORT-README.md")
        return
    
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     🚀 COMPLETE NETWORK IMPORT")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("\nThis will:")
    print("  1. Import ALL networks from ALL operators")
    print("  2. Use TADIG as primary key for correlation")
    print("  3. Standardize network names (lowercase)")
    print("  4. Merge duplicate names with ' / '")
    print("\n⚠️  WARNING: This will CLEAR existing data first!")
    
    response = input("\nProceed with complete import? (yes/no): ")
    
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    # Clear and import
    clear_database()
    network_count, pricing_count = merge_and_import_all()
    verify_import()
    
    print("\n🎉 Refresh https://deal-desk.netlify.app/ to see all networks!")

if __name__ == "__main__":
    main()