#!/usr/bin/env python3
"""
Batch import - processes in smaller chunks to avoid timeouts
"""

import pandas as pd
import os
from datetime import datetime
import requests
import sys

# Your Supabase configuration
SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def get_source_ids():
    """Get pricing source IDs"""
    response = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers, timeout=10)
    if response.status_code == 200:
        sources = response.json()
        return {s['source_name']: s['id'] for s in sources}
    return {}

def batch_import_a1():
    """Import A1 data in batches"""
    print("\n📘 Importing A1 pricing...")
    
    a1_file = '202509_Country Price List A1 IMSI Sponsoring.xlsx'
    if not os.path.exists(a1_file):
        print(f"  ⚠️  File not found: {a1_file}")
        return
    
    source_ids = get_source_ids()
    source_id = source_ids.get('A1')
    
    df = pd.read_excel(a1_file, sheet_name='prices A1 WS', header=7)
    
    # Process only Australia networks for now
    batch_size = 10
    count = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')) or pd.isna(row.iloc[0]):
            continue
        
        tadig = str(row['TADIG']).strip()
        country = str(row.iloc[0]).strip()
        
        # Focus on key countries
        if not any(c in country for c in ['Australia', 'United Kingdom', 'Germany', 'France', 'United States']):
            continue
        
        network_name = str(row.iloc[1]).strip() if not pd.isna(row.iloc[1]) else ''
        
        # Check if network exists
        check_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}",
            headers=headers,
            timeout=5
        )
        
        if check_response.status_code == 200:
            existing = check_response.json()
            
            if not existing:
                # Create network
                network_data = {
                    'tadig': tadig,
                    'network_name': network_name,
                    'country': country,
                    'is_active': True
                }
                create_response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/networks",
                    headers={**headers, 'Prefer': 'return=representation'},
                    json=network_data,
                    timeout=5
                )
                
                if create_response.status_code != 201:
                    continue
                
                network_id = create_response.json()[0]['id']
            else:
                network_id = existing[0]['id']
            
            # Parse IMSI fee
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
            pricing_data = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': data_rate,
                'imsi_access_fee': imsi_fee,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            pricing_response = requests.post(
                f"{SUPABASE_URL}/rest/v1/network_pricing",
                headers=headers,
                json=pricing_data,
                timeout=5
            )
            
            if pricing_response.status_code in [201, 204]:
                count += 1
                if 'Australia' in country:
                    print(f"  ✅ {tadig}: €{imsi_fee} IMSI fee")
        
        if count >= batch_size:
            print(f"  Batch complete: {count} records imported")
            break
    
    print(f"  Total A1 records imported: {count}")

def batch_import_telefonica():
    """Import Telefonica data in batches"""
    print("\n📙 Importing Telefonica pricing...")
    
    telefonica_file = '20250205 Monogoto TGS UK V1.xlsx'
    if not os.path.exists(telefonica_file):
        print(f"  ⚠️  File not found: {telefonica_file}")
        return
    
    source_ids = get_source_ids()
    source_id = source_ids.get('Telefonica')
    
    df = pd.read_excel(telefonica_file, sheet_name='Voice_SMS', header=0)
    
    batch_size = 10
    count = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        country = str(row.get('Country', '')).strip()
        
        # Focus on key countries
        if not any(c in country for c in ['Australia', 'United Kingdom', 'Germany', 'France', 'United States']):
            continue
        
        network_name = str(row.get('Name', '')).strip()
        
        # Check if network exists
        check_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}",
            headers=headers,
            timeout=5
        )
        
        if check_response.status_code == 200:
            existing = check_response.json()
            
            if existing:
                network_id = existing[0]['id']
                
                # Insert Telefonica pricing
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
                
                pricing_response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/network_pricing",
                    headers=headers,
                    json=pricing_data,
                    timeout=5
                )
                
                if pricing_response.status_code in [201, 204]:
                    count += 1
                    if 'Australia' in country:
                        print(f"  ✅ {tadig}: ${pricing_data['data_per_mb']}/MB")
        
        if count >= batch_size:
            print(f"  Batch complete: {count} records imported")
            break
    
    print(f"  Total Telefonica records imported: {count}")

def verify_multi_source():
    """Verify we have multi-source pricing"""
    print("\n🔍 Verifying multi-source pricing...")
    
    # Check AUSTA
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.AUSTA&select=*,network_pricing(*,pricing_sources(*))",
        headers=headers,
        timeout=10
    )
    
    if response.status_code == 200 and response.json():
        network = response.json()[0]
        print(f"\nAUSTA (Telstra) - Multi-source pricing:")
        print("-" * 40)
        
        sources_found = set()
        for pricing in network.get('network_pricing', []):
            source = pricing.get('pricing_sources', {}).get('source_name', 'Unknown')
            sources_found.add(source)
            imsi = pricing.get('imsi_access_fee', 0)
            data = pricing.get('data_per_mb', 0)
            
            status = ""
            if source == 'Tele2' and imsi == 0.5:
                status = " ✅"
            elif source == 'A1' and imsi == 1.25:
                status = " ✅"
            
            print(f"  {source:10} : IMSI €{imsi:6.2f}, Data ${data:8.6f}/MB{status}")
        
        print(f"\n  Sources available: {', '.join(sources_found)}")

if __name__ == "__main__":
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     📦 Batch Import - Key Networks Only")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    if len(sys.argv) > 1:
        if sys.argv[1] == 'a1':
            batch_import_a1()
        elif sys.argv[1] == 'telefonica':
            batch_import_telefonica()
        elif sys.argv[1] == 'verify':
            verify_multi_source()
    else:
        print("\nUsage:")
        print("  python3 batch-import.py a1         # Import A1 data")
        print("  python3 batch-import.py telefonica # Import Telefonica data")
        print("  python3 batch-import.py verify     # Verify multi-source pricing")
        print("\nRun each command separately to import data in batches")