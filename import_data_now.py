#!/usr/bin/env python3
"""
Direct import script - just update the credentials below and run!
"""

import pandas as pd
import os
from datetime import datetime
import json
import warnings
warnings.filterwarnings('ignore')

# ============================================
# UPDATE THESE WITH YOUR SUPABASE CREDENTIALS
# ============================================
SUPABASE_URL = "https://your-project.supabase.co"  # <- UPDATE THIS
SUPABASE_ANON_KEY = "your-anon-key-here"  # <- UPDATE THIS

# ============================================
# DON'T CHANGE ANYTHING BELOW THIS LINE
# ============================================

def import_without_supabase_library():
    """Import data using direct REST API calls"""
    import requests
    
    print("🚀 Starting Data Import (Direct Method)")
    print("=" * 50)
    
    # Check credentials
    if SUPABASE_URL == "https://your-project.supabase.co":
        print("❌ Please update SUPABASE_URL in this file first!")
        print("   Edit import_data_now.py and add your credentials")
        return
    
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Test connection
    print("\n📡 Testing connection to Supabase...")
    test_url = f"{SUPABASE_URL}/rest/v1/pricing_sources"
    response = requests.get(test_url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Connection failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return
    
    sources = response.json()
    print(f"✅ Connected! Found {len(sources)} pricing sources")
    
    # Get source IDs
    source_ids = {s['source_name']: s['id'] for s in sources}
    
    # Statistics
    stats = {
        'networks_created': 0,
        'prices_imported': 0,
        'restrictions_added': 0
    }
    
    # Import Invoice/Tele2 data
    print("\n📄 Importing Tele2 pricing from Invoice...")
    invoice_file = '0- Invoice Monogoto 2025-04.xlsx'
    
    if os.path.exists(invoice_file):
        df = pd.read_excel(invoice_file, sheet_name='Pricelist 2024-11-01', header=0)
        source_id = source_ids.get('Tele2')
        
        # Track unique networks
        network_map = {}
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('TADIG')):
                continue
            
            tadig = str(row['TADIG']).strip()
            network_name = str(row.get('Network', '')).strip()
            country = str(row.get('Country', '')).strip()
            
            # Create or get network
            if tadig not in network_map:
                # Check if network exists
                check_url = f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}"
                check_response = requests.get(check_url, headers=headers)
                
                if check_response.json():
                    network_id = check_response.json()[0]['id']
                else:
                    # Create network
                    network_data = {
                        'tadig': tadig,
                        'network_name': network_name,
                        'country': country
                    }
                    create_url = f"{SUPABASE_URL}/rest/v1/networks"
                    create_response = requests.post(create_url, headers={**headers, 'Prefer': 'return=representation'}, json=network_data)
                    
                    if create_response.status_code == 201:
                        network_id = create_response.json()[0]['id']
                        stats['networks_created'] += 1
                    else:
                        print(f"  ⚠️  Failed to create network {tadig}")
                        continue
                
                network_map[tadig] = network_id
            else:
                network_id = network_map[tadig]
            
            # Parse IMSI/Access fee
            imsi_fee = 0
            if not pd.isna(row.get('Access fee per IMSI, EUR/month')):
                try:
                    imsi_fee = float(row['Access fee per IMSI, EUR/month'])
                except:
                    imsi_fee = 0
            
            # Prepare pricing data
            pricing_data = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': float(row['Data/MB']) if not pd.isna(row.get('Data/MB')) else 0,
                'sms_mo': float(row['SMS']) if not pd.isna(row.get('SMS')) else 0,
                'voice_moc': float(row['MOC/Min']) if not pd.isna(row.get('MOC/Min')) else 0,
                'imsi_access_fee': imsi_fee,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Insert pricing
            pricing_url = f"{SUPABASE_URL}/rest/v1/network_pricing"
            pricing_response = requests.post(pricing_url, headers=headers, json=pricing_data)
            
            if pricing_response.status_code in [201, 204]:
                stats['prices_imported'] += 1
            
            # Handle restrictions from comments
            comments = str(row.get('Comments', '')) if not pd.isna(row.get('Comments')) else ''
            if comments and comments != 'Access fee':
                restrictions = []
                comments_lower = comments.lower()
                
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
        
        print(f"  ✅ Imported {stats['prices_imported']} Tele2 prices")
        print(f"  ✅ Added {stats['restrictions_added']} restrictions")
    else:
        print(f"  ⚠️  Invoice file not found: {invoice_file}")
    
    # Import A1 data
    print("\n📘 Importing A1 pricing...")
    a1_file = '202509_Country Price List A1 IMSI Sponsoring.xlsx'
    
    if os.path.exists(a1_file):
        df = pd.read_excel(a1_file, sheet_name='prices A1 WS', header=7)
        source_id = source_ids.get('A1')
        a1_count = 0
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('TADIG')) or pd.isna(row.iloc[0]):
                continue
            
            tadig = str(row['TADIG']).strip()
            
            # Skip if we don't have this network yet
            if tadig not in network_map:
                # Try to create it
                network_name = str(row.iloc[1]).strip() if not pd.isna(row.iloc[1]) else ''
                country = str(row.iloc[0]).strip()
                
                network_data = {
                    'tadig': tadig,
                    'network_name': network_name,
                    'country': country
                }
                create_url = f"{SUPABASE_URL}/rest/v1/networks"
                create_response = requests.post(create_url, headers={**headers, 'Prefer': 'return=representation'}, json=network_data)
                
                if create_response.status_code == 201:
                    network_map[tadig] = create_response.json()[0]['id']
                    stats['networks_created'] += 1
                else:
                    continue
            
            network_id = network_map[tadig]
            
            # Parse IMSI fee from General column
            imsi_fee = float(row['General']) if not pd.isna(row.get('General')) else 0
            
            # Prepare pricing data
            pricing_data = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': float(row['price/MB']) if not pd.isna(row.get('price/MB')) else 0,
                'imsi_access_fee': imsi_fee,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Insert pricing
            pricing_url = f"{SUPABASE_URL}/rest/v1/network_pricing"
            pricing_response = requests.post(pricing_url, headers=headers, json=pricing_data)
            
            if pricing_response.status_code in [201, 204]:
                a1_count += 1
        
        print(f"  ✅ Imported {a1_count} A1 prices")
    else:
        print(f"  ⚠️  A1 file not found: {a1_file}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Import Summary:")
    print(f"  Networks created: {stats['networks_created']}")
    print(f"  Total prices imported: {stats['prices_imported'] + a1_count}")
    print(f"  Restrictions added: {stats['restrictions_added']}")
    
    # Verify Australia pricing
    print("\n🔍 Verifying Australia pricing...")
    
    # Query for AUSTA
    austa_url = f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.AUSTA&select=*,network_pricing(*,pricing_sources(*))"
    austa_response = requests.get(austa_url, headers=headers)
    
    if austa_response.status_code == 200 and austa_response.json():
        austa_data = austa_response.json()[0]
        print(f"\nAUSTA (Telstra) pricing:")
        
        for pricing in austa_data.get('network_pricing', []):
            source = pricing.get('pricing_sources', {}).get('source_name', 'Unknown')
            imsi = pricing.get('imsi_access_fee', 0)
            data = pricing.get('data_per_mb', 0)
            
            status = ""
            if source == 'Tele2' and imsi == 0.5:
                status = "✅ CORRECT!"
            elif source == 'A1' and imsi == 1.25:
                status = "✅ CORRECT!"
            
            print(f"  {source}: IMSI €{imsi}, Data ${data}/MB {status}")
    
    print("\n✅ Import complete!")
    print("\nYou can now check your Supabase dashboard:")
    print("  1. Go to Table Editor")
    print("  2. Check 'networks' table for all TADIGs")
    print("  3. Check 'network_pricing' for prices by source")
    print("  4. AUSTA should show €0.50 for Tele2, €1.25 for A1")

# Try with library first, fallback to direct API
try:
    from supabase import create_client
    print("Using Supabase library...")
    
    # Create .env.local
    with open('.env.local', 'w') as f:
        f.write(f'SUPABASE_URL={SUPABASE_URL}\n')
        f.write(f'SUPABASE_ANON_KEY={SUPABASE_ANON_KEY}\n')
    
    # Run the original import
    import subprocess
    subprocess.run(['python3', 'supabase/import_to_supabase.py'])
except ImportError:
    print("Supabase library not found, using direct API method...")
    import_without_supabase_library()
except Exception as e:
    print(f"Error: {e}")
    print("Trying direct API method...")
    import_without_supabase_library()