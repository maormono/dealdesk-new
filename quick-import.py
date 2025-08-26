#!/usr/bin/env python3
"""
Quick import script with timeout handling
"""

import pandas as pd
import os
from datetime import datetime
import json
import warnings
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
warnings.filterwarnings('ignore')

# Your Supabase configuration
SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("     🚀 Quick Supabase Import")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print()

# Create session with retry logic
session = requests.Session()
retry = Retry(
    total=3,
    read=3,
    connect=3,
    backoff_factor=0.3,
    status_forcelist=(500, 502, 503, 504)
)
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)

# Headers for all requests
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def test_connection():
    """Test connection"""
    print("📡 Testing connection...")
    try:
        response = session.get(
            f"{SUPABASE_URL}/rest/v1/pricing_sources",
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            sources = response.json()
            print(f"✅ Connected! Found {len(sources)} pricing sources")
            return {s['source_name']: s['id'] for s in sources}
        else:
            print(f"❌ Connection failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return None

def import_tele2_data(source_ids):
    """Import Tele2 data from Invoice"""
    print("\n📄 Importing Tele2 (Invoice) data...")
    
    invoice_file = '0- Invoice Monogoto 2025-04.xlsx'
    if not os.path.exists(invoice_file):
        print(f"  ⚠️  File not found: {invoice_file}")
        return 0
    
    df = pd.read_excel(invoice_file, sheet_name='Pricelist 2024-11-01', header=0)
    source_id = source_ids.get('Tele2')
    
    count = 0
    network_map = {}
    
    # Just import a few key networks for testing
    test_networks = ['AUSTA', 'AUSOP', 'AUSVF', 'GBROR', 'USAVZ', 'DEUE2', 'FRAORC']
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        
        # For testing, only import specific networks
        if tadig not in test_networks:
            continue
        
        network_name = str(row.get('Network', '')).strip()
        country = str(row.get('Country', '')).strip()
        
        # Get or create network
        if tadig not in network_map:
            try:
                # Check if exists
                check_response = session.get(
                    f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}",
                    headers=headers,
                    timeout=5
                )
                
                if check_response.status_code == 200 and check_response.json():
                    network_id = check_response.json()[0]['id']
                else:
                    # Create network
                    network_data = {
                        'tadig': tadig,
                        'network_name': network_name,
                        'country': country,
                        'is_active': True
                    }
                    create_headers = {**headers, 'Prefer': 'return=representation'}
                    create_response = session.post(
                        f"{SUPABASE_URL}/rest/v1/networks",
                        headers=create_headers,
                        json=network_data,
                        timeout=5
                    )
                    
                    if create_response.status_code == 201:
                        network_id = create_response.json()[0]['id']
                    else:
                        continue
                
                network_map[tadig] = network_id
            except Exception as e:
                print(f"  ⚠️  Error with {tadig}: {e}")
                continue
        else:
            network_id = network_map[tadig]
        
        # Parse IMSI fee
        imsi_fee = 0
        if 'Access fee per IMSI, EUR/month' in row:
            val = row['Access fee per IMSI, EUR/month']
            if not pd.isna(val):
                try:
                    imsi_fee = float(val)
                except:
                    imsi_fee = 0
        
        # Special check for AUSTA
        if tadig == 'AUSTA':
            print(f"  → AUSTA Tele2 IMSI fee: €{imsi_fee}")
        
        # Get data rate
        data_rate = 0
        if 'Data/MB' in row and not pd.isna(row['Data/MB']):
            try:
                data_rate = float(row['Data/MB'])
            except:
                data_rate = 0
        
        # Insert pricing
        try:
            pricing_data = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': data_rate,
                'imsi_access_fee': imsi_fee,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            pricing_response = session.post(
                f"{SUPABASE_URL}/rest/v1/network_pricing",
                headers=headers,
                json=pricing_data,
                timeout=5
            )
            
            if pricing_response.status_code in [201, 204]:
                count += 1
                print(f"  ✅ Imported {tadig}: €{imsi_fee} IMSI, ${data_rate}/MB")
        except Exception as e:
            print(f"  ⚠️  Error inserting {tadig}: {e}")
    
    return count

def import_a1_data(source_ids):
    """Import A1 data"""
    print("\n📘 Importing A1 data...")
    
    a1_file = '202509_Country Price List A1 IMSI Sponsoring.xlsx'
    if not os.path.exists(a1_file):
        print(f"  ⚠️  File not found: {a1_file}")
        return 0
    
    df = pd.read_excel(a1_file, sheet_name='prices A1 WS', header=7)
    source_id = source_ids.get('A1')
    
    count = 0
    
    # Just import a few key networks for testing
    test_networks = ['AUSTA', 'AUSOP', 'AUSVF', 'GBROR', 'USAVZ', 'DEUE2', 'FRAORC']
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')) or pd.isna(row.iloc[0]):
            continue
        
        tadig = str(row['TADIG']).strip()
        
        # For testing, only import specific networks
        if tadig not in test_networks:
            continue
        
        # Check if network exists
        try:
            check_response = session.get(
                f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}",
                headers=headers,
                timeout=5
            )
            
            if check_response.status_code != 200 or not check_response.json():
                continue
            
            network_id = check_response.json()[0]['id']
            
            # Parse IMSI fee from General column
            imsi_fee = 0
            if 'General' in row:
                val = row['General']
                if not pd.isna(val):
                    try:
                        imsi_fee = float(val)
                    except:
                        imsi_fee = 0
            
            # Special check for AUSTA
            if tadig == 'AUSTA':
                print(f"  → AUSTA A1 IMSI fee: €{imsi_fee}")
            
            # Get data rate
            data_rate = 0
            if 'price/MB' in row and not pd.isna(row['price/MB']):
                try:
                    data_rate = float(row['price/MB'])
                except:
                    data_rate = 0
            
            # Insert pricing
            pricing_data = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': data_rate,
                'imsi_access_fee': imsi_fee,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            pricing_response = session.post(
                f"{SUPABASE_URL}/rest/v1/network_pricing",
                headers=headers,
                json=pricing_data,
                timeout=5
            )
            
            if pricing_response.status_code in [201, 204]:
                count += 1
                print(f"  ✅ Imported {tadig}: €{imsi_fee} IMSI, ${data_rate}/MB")
        except Exception as e:
            print(f"  ⚠️  Error with {tadig}: {e}")
    
    return count

def verify_austa():
    """Verify AUSTA pricing"""
    print("\n🔍 Verifying AUSTA pricing...")
    
    try:
        # Get AUSTA network
        response = session.get(
            f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.AUSTA&select=*,network_pricing(*,pricing_sources(*))",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200 and response.json():
            austa = response.json()[0]
            print(f"\nAUSTA (Telstra) pricing:")
            print("-" * 40)
            
            for pricing in austa.get('network_pricing', []):
                source = pricing.get('pricing_sources', {}).get('source_name', 'Unknown')
                imsi = pricing.get('imsi_access_fee', 0)
                data = pricing.get('data_per_mb', 0)
                
                status = ""
                if source == 'Tele2' and imsi == 0.5:
                    status = "✅ CORRECT!"
                elif source == 'A1' and imsi == 1.25:
                    status = "✅ CORRECT!"
                
                print(f"  {source:10} : IMSI €{imsi:6.2f}, Data ${data:8.6f}/MB {status}")
        else:
            print("  No AUSTA data found")
    except Exception as e:
        print(f"  Error verifying: {e}")

# Main execution
def main():
    # Test connection and get source IDs
    source_ids = test_connection()
    if not source_ids:
        print("\n❌ Could not connect to Supabase")
        print("Please check your connection and try again")
        return
    
    # Import data
    tele2_count = import_tele2_data(source_ids)
    a1_count = import_a1_data(source_ids)
    
    # Summary
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 Import Summary:")
    print(f"  Tele2 prices imported: {tele2_count}")
    print(f"  A1 prices imported: {a1_count}")
    
    # Verify
    verify_austa()
    
    print("\n✅ Import complete!")
    print("\n🌐 Open dealdesk-supabase.html and use these credentials:")
    print(f"  URL: {SUPABASE_URL}")
    print(f"  Key: {SUPABASE_KEY[:40]}...")

if __name__ == "__main__":
    main()