#!/usr/bin/env python3
"""
Import missing networks to complete the dataset
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

def import_remaining_tele2():
    """Import missing Tele2 networks"""
    print("\n📄 Importing remaining Tele2 networks...")
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'Tele2')
    
    # Get existing networks
    existing = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    existing_tadigs = {n['tadig'] for n in existing}
    network_map = {n['tadig']: n['id'] for n in existing}
    
    # Load file
    df = pd.read_excel('0- Invoice Monogoto 2025-04.xlsx', sheet_name='Pricelist 2024-11-01', header=0)
    
    added_networks = 0
    added_pricing = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if not tadig or tadig == 'TADIG':
            continue
        
        # Create network if missing
        if tadig not in existing_tadigs:
            network_name = str(row.get('Network', 'Unknown')).strip()
            country = str(row.get('Country', 'Unknown')).strip()
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/networks",
                headers={**headers, 'Prefer': 'return=representation'},
                json={
                    'tadig': tadig,
                    'network_name': network_name,
                    'country': country,
                    'is_active': True
                }
            )
            
            if response.status_code == 201:
                network_map[tadig] = response.json()[0]['id']
                existing_tadigs.add(tadig)
                added_networks += 1
        
        # Add pricing if missing
        if tadig in network_map:
            check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_map[tadig]}&source_id=eq.{source_id}"
            if not requests.get(check_url, headers=headers).json():
                imsi_fee = 0
                if 'Access fee per IMSI, EUR/month' in row:
                    val = row['Access fee per IMSI, EUR/month']
                    if not pd.isna(val):
                        try:
                            imsi_fee = float(val)
                        except:
                            imsi_fee = 0
                
                data_rate = float(row['Data/MB']) if 'Data/MB' in row and not pd.isna(row['Data/MB']) else 0
                
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/network_pricing",
                    headers=headers,
                    json={
                        'network_id': network_map[tadig],
                        'source_id': source_id,
                        'data_per_mb': data_rate,
                        'imsi_access_fee': imsi_fee,
                        'is_current': True,
                        'effective_date': datetime.now().date().isoformat()
                    }
                )
                
                if response.status_code in [201, 204]:
                    added_pricing += 1
    
    print(f"  ✅ Added {added_networks} new Tele2 networks")
    print(f"  ✅ Added {added_pricing} Tele2 pricing records")
    return added_networks, added_pricing

def import_remaining_telefonica():
    """Import missing Telefonica networks"""
    print("\n📙 Importing remaining Telefonica networks...")
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'Telefonica')
    
    # Get existing networks
    existing = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    existing_tadigs = {n['tadig'] for n in existing}
    network_map = {n['tadig']: n['id'] for n in existing}
    
    # Load BOTH Telefonica sheets
    workbook = pd.ExcelFile('20250205 Monogoto TGS UK V1.xlsx')
    
    added_networks = 0
    added_pricing = 0
    
    # Process all sheets that might have data
    for sheet_name in workbook.sheet_names:
        if 'Format' in sheet_name or 'ALL' in sheet_name.upper():
            print(f"  Processing sheet: {sheet_name}")
            df = pd.read_excel(workbook, sheet_name=sheet_name, header=0)
            
            for idx, row in df.iterrows():
                # Try both 'Tadig' and 'TADIG' columns
                tadig = None
                if 'Tadig' in row and not pd.isna(row.get('Tadig')):
                    tadig = str(row['Tadig']).strip()
                elif 'TADIG' in row and not pd.isna(row.get('TADIG')):
                    tadig = str(row['TADIG']).strip()
                
                if not tadig or tadig in ['Tadig', 'TADIG']:
                    continue
                
                # Create network if missing
                if tadig not in existing_tadigs:
                    country = str(row.get('Country', 'Unknown')).strip()
                    network_name = str(row.get('Operator', row.get('Name', 'Unknown'))).strip()
                    
                    response = requests.post(
                        f"{SUPABASE_URL}/rest/v1/networks",
                        headers={**headers, 'Prefer': 'return=representation'},
                        json={
                            'tadig': tadig,
                            'network_name': network_name,
                            'country': country,
                            'is_active': True
                        }
                    )
                    
                    if response.status_code == 201:
                        network_map[tadig] = response.json()[0]['id']
                        existing_tadigs.add(tadig)
                        added_networks += 1
                
                # Add pricing if missing
                if tadig in network_map:
                    check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_map[tadig]}&source_id=eq.{source_id}"
                    if not requests.get(check_url, headers=headers).json():
                        # Parse different rate columns
                        voice_rate = 0
                        data_rate = 0
                        
                        if 'MOC' in row and not pd.isna(row['MOC']):
                            voice_rate = float(row['MOC'])
                        if 'DATA' in row and not pd.isna(row['DATA']):
                            data_rate = float(row['DATA'])
                        elif 'Data per MB' in row and not pd.isna(row['Data per MB']):
                            data_rate = float(row['Data per MB'])
                        
                        response = requests.post(
                            f"{SUPABASE_URL}/rest/v1/network_pricing",
                            headers=headers,
                            json={
                                'network_id': network_map[tadig],
                                'source_id': source_id,
                                'data_per_mb': data_rate,
                                'voice_moc': voice_rate,
                                'imsi_access_fee': 0,  # Telefonica doesn't have IMSI fees
                                'is_current': True,
                                'effective_date': datetime.now().date().isoformat()
                            }
                        )
                        
                        if response.status_code in [201, 204]:
                            added_pricing += 1
    
    print(f"  ✅ Added {added_networks} new Telefonica networks")
    print(f"  ✅ Added {added_pricing} Telefonica pricing records")
    return added_networks, added_pricing

def import_remaining_a1():
    """Import missing A1 networks"""
    print("\n📘 Importing remaining A1 networks...")
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'A1')
    
    # Get existing networks
    existing = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    existing_tadigs = {n['tadig'] for n in existing}
    network_map = {n['tadig']: n['id'] for n in existing}
    
    # Load file
    df = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)
    
    added_networks = 0
    added_pricing = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if not tadig or tadig == 'TADIG':
            continue
        
        # Create network if missing
        if tadig not in existing_tadigs:
            country = str(row.iloc[0]).strip() if not pd.isna(row.iloc[0]) else 'Unknown'
            network_name = str(row.iloc[1]).strip() if not pd.isna(row.iloc[1]) else 'Unknown'
            
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/networks",
                headers={**headers, 'Prefer': 'return=representation'},
                json={
                    'tadig': tadig,
                    'network_name': network_name,
                    'country': country,
                    'is_active': True
                }
            )
            
            if response.status_code == 201:
                network_map[tadig] = response.json()[0]['id']
                existing_tadigs.add(tadig)
                added_networks += 1
        
        # Add pricing if missing
        if tadig in network_map:
            check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_map[tadig]}&source_id=eq.{source_id}"
            if not requests.get(check_url, headers=headers).json():
                imsi_fee = float(row['General']) if 'General' in row and not pd.isna(row.get('General')) else 0
                data_rate = float(row['price/MB']) if 'price/MB' in row and not pd.isna(row.get('price/MB')) else 0
                
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/network_pricing",
                    headers=headers,
                    json={
                        'network_id': network_map[tadig],
                        'source_id': source_id,
                        'data_per_mb': data_rate,
                        'imsi_access_fee': imsi_fee,
                        'is_current': True,
                        'effective_date': datetime.now().date().isoformat()
                    }
                )
                
                if response.status_code in [201, 204]:
                    added_pricing += 1
    
    print(f"  ✅ Added {added_networks} new A1 networks")
    print(f"  ✅ Added {added_pricing} A1 pricing records")
    return added_networks, added_pricing

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     📊 Import Missing Data")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    start_time = time.time()
    
    # Import missing data from each source
    tele2_new, tele2_pricing = import_remaining_tele2()
    telefonica_new, telefonica_pricing = import_remaining_telefonica()
    a1_new, a1_pricing = import_remaining_a1()
    
    # Final count
    print("\n📊 Final Status:")
    pricing = requests.get(f"{SUPABASE_URL}/rest/v1/network_pricing?select=*,pricing_sources(source_name)", headers=headers).json()
    
    by_source = {}
    for p in pricing:
        source = p.get('pricing_sources', {}).get('source_name')
        if source:
            if source not in by_source:
                by_source[source] = set()
            by_source[source].add(p.get('network_id'))
    
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    
    print(f"  Total unique networks: {len(networks)}")
    for source in ['Tele2', 'A1', 'Telefonica']:
        count = len(by_source.get(source, set()))
        expected = {'Tele2': 573, 'A1': 464, 'Telefonica': 517}[source]
        status = "✅" if count >= expected - 10 else "⚠️"
        print(f"  {status} {source}: {count} networks (expected {expected})")
    
    elapsed = time.time() - start_time
    print(f"\n✅ Import completed in {elapsed:.1f} seconds")
    print("🎉 Refresh https://deal-desk.netlify.app/ to see updated data!")

if __name__ == "__main__":
    main()