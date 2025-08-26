#!/usr/bin/env python3
"""
Add only missing networks - faster approach
"""

import pandas as pd
import requests
from datetime import datetime

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

print("📊 Adding missing networks from A1 and Telefonica...")

# Get existing networks
existing = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
existing_tadigs = {n['tadig'] for n in existing}
network_map = {n['tadig']: n['id'] for n in existing}

# Get source IDs
sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
source_ids = {s['source_name']: s['id'] for s in sources}

print(f"Current networks in database: {len(existing_tadigs)}")

# Process A1 file
print("\n📘 Processing A1 file...")
df_a1 = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)

a1_new = 0
a1_pricing = 0

for idx, row in df_a1.iterrows():
    if pd.isna(row.get('TADIG')):
        continue
    
    tadig = str(row['TADIG']).strip()
    if not tadig or tadig == 'TADIG':
        continue
    
    # Create network if missing
    if tadig not in existing_tadigs:
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
            network_id = response.json()[0]['id']
            network_map[tadig] = network_id
            existing_tadigs.add(tadig)
            a1_new += 1
    
    # Add A1 pricing if network exists
    if tadig in network_map:
        # Check if A1 pricing exists
        check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_map[tadig]}&source_id=eq.{source_ids['A1']}"
        if not requests.get(check_url, headers=headers).json():
            imsi_fee = float(row['General']) if 'General' in row and not pd.isna(row.get('General')) else 0
            data_rate = float(row['price/MB']) if 'price/MB' in row and not pd.isna(row.get('price/MB')) else 0
            
            pricing_data = {
                'network_id': network_map[tadig],
                'source_id': source_ids['A1'],
                'data_per_mb': data_rate,
                'imsi_access_fee': imsi_fee,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            response = requests.post(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers, json=pricing_data)
            if response.status_code in [201, 204]:
                a1_pricing += 1

print(f"  ✅ Created {a1_new} new networks from A1")
print(f"  ✅ Added {a1_pricing} A1 pricing records")

# Process Telefonica file
print("\n📙 Processing Telefonica file...")
df_tel = pd.read_excel('20250205 Monogoto TGS UK V1.xlsx', sheet_name='Format All', header=0)

tel_new = 0
tel_pricing = 0

for idx, row in df_tel.iterrows():
    if pd.isna(row.get('Tadig')):
        continue
    
    tadig = str(row['Tadig']).strip()
    if not tadig or tadig == 'Tadig':
        continue
    
    # Create network if missing
    if tadig not in existing_tadigs:
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
            network_id = response.json()[0]['id']
            network_map[tadig] = network_id
            existing_tadigs.add(tadig)
            tel_new += 1
    
    # Add Telefonica pricing if network exists
    if tadig in network_map:
        # Check if Telefonica pricing exists
        check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_map[tadig]}&source_id=eq.{source_ids['Telefonica']}"
        if not requests.get(check_url, headers=headers).json():
            voice_rate = float(row['MOC']) if 'MOC' in row and not pd.isna(row['MOC']) else 0
            
            pricing_data = {
                'network_id': network_map[tadig],
                'source_id': source_ids['Telefonica'],
                'data_per_mb': 0,
                'voice_moc': voice_rate,
                'imsi_access_fee': 0,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            response = requests.post(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers, json=pricing_data)
            if response.status_code in [201, 204]:
                tel_pricing += 1

print(f"  ✅ Created {tel_new} new networks from Telefonica")
print(f"  ✅ Added {tel_pricing} Telefonica pricing records")

# Final count
print("\n📊 Final Status:")
networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
pricing = requests.get(f"{SUPABASE_URL}/rest/v1/network_pricing?select=*,pricing_sources(source_name)", headers=headers).json()

by_source = {'A1': set(), 'Telefonica': set(), 'Tele2': set()}
for p in pricing:
    source = p.get('pricing_sources', {}).get('source_name')
    network_id = p.get('network_id')
    if source in by_source:
        by_source[source].add(network_id)

print(f"  Total networks: {len(networks)}")
print(f"  Tele2: {len(by_source['Tele2'])} networks")
print(f"  A1: {len(by_source['A1'])} networks")
print(f"  Telefonica: {len(by_source['Telefonica'])} networks")

print("\n✅ Done! Refresh https://deal-desk.netlify.app/ to see updated counts")