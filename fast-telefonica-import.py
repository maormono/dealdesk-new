#!/usr/bin/env python3
"""
Fast import for Telefonica data - looking for all 517 networks
"""

import pandas as pd
import requests
from datetime import datetime

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

print("🔍 Analyzing Telefonica Excel file for all networks...")

# Load the Excel file and check all sheets
workbook = pd.ExcelFile('20250205 Monogoto TGS UK V1.xlsx')
print(f"\nFound sheets: {workbook.sheet_names}")

all_tadigs = set()
sheet_data = {}

# Process ALL sheets to find all TADIGs
for sheet_name in workbook.sheet_names:
    print(f"\n📄 Processing sheet: {sheet_name}")
    try:
        # Try reading with different header rows
        for header_row in [0, 1, 2, None]:
            try:
                if header_row is not None:
                    df = pd.read_excel(workbook, sheet_name=sheet_name, header=header_row)
                else:
                    df = pd.read_excel(workbook, sheet_name=sheet_name, header=None)
                
                # Look for TADIG columns
                tadig_col = None
                for col in df.columns:
                    if isinstance(col, str) and 'TADIG' in col.upper():
                        tadig_col = col
                        break
                    elif isinstance(col, str) and col.upper() == 'TADIG':
                        tadig_col = col
                        break
                
                if not tadig_col:
                    # Try searching in first few rows
                    for idx in range(min(5, len(df))):
                        for col in df.columns:
                            val = df.iloc[idx][col]
                            if isinstance(val, str) and val.upper() in ['TADIG', 'TADIG CODE']:
                                # Found header row, re-read with correct header
                                df = pd.read_excel(workbook, sheet_name=sheet_name, header=idx)
                                tadig_col = 'Tadig' if 'Tadig' in df.columns else 'TADIG'
                                break
                
                if tadig_col or 'Tadig' in df.columns or 'TADIG' in df.columns:
                    # Found TADIG column
                    tadig_col = tadig_col or ('Tadig' if 'Tadig' in df.columns else 'TADIG')
                    
                    tadigs_in_sheet = []
                    for idx, row in df.iterrows():
                        if tadig_col in row:
                            tadig = str(row[tadig_col]).strip() if not pd.isna(row[tadig_col]) else None
                            if tadig and tadig not in ['TADIG', 'Tadig', 'nan', ''] and len(tadig) > 3:
                                tadigs_in_sheet.append(tadig)
                                all_tadigs.add(tadig)
                    
                    if tadigs_in_sheet:
                        sheet_data[sheet_name] = {
                            'df': df,
                            'tadig_col': tadig_col,
                            'count': len(tadigs_in_sheet)
                        }
                        print(f"  ✅ Found {len(tadigs_in_sheet)} TADIGs in {sheet_name}")
                        break
                        
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"  ⚠️ Could not process {sheet_name}: {e}")

print(f"\n📊 Total unique TADIGs found across all sheets: {len(all_tadigs)}")

# Use the sheet with most TADIGs
best_sheet = max(sheet_data.items(), key=lambda x: x[1]['count']) if sheet_data else None

if best_sheet:
    sheet_name = best_sheet[0]
    df = best_sheet[1]['df']
    tadig_col = best_sheet[1]['tadig_col']
    
    print(f"\n✨ Using sheet '{sheet_name}' with {best_sheet[1]['count']} networks")
    
    # Get source ID
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'Telefonica')
    
    # Get existing networks
    existing = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    existing_tadigs = {n['tadig'] for n in existing}
    network_map = {n['tadig']: n['id'] for n in existing}
    
    # Process in batches
    networks_batch = []
    pricing_batch = []
    
    for idx, row in df.iterrows():
        tadig = str(row[tadig_col]).strip() if not pd.isna(row[tadig_col]) else None
        if not tadig or tadig in ['TADIG', 'Tadig', 'nan', ''] or len(tadig) <= 3:
            continue
        
        # Get other fields
        country = None
        network_name = None
        voice_rate = 0
        data_rate = 0
        
        # Find country and network name
        for col in df.columns:
            col_str = str(col).upper()
            if 'COUNTRY' in col_str and not pd.isna(row[col]):
                country = str(row[col]).strip()
            elif ('OPERATOR' in col_str or 'NETWORK' in col_str or 'NAME' in col_str) and not pd.isna(row[col]):
                network_name = str(row[col]).strip()
            elif 'MOC' in col_str and not pd.isna(row[col]):
                try:
                    voice_rate = float(row[col])
                except:
                    pass
            elif 'DATA' in col_str and not pd.isna(row[col]):
                try:
                    data_rate = float(row[col])
                except:
                    pass
        
        # Create network if missing
        if tadig not in existing_tadigs:
            networks_batch.append({
                'tadig': tadig,
                'network_name': network_name or 'Unknown',
                'country': country or 'Unknown',
                'is_active': True
            })
            
            if len(networks_batch) >= 50:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/networks",
                    headers={**headers, 'Prefer': 'return=representation'},
                    json=networks_batch
                )
                if response.status_code == 201:
                    for net in response.json():
                        network_map[net['tadig']] = net['id']
                        existing_tadigs.add(net['tadig'])
                networks_batch = []
        
        # Add pricing
        if tadig in network_map or tadig in existing_tadigs:
            net_id = network_map.get(tadig)
            if not net_id:
                # Get network ID
                check = requests.get(f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{tadig}", headers=headers).json()
                if check:
                    net_id = check[0]['id']
                    network_map[tadig] = net_id
            
            if net_id:
                pricing_batch.append({
                    'network_id': net_id,
                    'source_id': source_id,
                    'data_per_mb': data_rate,
                    'voice_moc': voice_rate,
                    'imsi_access_fee': 0,
                    'is_current': True,
                    'effective_date': datetime.now().date().isoformat()
                })
                
                if len(pricing_batch) >= 50:
                    # Delete existing pricing first
                    for p in pricing_batch:
                        requests.delete(
                            f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{p['network_id']}&source_id=eq.{source_id}",
                            headers=headers
                        )
                    
                    # Insert new pricing
                    response = requests.post(
                        f"{SUPABASE_URL}/rest/v1/network_pricing",
                        headers=headers,
                        json=pricing_batch
                    )
                    pricing_batch = []
    
    # Insert remaining batches
    if networks_batch:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/networks",
            headers={**headers, 'Prefer': 'return=representation'},
            json=networks_batch
        )
    
    if pricing_batch:
        # Delete existing pricing first
        for p in pricing_batch:
            requests.delete(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{p['network_id']}&source_id=eq.{source_id}",
                headers=headers
            )
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/network_pricing",
            headers=headers,
            json=pricing_batch
        )

# Final count
print("\n📊 Checking final counts...")
pricing = requests.get(f"{SUPABASE_URL}/rest/v1/network_pricing?select=*,pricing_sources(source_name)", headers=headers).json()

by_source = {}
for p in pricing:
    source = p.get('pricing_sources', {}).get('source_name')
    if source:
        if source not in by_source:
            by_source[source] = set()
        by_source[source].add(p.get('network_id'))

print("\nFinal network counts by source:")
for source in ['Tele2', 'A1', 'Telefonica']:
    count = len(by_source.get(source, set()))
    print(f"  {source}: {count} networks")

print("\n✅ Import complete! Refresh https://deal-desk.netlify.app/")