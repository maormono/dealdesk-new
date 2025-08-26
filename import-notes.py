#!/usr/bin/env python3
"""
Import notes/restrictions from all operator files
Categorizes and stores them for display
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

def categorize_note(note_text):
    """Categorize notes into standard categories"""
    if not note_text:
        return None, None
    
    note_lower = str(note_text).lower().strip()
    
    # Define categories and patterns
    if 'no permanent roaming' in note_lower or 'permanent roaming' in note_lower:
        return 'no-permanent-roaming', note_text
    elif 'access fee' in note_lower:
        return 'access-fee', 'Has access fee'
    elif 'data not launched' in note_lower or 'data unavailable' in note_lower:
        return 'data-unavailable', 'Data service not available'
    elif 'prohibited' in note_lower or 'blocked' in note_lower:
        return 'prohibited', note_text
    elif 'no resell' in note_lower or 'no resale' in note_lower:
        return 'no-resale', note_text
    elif 'services not available' in note_lower or 'service not available' in note_lower:
        return 'service-limited', 'Services not available'
    elif 'direct roaming' in note_lower:
        return 'direct-roaming', 'Direct roaming'
    elif note_text in ['X', 'XX']:
        # A1 specific restrictions
        if note_text == 'X':
            return 'restricted', 'Restricted network'
        else:
            return 'highly-restricted', 'Highly restricted network'
    else:
        return 'other', note_text

def import_tele2_notes():
    """Import notes from Tele2 invoice file"""
    print("\n📄 Importing Tele2 notes...")
    
    df = pd.read_excel('0- Invoice Monogoto 2025-04.xlsx', sheet_name='Pricelist 2024-11-01', header=0)
    
    # Get network IDs and source ID
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'Tele2')
    
    notes_data = {}
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if tadig not in network_map or tadig == 'TADIG':
            continue
        
        # Check for comments
        comment = row.get('Comments')
        if not pd.isna(comment):
            category, note = categorize_note(comment)
            if category:
                notes_data[tadig] = {
                    'category': category,
                    'note': note,
                    'original': str(comment)
                }
        
        # Also flag if has access fee
        if 'Access fee per IMSI, EUR/month' in row:
            fee = row['Access fee per IMSI, EUR/month']
            if not pd.isna(fee) and float(fee) > 0:
                if tadig not in notes_data:
                    notes_data[tadig] = {
                        'category': 'access-fee',
                        'note': f'Access fee: €{float(fee):.2f}/month',
                        'original': 'Has IMSI access fee'
                    }
    
    print(f"  Found notes for {len(notes_data)} networks")
    return notes_data, source_id

def import_a1_notes():
    """Import notes from A1 file"""
    print("\n📘 Importing A1 notes...")
    
    df = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)
    
    # Get network IDs and source ID
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'A1')
    
    notes_data = {}
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if tadig not in network_map or tadig == 'TADIG':
            continue
        
        # Check for restrictions
        restriction = row.get('Restrictions')
        if not pd.isna(restriction):
            category, note = categorize_note(restriction)
            if category:
                notes_data[tadig] = {
                    'category': category,
                    'note': note,
                    'original': str(restriction)
                }
        
        # Also flag if has IMSI fee (General column)
        if 'General' in row:
            fee = row['General']
            if not pd.isna(fee) and float(fee) > 0:
                if tadig not in notes_data:
                    notes_data[tadig] = {
                        'category': 'access-fee',
                        'note': f'IMSI fee: €{float(fee):.2f}/month',
                        'original': 'Has IMSI fee'
                    }
    
    print(f"  Found notes for {len(notes_data)} networks")
    return notes_data, source_id

def import_telefonica_notes():
    """Import notes from Telefonica file"""
    print("\n📙 Importing Telefonica notes...")
    
    df = pd.read_excel('20250205 Monogoto TGS UK V1.xlsx', sheet_name='Format All', header=0)
    
    # Get network IDs and source ID
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'Telefonica')
    
    notes_data = {}
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('Tadig')):
            continue
        
        tadig = str(row['Tadig']).strip()
        if tadig not in network_map or tadig == 'Tadig':
            continue
        
        # Check various technology availability as notes
        notes = []
        
        if row.get('VoLTE') == 'Unavailable':
            notes.append('VoLTE unavailable')
        
        if row.get('LTE-M') == 'Unavailable':
            notes.append('LTE-M unavailable')
        
        if row.get('NB-IoT') == 'Unavailable':
            notes.append('NB-IoT unavailable')
        
        if row.get('Data') == 0 or pd.isna(row.get('Data')):
            notes.append('No data service')
        
        if notes:
            notes_data[tadig] = {
                'category': 'service-limited',
                'note': ', '.join(notes),
                'original': ', '.join(notes)
            }
    
    print(f"  Found notes for {len(notes_data)} networks")
    return notes_data, source_id

def create_notes_table():
    """Create a separate notes table if it doesn't exist"""
    print("\n📝 Creating notes storage...")
    
    # Check if notes table exists by trying to query it
    check_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/pricing_notes?limit=1",
        headers=headers
    )
    
    if check_response.status_code == 404:
        print("  Notes table doesn't exist in Supabase")
        print("  Please create 'pricing_notes' table with columns:")
        print("    - id (uuid, primary key)")
        print("    - network_id (uuid, foreign key to networks)")
        print("    - source_id (uuid, foreign key to pricing_sources)")
        print("    - category (text)")
        print("    - note (text)")
        print("    - created_at (timestamp)")
        return False
    
    return True

def store_notes(all_notes):
    """Store notes in the database"""
    print("\n💾 Storing notes in database...")
    
    # For now, we'll update the existing pricing records with notes in a JSON field
    # Since we can't easily alter the table structure via REST API
    
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    updated_count = 0
    
    for source_name, (notes_data, source_id) in all_notes.items():
        print(f"\n  Updating {source_name} notes...")
        
        for tadig, note_info in notes_data.items():
            if tadig not in network_map:
                continue
            
            network_id = network_map[tadig]
            
            # Get existing pricing record
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}",
                headers=headers
            )
            
            if response.status_code == 200 and response.json():
                pricing_record = response.json()[0]
                
                # Update with note info (store in restrictions field which already exists)
                update_data = {
                    'restrictions': note_info['note']
                }
                
                update_response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_record['id']}",
                    headers=headers,
                    json=update_data
                )
                
                if update_response.status_code in [200, 204]:
                    updated_count += 1
    
    print(f"\n  ✅ Updated {updated_count} pricing records with notes")

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     📋 IMPORT NOTES & RESTRICTIONS")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # Import notes from all sources
    tele2_notes, tele2_source = import_tele2_notes()
    a1_notes, a1_source = import_a1_notes()
    telefonica_notes, telefonica_source = import_telefonica_notes()
    
    all_notes = {
        'Tele2': (tele2_notes, tele2_source),
        'A1': (a1_notes, a1_source),
        'Telefonica': (telefonica_notes, telefonica_source)
    }
    
    # Display summary
    print("\n📊 Notes Summary:")
    
    # Count by category
    categories = {}
    for source_name, (notes_data, _) in all_notes.items():
        print(f"\n  {source_name}:")
        source_cats = {}
        for tadig, note_info in notes_data.items():
            cat = note_info['category']
            source_cats[cat] = source_cats.get(cat, 0) + 1
            categories[cat] = categories.get(cat, 0) + 1
        
        for cat, count in sorted(source_cats.items(), key=lambda x: -x[1]):
            print(f"    {cat}: {count}")
    
    print("\n  Overall categories:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"    {cat}: {count} total")
    
    # Store notes
    store_notes(all_notes)
    
    print("\n✅ Notes import complete!")
    print("   Next: Update interface to display notes with operator colors")

if __name__ == "__main__":
    main()