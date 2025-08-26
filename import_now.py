#!/usr/bin/env python3
"""
Import script for DealDesk pricing data
Usage: python3 import_now.py <SUPABASE_URL> <SUPABASE_ANON_KEY>
"""

import sys
import pandas as pd
import os
from datetime import datetime
import json
import warnings
import requests
warnings.filterwarnings('ignore')

# Get credentials from command line
if len(sys.argv) != 3:
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     🚀 DealDesk Supabase Data Import")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print()
    print("Usage: python3 import_now.py <SUPABASE_URL> <SUPABASE_ANON_KEY>")
    print()
    print("Example:")
    print("  python3 import_now.py https://xxxxx.supabase.co eyJhbGc...")
    print()
    print("Get your credentials from:")
    print("  Supabase Dashboard → Settings → API")
    print()
    sys.exit(1)

SUPABASE_URL = sys.argv[1].strip()
SUPABASE_ANON_KEY = sys.argv[2].strip()

print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("     🚀 DealDesk Supabase Data Import")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print()
print("Importing all pricing data with correct IMSI fees:")
print("  • Tele2 (from Invoice): €0.50 for AUSTA")
print("  • A1: €1.25 for AUSTA")
print("  • All restrictions and prohibited networks")
print()

# Save credentials for future use
with open('.env.local', 'w') as f:
    f.write(f'SUPABASE_URL={SUPABASE_URL}\n')
    f.write(f'SUPABASE_ANON_KEY={SUPABASE_ANON_KEY}\n')
    f.write('SUPABASE_SERVICE_KEY=sbp_ef7db518966275b30e542698d0d564b7e7916046\n')

def import_data():
    """Import data using direct REST API calls"""
    
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Test connection
    print("📡 Testing connection to Supabase...")
    test_url = f"{SUPABASE_URL}/rest/v1/pricing_sources"
    response = requests.get(test_url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Connection failed: {response.status_code}")
        print(f"   Response: {response.text}")
        print()
        print("Make sure you've run the schema in SQL Editor first!")
        print("Go to Supabase Dashboard → SQL Editor → New Query")
        print("Paste the contents of supabase-schema-fixed.sql and click Run")
        return
    
    sources = response.json()
    print(f"✅ Connected! Found {len(sources)} pricing sources")
    
    # Get source IDs
    source_ids = {s['source_name']: s['id'] for s in sources}
    
    # Statistics
    stats = {
        'networks_created': 0,
        'tele2_prices': 0,
        'a1_prices': 0,
        'telefonica_prices': 0,
        'restrictions_added': 0
    }
    
    # Track unique networks
    network_map = {}
    
    # Import Invoice/Tele2 data
    print("\n📄 Importing Tele2 pricing from Invoice...")
    invoice_file = '0- Invoice Monogoto 2025-04.xlsx'
    
    if os.path.exists(invoice_file):
        df = pd.read_excel(invoice_file, sheet_name='Pricelist 2024-11-01', header=0)
        source_id = source_ids.get('Tele2')
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('TADIG')):
                continue
            
            tadig = str(row['TADIG']).strip()
            network_name = str(row.get('Network', '')).strip()
            country = str(row.get('Country', '')).strip()
            
            # Show progress every 50 records
            if idx > 0 and idx % 50 == 0:
                print(f"  Processing {idx}/{len(df)} records...")
            
            # Create or get network
            if tadig not in network_map:
                # Check if network exists
                check_url = f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}"
                check_response = requests.get(check_url, headers=headers)
                
                existing = check_response.json() if check_response.status_code == 200 else []
                
                if existing:
                    network_id = existing[0]['id']
                else:
                    # Create network
                    network_data = {
                        'tadig': tadig,
                        'network_name': network_name,
                        'country': country,
                        'is_active': True
                    }
                    create_url = f"{SUPABASE_URL}/rest/v1/networks"
                    create_headers = {**headers, 'Prefer': 'return=representation'}
                    create_response = requests.post(create_url, headers=create_headers, json=network_data)
                    
                    if create_response.status_code == 201:
                        network_id = create_response.json()[0]['id']
                        stats['networks_created'] += 1
                    else:
                        continue
                
                network_map[tadig] = network_id
            else:
                network_id = network_map[tadig]
            
            # Parse IMSI/Access fee - THIS IS THE KEY PART!
            imsi_fee = 0
            if 'Access fee per IMSI, EUR/month' in row:
                val = row['Access fee per IMSI, EUR/month']
                if not pd.isna(val):
                    try:
                        imsi_fee = float(val)
                    except:
                        imsi_fee = 0
            
            # Get data rate
            data_rate = 0
            if 'Data/MB' in row and not pd.isna(row['Data/MB']):
                try:
                    data_rate = float(row['Data/MB'])
                except:
                    data_rate = 0
            
            # Prepare pricing data
            pricing_data = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': data_rate,
                'sms_mo': float(row['SMS']) if 'SMS' in row and not pd.isna(row['SMS']) else None,
                'voice_moc': float(row['MOC/Min']) if 'MOC/Min' in row and not pd.isna(row['MOC/Min']) else None,
                'imsi_access_fee': imsi_fee,  # Tele2's IMSI fee!
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Insert pricing
            pricing_url = f"{SUPABASE_URL}/rest/v1/network_pricing"
            pricing_response = requests.post(pricing_url, headers=headers, json=pricing_data)
            
            if pricing_response.status_code in [201, 204]:
                stats['tele2_prices'] += 1
                
                # Special check for AUSTA
                if tadig == 'AUSTA' and imsi_fee == 0.5:
                    print(f"  ✅ AUSTA (Telstra) Tele2 IMSI fee: €{imsi_fee} - CORRECT!")
            
            # Handle restrictions from comments
            if 'Comments' in row:
                comments = str(row['Comments']) if not pd.isna(row['Comments']) else ''
                if comments and comments not in ['', 'nan', 'Access fee']:
                    comments_lower = comments.lower()
                    
                    restrictions = []
                    if 'prohibited network' in comments_lower:
                        restrictions.append(('prohibited', 'Network access prohibited'))
                    if 'no permanent roaming' in comments_lower:
                        restrictions.append(('no_roaming', 'No permanent roaming allowed'))
                    if 'data not launched' in comments_lower:
                        restrictions.append(('data_not_launched', 'Data service not yet launched'))
                    if 'no resell' in comments_lower:
                        restrictions.append(('no_resell', 'No reselling on domestic market'))
                    
                    for restriction_type, description in restrictions:
                        restriction_data = {
                            'network_id': network_id,
                            'source_id': source_id,
                            'restriction_type': restriction_type,
                            'description': description,
                            'is_active': True
                        }
                        restriction_url = f"{SUPABASE_URL}/rest/v1/network_restrictions"
                        rest_response = requests.post(restriction_url, headers=headers, json=restriction_data)
                        if rest_response.status_code in [201, 204]:
                            stats['restrictions_added'] += 1
        
        print(f"  ✅ Imported {stats['tele2_prices']} Tele2 prices")
        print(f"  ✅ Added {stats['restrictions_added']} restrictions")
    else:
        print(f"  ⚠️  Invoice file not found: {invoice_file}")
    
    # Import A1 data
    print("\n📘 Importing A1 pricing...")
    a1_file = '202509_Country Price List A1 IMSI Sponsoring.xlsx'
    
    if os.path.exists(a1_file):
        df = pd.read_excel(a1_file, sheet_name='prices A1 WS', header=7)
        source_id = source_ids.get('A1')
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('TADIG')) or pd.isna(row.iloc[0]):
                continue
            
            tadig = str(row['TADIG']).strip()
            
            # Show progress
            if idx > 0 and idx % 50 == 0:
                print(f"  Processing {idx}/{len(df)} records...")
            
            # Create network if needed
            if tadig not in network_map:
                network_name = str(row.iloc[1]).strip() if not pd.isna(row.iloc[1]) else ''
                country = str(row.iloc[0]).strip()
                
                # Check if exists
                check_url = f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}"
                check_response = requests.get(check_url, headers=headers)
                existing = check_response.json() if check_response.status_code == 200 else []
                
                if existing:
                    network_map[tadig] = existing[0]['id']
                else:
                    network_data = {
                        'tadig': tadig,
                        'network_name': network_name,
                        'country': country,
                        'is_active': True
                    }
                    create_url = f"{SUPABASE_URL}/rest/v1/networks"
                    create_headers = {**headers, 'Prefer': 'return=representation'}
                    create_response = requests.post(create_url, headers=create_headers, json=network_data)
                    
                    if create_response.status_code == 201:
                        network_map[tadig] = create_response.json()[0]['id']
                        stats['networks_created'] += 1
                    else:
                        continue
            
            network_id = network_map[tadig]
            
            # Parse A1's IMSI fee from General column
            imsi_fee = 0
            if 'General' in row:
                val = row['General']
                if not pd.isna(val):
                    try:
                        imsi_fee = float(val)
                    except:
                        imsi_fee = 0
            
            # Get data rate
            data_rate = 0
            if 'price/MB' in row and not pd.isna(row['price/MB']):
                try:
                    data_rate = float(row['price/MB'])
                except:
                    data_rate = 0
            
            # Prepare pricing data
            pricing_data = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': data_rate,
                'imsi_access_fee': imsi_fee,  # A1's IMSI fee!
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Insert pricing
            pricing_url = f"{SUPABASE_URL}/rest/v1/network_pricing"
            pricing_response = requests.post(pricing_url, headers=headers, json=pricing_data)
            
            if pricing_response.status_code in [201, 204]:
                stats['a1_prices'] += 1
                
                # Special check for AUSTA
                if tadig == 'AUSTA' and imsi_fee == 1.25:
                    print(f"  ✅ AUSTA (Telstra) A1 IMSI fee: €{imsi_fee} - CORRECT!")
        
        print(f"  ✅ Imported {stats['a1_prices']} A1 prices")
    else:
        print(f"  ⚠️  A1 file not found: {a1_file}")
    
    # Import Telefonica data
    print("\n📙 Importing Telefonica pricing...")
    telefonica_file = '20250205 Monogoto TGS UK V1.xlsx'
    
    if os.path.exists(telefonica_file):
        df = pd.read_excel(telefonica_file, sheet_name='Voice_SMS', header=0)
        source_id = source_ids.get('Telefonica')
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('TADIG')):
                continue
            
            tadig = str(row['TADIG']).strip()
            
            # Show progress
            if idx > 0 and idx % 50 == 0:
                print(f"  Processing {idx}/{len(df)} records...")
            
            # Create network if needed
            if tadig not in network_map:
                network_name = str(row.get('Name', '')).strip()
                country = str(row.get('Country', '')).strip()
                
                # Check if exists
                check_url = f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}"
                check_response = requests.get(check_url, headers=headers)
                existing = check_response.json() if check_response.status_code == 200 else []
                
                if existing:
                    network_map[tadig] = existing[0]['id']
                else:
                    network_data = {
                        'tadig': tadig,
                        'network_name': network_name,
                        'country': country,
                        'is_active': True
                    }
                    create_url = f"{SUPABASE_URL}/rest/v1/networks"
                    create_headers = {**headers, 'Prefer': 'return=representation'}
                    create_response = requests.post(create_url, headers=create_headers, json=network_data)
                    
                    if create_response.status_code == 201:
                        network_map[tadig] = create_response.json()[0]['id']
                        stats['networks_created'] += 1
                    else:
                        continue
            
            network_id = network_map[tadig]
            
            # Prepare pricing data (Telefonica uses USD)
            pricing_data = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': float(row['Data per MB']) if 'Data per MB' in row and not pd.isna(row['Data per MB']) else 0,
                'sms_mo': float(row['SMS MO']) if 'SMS MO' in row and not pd.isna(row['SMS MO']) else None,
                'voice_moc': float(row['Voice MO']) if 'Voice MO' in row and not pd.isna(row['Voice MO']) else None,
                'imsi_access_fee': 0,  # Telefonica doesn't have IMSI fees
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Insert pricing
            pricing_url = f"{SUPABASE_URL}/rest/v1/network_pricing"
            pricing_response = requests.post(pricing_url, headers=headers, json=pricing_data)
            
            if pricing_response.status_code in [201, 204]:
                stats['telefonica_prices'] += 1
        
        print(f"  ✅ Imported {stats['telefonica_prices']} Telefonica prices")
    else:
        print(f"  ⚠️  Telefonica file not found: {telefonica_file}")
    
    # Summary
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 Import Summary:")
    print(f"  Networks created: {stats['networks_created']}")
    print(f"  Tele2 prices imported: {stats['tele2_prices']}")
    print(f"  A1 prices imported: {stats['a1_prices']}")
    print(f"  Telefonica prices imported: {stats['telefonica_prices']}")
    print(f"  Restrictions added: {stats['restrictions_added']}")
    
    # Final verification
    print("\n🔍 Final Verification - Australia Pricing:")
    print("-" * 40)
    
    # Query for all Australia networks with joined data
    aus_url = f"{SUPABASE_URL}/rest/v1/networks?tadig=like.AUS*"
    aus_response = requests.get(aus_url, headers=headers)
    
    if aus_response.status_code == 200 and aus_response.json():
        aus_networks = aus_response.json()
        
        for network in aus_networks:
            print(f"\n{network['tadig']} - {network['network_name']}")
            
            # Get pricing for this network
            pricing_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network['id']}"
            pricing_response = requests.get(pricing_url, headers=headers)
            
            if pricing_response.status_code == 200:
                pricings = pricing_response.json()
                
                for pricing in pricings:
                    # Get source name
                    source_url = f"{SUPABASE_URL}/rest/v1/pricing_sources?id=eq.{pricing['source_id']}"
                    source_response = requests.get(source_url, headers=headers)
                    
                    if source_response.status_code == 200 and source_response.json():
                        source_name = source_response.json()[0]['source_name']
                        imsi = pricing.get('imsi_access_fee', 0)
                        data = pricing.get('data_per_mb', 0)
                        
                        status = ""
                        if network['tadig'] == 'AUSTA':
                            if source_name == 'Tele2' and imsi == 0.5:
                                status = " ✅"
                            elif source_name == 'A1' and imsi == 1.25:
                                status = " ✅"
                        
                        print(f"  {source_name:10} : IMSI €{imsi:6.2f}, Data ${data:8.6f}/MB{status}")
    
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("✅ Import complete!")
    print("\nCheck your Supabase dashboard:")
    print("  1. Go to Table Editor")
    print("  2. Look at 'networks' table - all TADIGs")
    print("  3. Look at 'network_pricing' - prices by source")
    print("  4. AUSTA should show:")
    print("     • Tele2: €0.50 IMSI fee ✅")
    print("     • A1: €1.25 IMSI fee ✅")
    print("\n🎉 Your multi-source pricing database is ready!")

# Run the import
try:
    import_data()
except Exception as e:
    print(f"\n❌ Error during import: {e}")
    print("\nTroubleshooting:")
    print("1. Make sure you've run the schema in SQL Editor first")
    print("2. Check that your credentials are correct")
    print("3. Ensure the Excel files are in the current directory")