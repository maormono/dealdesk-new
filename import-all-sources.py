#!/usr/bin/env python3
"""
Import ALL networks from ALL sources - not just overlapping ones
"""

import pandas as pd
import requests
from datetime import datetime
import sys

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def get_or_create_network(tadig, name, country):
    """Get existing network or create new one"""
    # Check if exists
    check_url = f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}"
    check_response = requests.get(check_url, headers=headers)
    
    if check_response.status_code == 200 and check_response.json():
        return check_response.json()[0]['id']
    
    # Create new network
    network_data = {
        'tadig': tadig,
        'network_name': name or 'Unknown',
        'country': country or 'Unknown',
        'is_active': True
    }
    
    create_response = requests.post(
        f"{SUPABASE_URL}/rest/v1/networks",
        headers={**headers, 'Prefer': 'return=representation'},
        json=network_data
    )
    
    if create_response.status_code == 201:
        return create_response.json()[0]['id']
    
    return None

def import_all_a1():
    """Import ALL A1 networks"""
    print("\n📘 Importing ALL A1 networks...")
    
    # Get source ID
    sources_response = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers)
    source_id = next(s['id'] for s in sources_response.json() if s['source_name'] == 'A1')
    
    # Load A1 file
    df = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)
    
    count = 0
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if not tadig or tadig == 'TADIG':
            continue
        
        # Get or create network
        country = str(row.iloc[0]).strip() if not pd.isna(row.iloc[0]) else 'Unknown'
        network_name = str(row.iloc[1]).strip() if not pd.isna(row.iloc[1]) else 'Unknown'
        
        network_id = get_or_create_network(tadig, network_name, country)
        if not network_id:
            continue
        
        # Check if pricing exists
        check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}"
        if requests.get(check_url, headers=headers).json():
            continue
        
        # Parse pricing
        imsi_fee = float(row['General']) if 'General' in row and not pd.isna(row.get('General')) else 0
        data_rate = float(row['price/MB']) if 'price/MB' in row and not pd.isna(row.get('price/MB')) else 0
        
        # Insert pricing
        pricing_data = {
            'network_id': network_id,
            'source_id': source_id,
            'data_per_mb': data_rate,
            'imsi_access_fee': imsi_fee,
            'is_current': True,
            'effective_date': datetime.now().date().isoformat()
        }
        
        result = requests.post(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers, json=pricing_data)
        
        if result.status_code in [201, 204]:
            count += 1
            if count % 50 == 0:
                print(f"  Progress: {count} networks imported...")
    
    print(f"  ✅ Imported {count} A1 networks")
    return count

def import_all_telefonica():
    """Import ALL Telefonica networks"""
    print("\n📙 Importing ALL Telefonica networks...")
    
    # Get source ID
    sources_response = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers)
    source_id = next(s['id'] for s in sources_response.json() if s['source_name'] == 'Telefonica')
    
    # Load Telefonica file
    df = pd.read_excel('20250205 Monogoto TGS UK V1.xlsx', sheet_name='Format All', header=0)
    
    count = 0
    for idx, row in df.iterrows():
        if pd.isna(row.get('Tadig')):
            continue
        
        tadig = str(row['Tadig']).strip()
        if not tadig or tadig == 'Tadig':
            continue
        
        # Get or create network
        country = str(row.get('Country', 'Unknown')).strip()
        network_name = str(row.get('Operator', 'Unknown')).strip()
        
        network_id = get_or_create_network(tadig, network_name, country)
        if not network_id:
            continue
        
        # Check if pricing exists
        check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}"
        if requests.get(check_url, headers=headers).json():
            continue
        
        # Parse pricing (Telefonica has voice rates, no IMSI fees)
        voice_rate = float(row['MOC']) if 'MOC' in row and not pd.isna(row['MOC']) else 0
        
        # Insert pricing
        pricing_data = {
            'network_id': network_id,
            'source_id': source_id,
            'data_per_mb': 0,  # Telefonica doesn't have data rates in this sheet
            'voice_moc': voice_rate,
            'imsi_access_fee': 0,  # Telefonica doesn't have IMSI fees
            'is_current': True,
            'effective_date': datetime.now().date().isoformat()
        }
        
        result = requests.post(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers, json=pricing_data)
        
        if result.status_code in [201, 204]:
            count += 1
            if count % 50 == 0:
                print(f"  Progress: {count} networks imported...")
    
    print(f"  ✅ Imported {count} Telefonica networks")
    return count

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     📊 Complete Multi-Source Import")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    if len(sys.argv) > 1:
        if sys.argv[1] == 'a1':
            import_all_a1()
        elif sys.argv[1] == 'telefonica':
            import_all_telefonica()
        else:
            print("Usage: python3 import-all-sources.py [a1|telefonica]")
    else:
        # Import both
        a1_count = import_all_a1()
        tel_count = import_all_telefonica()
        
        print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("📊 Import Complete!")
        print(f"  A1: {a1_count} networks")
        print(f"  Telefonica: {tel_count} networks")
        print("\n✅ Refresh your browser to see ALL networks from ALL sources!")

if __name__ == "__main__":
    main()