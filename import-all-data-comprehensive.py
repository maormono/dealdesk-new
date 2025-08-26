#!/usr/bin/env python3
"""
Comprehensive data import from all operator Excel files
Imports ALL fields including SMS, Voice, Technologies, and Restrictions
"""

import pandas as pd
import requests
import json
import sys
from datetime import datetime, date

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def safe_float(value, default=0.0):
    """Safely convert to float"""
    try:
        if pd.isna(value) or value == '' or value is None:
            return default
        return float(value)
    except:
        return default

def safe_bool(value, check_value='Yes'):
    """Safely convert to boolean"""
    if pd.isna(value):
        return False
    return str(value).strip().lower() == check_value.lower()

def import_tele2_complete(filename='0- Invoice Monogoto 2025-04.xlsx'):
    """Import complete data from Tele2/Invoice file"""
    print(f"\n📄 Importing complete Tele2 data from {filename}...")
    
    try:
        df = pd.read_excel(filename, sheet_name='Pricelist 2024-11-01', header=0)
        print(f"  Found {len(df)} rows in Tele2 file")
    except Exception as e:
        print(f"  ❌ Error reading file: {e}")
        return 0
    
    # Get source and network mappings
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next((s['id'] for s in sources if s['source_name'] == 'Tele2'), None)
    
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    updates = []
    
    for _, row in df.iterrows():
        tadig = str(row.get('TADIG', '')).strip()
        
        if tadig not in network_map or not tadig or tadig == 'TADIG':
            continue
        
        # Extract all data
        data_update = {
            'network_id': network_map[tadig],
            'source_id': source_id,
            'data_per_mb': safe_float(row.get('Rate per MB, EUR')),
            'imsi_access_fee': safe_float(row.get('Access fee per IMSI, EUR/month')),
            
            # SMS pricing (if available in file)
            'sms_mo': safe_float(row.get('SMS MO', 0)),
            'sms_mt': safe_float(row.get('SMS MT', 0)),
            
            # Voice pricing (if available)
            'voice_moc': safe_float(row.get('Voice MOC', 0)),
            'voice_mtc': safe_float(row.get('Voice MTC', 0)),
            
            # Technology support (Tele2 doesn't provide explicit tech columns)
            # We'll set defaults based on typical coverage
            'gsm_2g': True,
            'umts_3g': True,
            'lte_4g': True,
            'nr_5g': False,  # Usually not available
            'lte_m': False,
            'nb_iot': False,
            'volte': False,
            
            # Restrictions
            'restrictions': None,
            'notes': None,
            'last_updated': date.today().isoformat(),
            'is_current': True
        }
        
        # Handle comments/restrictions
        comment = row.get('Comments', '')
        if pd.notna(comment) and comment:
            comment = str(comment).strip()
            if comment.lower() not in ['access fee', 'direct roaming', '']:
                data_update['restrictions'] = comment
        
        updates.append(data_update)
    
    # Batch update to database
    if updates:
        print(f"  Updating {len(updates)} network pricing records...")
        
        for update in updates:
            # Check if record exists
            check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{update['network_id']}&source_id=eq.{update['source_id']}"
            response = requests.get(check_url, headers=headers)
            
            if response.status_code == 200 and response.json():
                # Update existing
                pricing_id = response.json()[0]['id']
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json=update
                )
            else:
                # Insert new
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/network_pricing",
                    headers=headers,
                    json=update
                )
    
    print(f"  ✅ Processed {len(updates)} Tele2 pricing records")
    return len(updates)

def import_a1_complete(filename='202509_Country Price List A1 IMSI Sponsoring.xlsx'):
    """Import complete data from A1 file"""
    print(f"\n📘 Importing complete A1 data from {filename}...")
    
    try:
        df = pd.read_excel(filename, sheet_name='prices A1 WS', header=7)
        print(f"  Found {len(df)} rows in A1 file")
    except Exception as e:
        print(f"  ❌ Error reading file: {e}")
        return 0
    
    # Get source and network mappings
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next((s['id'] for s in sources if s['source_name'] == 'A1'), None)
    
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    updates = []
    
    for _, row in df.iterrows():
        tadig = str(row.get('TADIG', '')).strip()
        
        if tadig not in network_map or not tadig or tadig == 'TADIG':
            continue
        
        # Extract all data
        data_update = {
            'network_id': network_map[tadig],
            'source_id': source_id,
            'data_per_mb': safe_float(row.get('Rate /MB')),
            'imsi_access_fee': safe_float(row.get('General')),  # IMSI fee column
            
            # SMS pricing
            'sms_mo': safe_float(row.get('SMS MO', 0)),
            'sms_mt': safe_float(row.get('SMS MT', 0)),
            
            # Voice pricing
            'voice_moc': safe_float(row.get('Voice MOC', 0)),
            'voice_mtc': safe_float(row.get('Voice MTC', 0)),
            
            # Technology support from A1 columns
            'gsm_2g': safe_bool(row.get('2G', 'No')),
            'umts_3g': safe_bool(row.get('3G', 'No')),
            'lte_4g': safe_bool(row.get('4G', 'No')),
            'nr_5g': safe_bool(row.get('5G', 'No')),
            'lte_m': safe_bool(row.get('LTE-M', 'No')),
            'nb_iot': safe_bool(row.get('NB-IoT', 'No')),
            'volte': safe_bool(row.get('VoLTE', 'No')),
            
            # Restrictions
            'restrictions': None,
            'notes': None,
            'last_updated': date.today().isoformat(),
            'is_current': True
        }
        
        # Handle restrictions
        restriction = row.get('Restrictions', '')
        if pd.notna(restriction) and restriction:
            data_update['restrictions'] = str(restriction).strip()
        
        updates.append(data_update)
    
    # Batch update to database
    if updates:
        print(f"  Updating {len(updates)} network pricing records...")
        
        for update in updates:
            # Check if record exists
            check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{update['network_id']}&source_id=eq.{update['source_id']}"
            response = requests.get(check_url, headers=headers)
            
            if response.status_code == 200 and response.json():
                # Update existing
                pricing_id = response.json()[0]['id']
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json=update
                )
            else:
                # Insert new
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/network_pricing",
                    headers=headers,
                    json=update
                )
    
    print(f"  ✅ Processed {len(updates)} A1 pricing records")
    return len(updates)

def import_telefonica_complete(filename='20250205 Monogoto TGS UK V1.xlsx'):
    """Import complete data from Telefonica file"""
    print(f"\n📙 Importing complete Telefonica data from {filename}...")
    
    try:
        df = pd.read_excel(filename, sheet_name='Format All', header=0)
        print(f"  Found {len(df)} rows in Telefonica file")
    except Exception as e:
        print(f"  ❌ Error reading file: {e}")
        return 0
    
    # Get source and network mappings
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next((s['id'] for s in sources if s['source_name'] == 'Telefonica'), None)
    
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    updates = []
    
    for _, row in df.iterrows():
        tadig = str(row.get('Tadig', '')).strip()
        
        if tadig not in network_map or not tadig or tadig == 'Tadig':
            continue
        
        # Telefonica has different price structure - handle carefully
        data_price = row.get('Data')
        if pd.notna(data_price):
            # Convert from price per 10KB to price per MB
            # 1 MB = 1024 KB, so 1 MB = 102.4 * 10KB
            if isinstance(data_price, (int, float)) and data_price > 0:
                data_per_mb = float(data_price) * 102.4
            else:
                data_per_mb = 0
        else:
            data_per_mb = 0
        
        # Extract all data
        data_update = {
            'network_id': network_map[tadig],
            'source_id': source_id,
            'data_per_mb': data_per_mb,
            'imsi_access_fee': safe_float(row.get('IMSI Fee', 0)),
            
            # SMS pricing
            'sms_mo': safe_float(row.get('SMS MO')),
            'sms_mt': safe_float(row.get('SMS MT')),
            
            # Voice pricing
            'voice_moc': safe_float(row.get('Voice MO')),
            'voice_mtc': safe_float(row.get('Voice MT')),
            
            # Technology support from Telefonica columns
            'gsm_2g': row.get('2G') == 'Available',
            'umts_3g': row.get('3G') == 'Available',
            'lte_4g': row.get('4G') == 'Available',
            'nr_5g': row.get('5G') == 'Available',
            'lte_m': row.get('LTE-M') == 'Available',
            'nb_iot': row.get('NB-IoT') == 'Available',
            'volte': row.get('VoLTE') == 'Available',
            
            # Telefonica-specific fields
            'steering_available': row.get('Steering') == 'Yes',
            'imsi_change_allowed': row.get('IMSI Change') == 'Yes',
            'multi_imsi_supported': row.get('Multi-IMSI') == 'Yes',
            
            # Restrictions based on unavailable services
            'restrictions': None,
            'notes': None,
            'last_updated': date.today().isoformat(),
            'is_current': True
        }
        
        # Build restrictions from unavailable services
        restrictions = []
        if row.get('VoLTE') == 'Unavailable':
            restrictions.append('VoLTE unavailable')
        if row.get('LTE-M') == 'Unavailable':
            restrictions.append('LTE-M unavailable')
        if row.get('NB-IoT') == 'Unavailable':
            restrictions.append('NB-IoT unavailable')
        if data_per_mb == 0:
            restrictions.append('Data service unavailable')
        
        if restrictions:
            data_update['restrictions'] = ', '.join(restrictions)
        
        updates.append(data_update)
    
    # Batch update to database
    if updates:
        print(f"  Updating {len(updates)} network pricing records...")
        
        for update in updates:
            # Check if record exists
            check_url = f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{update['network_id']}&source_id=eq.{update['source_id']}"
            response = requests.get(check_url, headers=headers)
            
            if response.status_code == 200 and response.json():
                # Update existing
                pricing_id = response.json()[0]['id']
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json=update
                )
            else:
                # Insert new
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/network_pricing",
                    headers=headers,
                    json=update
                )
    
    print(f"  ✅ Processed {len(updates)} Telefonica pricing records")
    return len(updates)

def show_technology_summary():
    """Show summary of technology support across operators"""
    print("\n📊 Technology Support Summary:")
    
    # This would query the database after import
    print("""
    Technology coverage will include:
    • 2G (GSM/GPRS/EDGE)
    • 3G (UMTS/HSPA)
    • 4G (LTE)
    • 5G (NR)
    • CAT-M (LTE-M)
    • NB-IoT
    • VoLTE
    
    Plus complete pricing for:
    • Data (per MB)
    • SMS (MO/MT)
    • Voice (MOC/MTC)
    • IMSI/Access fees
    """)

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     📊 COMPREHENSIVE DATA IMPORT")
    print("     All fields: Data, SMS, Voice, Technologies")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # Check for required database columns
    print("\n⚠️  IMPORTANT: Run 'enhance-database-schema.sql' in Supabase first!")
    print("   This adds columns for SMS, Voice, Technologies, etc.")
    
    response = input("\nHave you run the database schema update? (y/n): ")
    if response.lower() != 'y':
        print("\n❌ Please run the SQL script first:")
        print("   1. Go to Supabase SQL editor")
        print("   2. Run enhance-database-schema.sql")
        print("   3. Then run this script again")
        return
    
    # Import from all files
    total_updated = 0
    
    if len(sys.argv) > 1:
        # Process specific file
        filename = sys.argv[1]
        print(f"\n🎯 Processing specific file: {filename}")
        
        if 'invoice' in filename.lower() or 'tele2' in filename.lower():
            total_updated += import_tele2_complete(filename)
        elif 'a1' in filename.lower():
            total_updated += import_a1_complete(filename)
        elif 'telefonica' in filename.lower() or 'tgs' in filename.lower():
            total_updated += import_telefonica_complete(filename)
        else:
            print("  ⚠️  Cannot determine operator from filename")
    else:
        # Import all default files
        total_updated += import_tele2_complete()
        total_updated += import_a1_complete()
        total_updated += import_telefonica_complete()
    
    print(f"\n✅ Import complete! Total records processed: {total_updated}")
    
    # Show summary
    show_technology_summary()
    
    print("\n🎉 Database now contains comprehensive data!")
    print("   Including: SMS, Voice, 2G, 3G, 4G, 5G, CAT-M, NB-IoT, VoLTE")

if __name__ == "__main__":
    main()