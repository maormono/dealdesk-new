#!/usr/bin/env python3
"""
Import all notes/restrictions from Excel files to database
"""

import pandas as pd
import requests

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def import_tele2_notes():
    """Import notes from Tele2 invoice file"""
    print("\n📄 Importing Tele2 notes...")
    
    # Get networks and source ID
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'Tele2')
    
    # Load Tele2 file
    df = pd.read_excel('0- Invoice Monogoto 2025-04.xlsx', sheet_name='Pricelist 2024-11-01', header=0)
    
    updated = 0
    notes_found = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if tadig not in network_map or tadig == 'TADIG':
            continue
        
        # Check for comments
        comment = row.get('Comments')
        if not pd.isna(comment) and comment:
            notes_found += 1
            comment = str(comment).strip()
            
            # Skip "Access fee" comments since we show IMSI fees separately
            if comment.lower() in ['access fee', 'access fee ']:
                continue
            
            # Skip "direct roaming" as it's not a restriction
            if comment.lower() == 'direct roaming':
                continue
            
            # Update the pricing record with the note
            network_id = network_map[tadig]
            
            # First check if pricing record exists
            check_response = requests.get(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}",
                headers=headers
            )
            
            if check_response.status_code == 200 and check_response.json():
                pricing_id = check_response.json()[0]['id']
                
                # Update with the note
                update_response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json={'restrictions': comment}
                )
                
                if update_response.status_code in [200, 204]:
                    updated += 1
                    if updated <= 5:
                        print(f"  {tadig}: {comment}")
    
    print(f"  Found {notes_found} notes, updated {updated} records")
    return updated

def import_a1_notes():
    """Import restrictions from A1 file"""
    print("\n📘 Importing A1 restrictions...")
    
    # Get networks and source ID
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_id = next(s['id'] for s in sources if s['source_name'] == 'A1')
    
    # Load A1 file
    df = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)
    
    updated = 0
    notes_found = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG')):
            continue
        
        tadig = str(row['TADIG']).strip()
        if tadig not in network_map or tadig == 'TADIG':
            continue
        
        # Check for restrictions
        restriction = row.get('Restrictions')
        if not pd.isna(restriction) and restriction:
            notes_found += 1
            restriction = str(restriction).strip()
            
            # Update the pricing record with the restriction
            network_id = network_map[tadig]
            
            # First check if pricing record exists
            check_response = requests.get(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}",
                headers=headers
            )
            
            if check_response.status_code == 200 and check_response.json():
                pricing_id = check_response.json()[0]['id']
                
                # Update with the restriction
                update_response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json={'restrictions': restriction}
                )
                
                if update_response.status_code in [200, 204]:
                    updated += 1
                    if updated <= 5:
                        network_name = next((n['network_name'] for n in networks if n['tadig'] == tadig), 'Unknown')
                        print(f"  {tadig} ({network_name}): {restriction}")
    
    print(f"  Found {notes_found} restrictions, updated {updated} records")
    return updated

def verify_notes():
    """Verify notes were imported"""
    print("\n📊 Verifying notes import...")
    
    # Count pricing records with restrictions
    offset = 0
    total_with_notes = 0
    
    while True:
        headers_with_range = {**headers, 'Range': f'{offset}-{offset+999}'}
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/network_pricing?select=id,restrictions,source_id",
            headers=headers_with_range
        )
        
        if response.status_code == 200:
            data = response.json()
            if not data:
                break
            
            for record in data:
                if record.get('restrictions'):
                    total_with_notes += 1
            
            if len(data) < 1000:
                break
            offset += 1000
        else:
            break
    
    print(f"  Total pricing records with notes/restrictions: {total_with_notes}")
    
    # Show sample of notes
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/network_pricing?select=restrictions,networks(tadig,network_name)&restrictions=not.is.null&limit=10",
        headers=headers
    )
    
    if response.status_code == 200 and response.json():
        print("\n  Sample notes:")
        for record in response.json()[:5]:
            network = record.get('networks', {})
            note = record.get('restrictions', '')
            if network and note:
                print(f"    {network.get('tadig', 'N/A')}: {note[:60]}...")

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     📋 IMPORT ALL NOTES & RESTRICTIONS")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # Import from each source
    tele2_count = import_tele2_notes()
    a1_count = import_a1_notes()
    
    # Note: Telefonica doesn't have explicit restriction columns
    # Their restrictions are based on service availability (VoLTE, LTE-M, etc.)
    # which we could derive from the technology columns if needed
    
    total = tele2_count + a1_count
    
    print(f"\n✅ Import complete!")
    print(f"   Total notes imported: {total}")
    
    # Verify
    verify_notes()
    
    print("\n🎉 Refresh https://deal-desk.netlify.app/ to see the notes!")

if __name__ == "__main__":
    main()