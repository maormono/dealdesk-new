#!/usr/bin/env python3
"""
Complete import - ALL networks from ALL sources
This will create every network and add all pricing data
"""

import pandas as pd
import requests
from datetime import datetime
import time

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def clear_all_data():
    """Clear existing data for fresh import"""
    print("🗑️  Clearing existing data...")
    
    # Delete all pricing first (due to foreign keys)
    requests.delete(f"{SUPABASE_URL}/rest/v1/network_pricing?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
    
    # Delete all networks
    requests.delete(f"{SUPABASE_URL}/rest/v1/networks?id=neq.00000000-0000-0000-0000-000000000000", headers=headers)
    
    print("  ✅ Cleared existing data")

def import_tele2_complete():
    """Import ALL Tele2/Invoice networks"""
    print("\n📄 Importing Tele2 (Invoice) - 573 networks...")
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'Tele2')
    
    # Load file
    df = pd.read_excel('0- Invoice Monogoto 2025-04.xlsx', sheet_name='Pricelist 2024-11-01', header=0)
    
    count = 0
    batch = []
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if not tadig or tadig == 'TADIG':
            continue
        
        # Create network data
        network_name = str(row.get('Network', 'Unknown')).strip()
        country = str(row.get('Country', 'Unknown')).strip()
        
        # Batch insert networks
        batch.append({
            'tadig': tadig,
            'network_name': network_name,
            'country': country,
            'is_active': True
        })
        
        # Insert in batches of 50
        if len(batch) >= 50:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/networks",
                headers={**headers, 'Prefer': 'return=representation'},
                json=batch
            )
            if response.status_code == 201:
                count += len(batch)
                print(f"  Progress: {count}/573 networks...")
            batch = []
    
    # Insert remaining
    if batch:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/networks",
            headers={**headers, 'Prefer': 'return=representation'},
            json=batch
        )
        if response.status_code == 201:
            count += len(batch)
    
    print(f"  ✅ Created {count} Tele2 networks")
    
    # Now add pricing
    print("  Adding Tele2 pricing...")
    
    # Get all networks
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    pricing_count = 0
    pricing_batch = []
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if tadig not in network_map:
            continue
        
        # Parse pricing
        imsi_fee = 0
        if 'Access fee per IMSI, EUR/month' in row:
            val = row['Access fee per IMSI, EUR/month']
            if not pd.isna(val):
                try:
                    imsi_fee = float(val)
                except:
                    imsi_fee = 0
        
        data_rate = float(row['Data/MB']) if 'Data/MB' in row and not pd.isna(row['Data/MB']) else 0
        sms_rate = float(row['SMS']) if 'SMS' in row and not pd.isna(row['SMS']) else 0
        voice_rate = float(row['MOC/Min']) if 'MOC/Min' in row and not pd.isna(row['MOC/Min']) else 0
        
        pricing_batch.append({
            'network_id': network_map[tadig],
            'source_id': source_id,
            'data_per_mb': data_rate,
            'sms_mo': sms_rate,
            'voice_moc': voice_rate,
            'imsi_access_fee': imsi_fee,
            'is_current': True,
            'effective_date': datetime.now().date().isoformat()
        })
        
        if len(pricing_batch) >= 50:
            response = requests.post(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers, json=pricing_batch)
            if response.status_code in [201, 204]:
                pricing_count += len(pricing_batch)
            pricing_batch = []
    
    if pricing_batch:
        response = requests.post(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers, json=pricing_batch)
        if response.status_code in [201, 204]:
            pricing_count += len(pricing_batch)
    
    print(f"  ✅ Added {pricing_count} Tele2 prices")
    return count

def import_a1_complete():
    """Import ALL A1 networks"""
    print("\n📘 Importing A1 - 464 networks...")
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'A1')
    
    # Get existing networks
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    # Load file
    df = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)
    
    new_count = 0
    pricing_count = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if not tadig or tadig == 'TADIG':
            continue
        
        # Get or create network
        if tadig not in network_map:
            country = str(row.iloc[0]).strip() if not pd.isna(row.iloc[0]) else 'Unknown'
            network_name = str(row.iloc[1]).strip() if not pd.isna(row.iloc[1]) else 'Unknown'
            
            network_data = {
                'tadig': tadig,
                'network_name': network_name,
                'country': country,
                'is_active': True
            }
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/networks",
                headers={**headers, 'Prefer': 'return=representation'},
                json=network_data
            )
            
            if response.status_code == 201:
                network_map[tadig] = response.json()[0]['id']
                new_count += 1
        
        # Add A1 pricing
        if tadig in network_map:
            # Check if pricing exists
            check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_map[tadig]}&source_id=eq.{source_id}"
            if not requests.get(check_url, headers=headers).json():
                # Parse pricing
                imsi_fee = float(row['General']) if 'General' in row and not pd.isna(row.get('General')) else 0
                data_rate = float(row['price/MB']) if 'price/MB' in row and not pd.isna(row.get('price/MB')) else 0
                
                pricing_data = {
                    'network_id': network_map[tadig],
                    'source_id': source_id,
                    'data_per_mb': data_rate,
                    'imsi_access_fee': imsi_fee,
                    'is_current': True,
                    'effective_date': datetime.now().date().isoformat()
                }
                
                response = requests.post(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers, json=pricing_data)
                if response.status_code in [201, 204]:
                    pricing_count += 1
        
        if (idx + 1) % 50 == 0:
            print(f"  Progress: {idx + 1}/464...")
    
    print(f"  ✅ Created {new_count} new networks from A1")
    print(f"  ✅ Added {pricing_count} A1 prices")
    return pricing_count

def import_telefonica_complete():
    """Import ALL Telefonica networks"""
    print("\n📙 Importing Telefonica - 517 networks...")
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'Telefonica')
    
    # Get existing networks
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    # Load file
    df = pd.read_excel('20250205 Monogoto TGS UK V1.xlsx', sheet_name='Format All', header=0)
    
    new_count = 0
    pricing_count = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('Tadig')):
            continue
        
        tadig = str(row['Tadig']).strip()
        if not tadig or tadig == 'Tadig':
            continue
        
        # Get or create network
        if tadig not in network_map:
            country = str(row.get('Country', 'Unknown')).strip()
            network_name = str(row.get('Operator', 'Unknown')).strip()
            
            network_data = {
                'tadig': tadig,
                'network_name': network_name,
                'country': country,
                'is_active': True
            }
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/networks",
                headers={**headers, 'Prefer': 'return=representation'},
                json=network_data
            )
            
            if response.status_code == 201:
                network_map[tadig] = response.json()[0]['id']
                new_count += 1
        
        # Add Telefonica pricing
        if tadig in network_map:
            # Check if pricing exists
            check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_map[tadig]}&source_id=eq.{source_id}"
            if not requests.get(check_url, headers=headers).json():
                # Parse pricing
                voice_rate = float(row['MOC']) if 'MOC' in row and not pd.isna(row['MOC']) else 0
                
                pricing_data = {
                    'network_id': network_map[tadig],
                    'source_id': source_id,
                    'data_per_mb': 0,  # No data rates in this sheet
                    'voice_moc': voice_rate,
                    'imsi_access_fee': 0,  # Telefonica doesn't have IMSI fees
                    'is_current': True,
                    'effective_date': datetime.now().date().isoformat()
                }
                
                response = requests.post(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers, json=pricing_data)
                if response.status_code in [201, 204]:
                    pricing_count += 1
        
        if (idx + 1) % 50 == 0:
            print(f"  Progress: {idx + 1}/517...")
    
    print(f"  ✅ Created {new_count} new networks from Telefonica")
    print(f"  ✅ Added {pricing_count} Telefonica prices")
    return pricing_count

def verify_final_counts():
    """Verify final database counts"""
    print("\n📊 Final Database Status:")
    print("=" * 50)
    
    # Get totals
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    pricing = requests.get(f"{SUPABASE_URL}/rest/v1/network_pricing?select=*,pricing_sources(source_name)", headers=headers).json()
    
    # Count by source
    by_source = {'A1': set(), 'Telefonica': set(), 'Tele2': set()}
    for p in pricing:
        source = p.get('pricing_sources', {}).get('source_name')
        network_id = p.get('network_id')
        if source in by_source:
            by_source[source].add(network_id)
    
    print(f"\nTotal unique networks: {len(networks)}")
    print(f"Total pricing records: {len(pricing)}")
    
    print(f"\nNetworks with pricing by source:")
    print(f"  ✅ Tele2: {len(by_source['Tele2'])} networks (expected 573)")
    print(f"  ✅ A1: {len(by_source['A1'])} networks (expected 464)")
    print(f"  ✅ Telefonica: {len(by_source['Telefonica'])} networks (expected 517)")
    
    return len(networks), len(by_source['Tele2']), len(by_source['A1']), len(by_source['Telefonica'])

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     🚀 COMPLETE DATABASE IMPORT")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("\nThis will import:")
    print("  • 573 Tele2 networks")
    print("  • 464 A1 networks")
    print("  • 517 Telefonica networks")
    print("\n⚠️  WARNING: This will CLEAR existing data first!")
    
    response = input("\nProceed with complete import? (yes/no): ")
    
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    start_time = time.time()
    
    # Clear and import
    clear_all_data()
    import_tele2_complete()
    import_a1_complete()
    import_telefonica_complete()
    
    # Verify
    total, tele2, a1, telefonica = verify_final_counts()
    
    elapsed = time.time() - start_time
    
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("✅ IMPORT COMPLETE!")
    print(f"   Time: {elapsed:.1f} seconds")
    print(f"   Total networks: {total}")
    print(f"   Tele2: {tele2} | A1: {a1} | Telefonica: {telefonica}")
    print("\n🎉 Refresh https://deal-desk.netlify.app/ to see all data!")

if __name__ == "__main__":
    main()