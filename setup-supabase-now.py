#!/usr/bin/env python3
"""
Complete Supabase Setup Script
Uses your database connection to set up and import all data
"""

import sys
import pandas as pd
import os
from datetime import datetime
import json
import warnings
import requests
warnings.filterwarnings('ignore')

# Your Supabase configuration
SUPABASE_PROJECT_ID = "uddmjjgnexdazfedrytt"
SUPABASE_URL = f"https://{SUPABASE_PROJECT_ID}.supabase.co"

print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("     🚀 DealDesk Complete Supabase Setup")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print()
print(f"Project URL: {SUPABASE_URL}")
print()

# Get the anon key
print("Please provide your Supabase Anon Key")
print("(Get it from: Supabase Dashboard → Settings → API → Anon Key)")
print()
SUPABASE_ANON_KEY = input("Enter Anon Key: ").strip()

if not SUPABASE_ANON_KEY:
    print("❌ Anon key is required!")
    sys.exit(1)

print()
print("✅ Configuration ready, starting setup...")
print()

# Save credentials
with open('.env.local', 'w') as f:
    f.write(f'SUPABASE_URL={SUPABASE_URL}\n')
    f.write(f'SUPABASE_ANON_KEY={SUPABASE_ANON_KEY}\n')
    f.write(f'SUPABASE_PROJECT_ID={SUPABASE_PROJECT_ID}\n')
    f.write('SUPABASE_SERVICE_KEY=sbp_ef7db518966275b30e542698d0d564b7e7916046\n')

def test_connection():
    """Test the connection to Supabase"""
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json'
    }
    
    print("📡 Testing connection to Supabase...")
    
    # Test with a simple query
    test_url = f"{SUPABASE_URL}/rest/v1/"
    response = requests.get(test_url, headers=headers)
    
    if response.status_code in [200, 404]:  # 404 is ok, means API is responding
        print("✅ Connected to Supabase successfully!")
        return True
    else:
        print(f"❌ Connection failed: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def check_schema():
    """Check if schema exists"""
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json'
    }
    
    print("\n📊 Checking database schema...")
    
    # Check if pricing_sources table exists
    test_url = f"{SUPABASE_URL}/rest/v1/pricing_sources"
    response = requests.get(test_url, headers=headers)
    
    if response.status_code == 200:
        sources = response.json()
        if len(sources) > 0:
            print(f"✅ Schema exists with {len(sources)} pricing sources")
            return True
        else:
            print("⚠️  Schema exists but no pricing sources found")
            return False
    else:
        print("❌ Schema not found or not accessible")
        print("\n📝 Please run this in your Supabase SQL Editor:")
        print("-" * 50)
        print("1. Go to: https://supabase.com/dashboard/project/uddmjjgnexdazfedrytt/sql")
        print("2. Click 'New Query'")
        print("3. Copy ALL content from: supabase-schema-fixed.sql")
        print("4. Paste and click 'Run'")
        print("-" * 50)
        return False

def import_data():
    """Import all pricing data"""
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    print("\n📥 Starting data import...")
    
    # Get source IDs
    sources_url = f"{SUPABASE_URL}/rest/v1/pricing_sources"
    sources_response = requests.get(sources_url, headers=headers)
    
    if sources_response.status_code != 200:
        print("❌ Could not fetch pricing sources")
        return False
    
    sources = sources_response.json()
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
            
            # Show progress
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
            
            # Parse IMSI/Access fee
            imsi_fee = 0
            if 'Access fee per IMSI, EUR/month' in row:
                val = row['Access fee per IMSI, EUR/month']
                if not pd.isna(val):
                    try:
                        imsi_fee = float(val)
                    except:
                        imsi_fee = 0
            
            # Special check for AUSTA
            if tadig == 'AUSTA' and imsi_fee > 0:
                print(f"  ✅ AUSTA (Telstra) Tele2 IMSI fee: €{imsi_fee} - {'CORRECT!' if imsi_fee == 0.5 else 'CHECK VALUE'}")
            
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
                'imsi_access_fee': imsi_fee,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Insert pricing
            pricing_url = f"{SUPABASE_URL}/rest/v1/network_pricing"
            pricing_response = requests.post(pricing_url, headers=headers, json=pricing_data)
            
            if pricing_response.status_code in [201, 204]:
                stats['tele2_prices'] += 1
        
        print(f"  ✅ Imported {stats['tele2_prices']} Tele2 prices")
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
            
            # Special check for AUSTA
            if tadig == 'AUSTA' and imsi_fee > 0:
                print(f"  ✅ AUSTA (Telstra) A1 IMSI fee: €{imsi_fee} - {'CORRECT!' if imsi_fee == 1.25 else 'CHECK VALUE'}")
            
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
                'imsi_access_fee': imsi_fee,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Insert pricing
            pricing_url = f"{SUPABASE_URL}/rest/v1/network_pricing"
            pricing_response = requests.post(pricing_url, headers=headers, json=pricing_data)
            
            if pricing_response.status_code in [201, 204]:
                stats['a1_prices'] += 1
        
        print(f"  ✅ Imported {stats['a1_prices']} A1 prices")
    else:
        print(f"  ⚠️  A1 file not found: {a1_file}")
    
    # Summary
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 Import Summary:")
    print(f"  Networks created: {stats['networks_created']}")
    print(f"  Tele2 prices imported: {stats['tele2_prices']}")
    print(f"  A1 prices imported: {stats['a1_prices']}")
    
    return True

def verify_data():
    """Verify the imported data"""
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json'
    }
    
    print("\n🔍 Verifying Australia pricing...")
    
    # Query for AUSTA
    austa_url = f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.AUSTA&select=*,network_pricing(*,pricing_sources(*))"
    austa_response = requests.get(austa_url, headers=headers)
    
    if austa_response.status_code == 200 and austa_response.json():
        austa_data = austa_response.json()[0]
        print(f"\nAUSTA (Telstra) pricing verification:")
        print("-" * 40)
        
        for pricing in austa_data.get('network_pricing', []):
            source = pricing.get('pricing_sources', {}).get('source_name', 'Unknown')
            imsi = pricing.get('imsi_access_fee', 0)
            data = pricing.get('data_per_mb', 0)
            
            status = ""
            if source == 'Tele2' and imsi == 0.5:
                status = "✅ CORRECT!"
            elif source == 'A1' and imsi == 1.25:
                status = "✅ CORRECT!"
            elif imsi > 0:
                status = "⚠️  CHECK VALUE"
            
            print(f"  {source:10} : IMSI €{imsi:6.2f}, Data ${data:8.6f}/MB {status}")
    else:
        print("  No AUSTA data found")

# Main execution
def main():
    # Test connection
    if not test_connection():
        print("\n❌ Could not connect to Supabase")
        print("Please check your credentials and try again")
        sys.exit(1)
    
    # Check schema
    if not check_schema():
        print("\n⚠️  Please create the schema first, then run this script again")
        sys.exit(1)
    
    # Import data
    print("\n" + "=" * 58)
    print("Would you like to import the pricing data now?")
    print("This will add all pricing from Excel files to Supabase")
    print("=" * 58)
    
    response = input("\nProceed with import? (y/n): ").strip().lower()
    
    if response == 'y':
        if import_data():
            verify_data()
            
            print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print("✅ Setup Complete!")
            print("\n🎉 Your Supabase database is ready!")
            print("\n📱 To use the web interface:")
            print(f"  1. Open: dealdesk-supabase.html")
            print(f"  2. Enter URL: {SUPABASE_URL}")
            print(f"  3. Enter Key: {SUPABASE_ANON_KEY[:20]}...")
            print(f"  4. Click Connect")
            print("\n💡 The credentials have been saved to .env.local")
    else:
        print("\nSkipping import. You can run this script again later.")
        print(f"\n📱 Your Supabase URL: {SUPABASE_URL}")
        print("Use this with dealdesk-supabase.html to connect")

if __name__ == "__main__":
    main()