#!/usr/bin/env python3
"""
Full import script - imports all networks from all sources
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
print("     🚀 Full Supabase Import - All Sources")
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

# Global network cache
network_cache = {}

def get_source_ids():
    """Get pricing source IDs"""
    response = session.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers, timeout=10)
    if response.status_code == 200:
        sources = response.json()
        return {s['source_name']: s['id'] for s in sources}
    return {}

def get_or_create_network(tadig, network_name, country):
    """Get or create a network"""
    if tadig in network_cache:
        return network_cache[tadig]
    
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
            'network_name': network_name or 'Unknown',
            'country': country or 'Unknown',
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
            return None
    
    network_cache[tadig] = network_id
    return network_id

def import_tele2_full(source_id):
    """Import all Tele2 data from Invoice"""
    print("\n📄 Importing Tele2 (Invoice) data...")
    
    invoice_file = '0- Invoice Monogoto 2025-04.xlsx'
    if not os.path.exists(invoice_file):
        print(f"  ⚠️  File not found: {invoice_file}")
        return 0
    
    df = pd.read_excel(invoice_file, sheet_name='Pricelist 2024-11-01', header=0)
    
    count = 0
    australia_networks = []
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        network_name = str(row.get('Network', '')).strip()
        country = str(row.get('Country', '')).strip()
        
        # Show progress
        if idx > 0 and idx % 50 == 0:
            print(f"  Processing {idx}/{len(df)} records...")
        
        # Track Australia networks
        if country == 'Australia':
            australia_networks.append(tadig)
        
        # Get or create network
        network_id = get_or_create_network(tadig, network_name, country)
        if not network_id:
            continue
        
        # Parse IMSI fee
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
        
        # Insert pricing
        try:
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
            
            pricing_response = session.post(
                f"{SUPABASE_URL}/rest/v1/network_pricing",
                headers=headers,
                json=pricing_data,
                timeout=5
            )
            
            if pricing_response.status_code in [201, 204]:
                count += 1
                # Special reporting for Australia
                if tadig in australia_networks:
                    print(f"  ✅ {tadig}: €{imsi_fee} IMSI, ${data_rate}/MB")
        except Exception as e:
            continue
    
    print(f"  Total imported: {count} networks")
    return count

def import_a1_full(source_id):
    """Import all A1 data"""
    print("\n📘 Importing A1 data...")
    
    a1_file = '202509_Country Price List A1 IMSI Sponsoring.xlsx'
    if not os.path.exists(a1_file):
        print(f"  ⚠️  File not found: {a1_file}")
        return 0
    
    df = pd.read_excel(a1_file, sheet_name='prices A1 WS', header=7)
    
    count = 0
    australia_networks = []
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')) or pd.isna(row.iloc[0]):
            continue
        
        tadig = str(row['TADIG']).strip()
        network_name = str(row.iloc[1]).strip() if not pd.isna(row.iloc[1]) else ''
        country = str(row.iloc[0]).strip()
        
        # Show progress
        if idx > 0 and idx % 50 == 0:
            print(f"  Processing {idx}/{len(df)} records...")
        
        # Track Australia networks
        if 'Australia' in country:
            australia_networks.append(tadig)
        
        # Get or create network
        network_id = get_or_create_network(tadig, network_name, country)
        if not network_id:
            continue
        
        # Parse IMSI fee from General column
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
                # Special reporting for Australia
                if tadig in australia_networks:
                    print(f"  ✅ {tadig}: €{imsi_fee} IMSI, ${data_rate}/MB")
        except Exception as e:
            continue
    
    print(f"  Total imported: {count} networks")
    return count

def import_telefonica_full(source_id):
    """Import all Telefonica data"""
    print("\n📙 Importing Telefonica data...")
    
    telefonica_file = '20250205 Monogoto TGS UK V1.xlsx'
    if not os.path.exists(telefonica_file):
        print(f"  ⚠️  File not found: {telefonica_file}")
        return 0
    
    df = pd.read_excel(telefonica_file, sheet_name='Voice_SMS', header=0)
    
    count = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        network_name = str(row.get('Name', '')).strip()
        country = str(row.get('Country', '')).strip()
        
        # Show progress
        if idx > 0 and idx % 50 == 0:
            print(f"  Processing {idx}/{len(df)} records...")
        
        # Get or create network
        network_id = get_or_create_network(tadig, network_name, country)
        if not network_id:
            continue
        
        # Telefonica doesn't have IMSI fees
        try:
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
            
            pricing_response = session.post(
                f"{SUPABASE_URL}/rest/v1/network_pricing",
                headers=headers,
                json=pricing_data,
                timeout=5
            )
            
            if pricing_response.status_code in [201, 204]:
                count += 1
        except Exception as e:
            continue
    
    print(f"  Total imported: {count} networks")
    return count

def verify_australia():
    """Verify Australia pricing"""
    print("\n🔍 Verifying Australia networks...")
    
    try:
        # Get all Australia networks
        response = session.get(
            f"{SUPABASE_URL}/rest/v1/networks?country=eq.Australia&select=*,network_pricing(*,pricing_sources(*))",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200 and response.json():
            networks = response.json()
            print(f"\nFound {len(networks)} Australia networks:")
            print("-" * 60)
            
            for network in networks:
                print(f"\n{network['tadig']} - {network['network_name']}")
                
                for pricing in network.get('network_pricing', []):
                    source = pricing.get('pricing_sources', {}).get('source_name', 'Unknown')
                    imsi = pricing.get('imsi_access_fee', 0)
                    data = pricing.get('data_per_mb', 0)
                    
                    status = ""
                    if network['tadig'] == 'AUSTA':
                        if source == 'Tele2' and imsi == 0.5:
                            status = " ✅ CORRECT!"
                        elif source == 'A1' and imsi == 1.25:
                            status = " ✅ CORRECT!"
                    
                    print(f"  {source:10} : IMSI €{imsi:6.2f}, Data ${data:8.6f}/MB{status}")
    except Exception as e:
        print(f"  Error verifying: {e}")

# Main execution
def main():
    print("📡 Connecting to Supabase...")
    
    # Get source IDs
    source_ids = get_source_ids()
    if not source_ids:
        print("❌ Could not get pricing sources")
        return
    
    print(f"✅ Found {len(source_ids)} pricing sources")
    
    # Import all data
    stats = {}
    
    if 'Tele2' in source_ids:
        stats['Tele2'] = import_tele2_full(source_ids['Tele2'])
    
    if 'A1' in source_ids:
        stats['A1'] = import_a1_full(source_ids['A1'])
    
    if 'Telefonica' in source_ids:
        stats['Telefonica'] = import_telefonica_full(source_ids['Telefonica'])
    
    # Summary
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 Import Summary:")
    for source, count in stats.items():
        print(f"  {source}: {count} prices imported")
    
    # Verify
    verify_australia()
    
    print("\n✅ Full import complete!")
    print("\n🌐 Your database is ready! Open dealdesk-supabase.html")
    print(f"  URL: {SUPABASE_URL}")
    print(f"  Key: {SUPABASE_KEY[:40]}...")

if __name__ == "__main__":
    main()