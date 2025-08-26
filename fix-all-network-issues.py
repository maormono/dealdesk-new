#!/usr/bin/env python3
"""
Fix all network name issues:
1. Proper capitalization (not all lowercase)
2. Remove Ltd and other suffixes
3. Consolidate duplicates (telephone vs telephone communications)
4. Ensure notes are properly stored
"""

import requests
import re
import pandas as pd

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def proper_capitalize(name):
    """Properly capitalize network names"""
    if not name or name == 'unknown':
        return 'Unknown'
    
    # Special cases that should be all caps
    all_caps = ['usa', 'uk', 'uae', 'eu', 'gsm', 'cdma', 'lte', 'umts', 'hspa', 
                'mvno', 'mts', 'stc', 'mtc', 'etc', 'atc', 'btc', 'ctc', 'dtc',
                'mtn', 'meo', 'nos', 'ice', 'dna', 'tdc', 'kpn', 'sfr', 'tim']
    
    # Words that should remain lowercase
    lowercase_words = ['and', 'or', 'the', 'of', 'for', 'de', 'del', 'la', 'el', 
                       'los', 'las', 'do', 'da', 'di', 'du', 'des', 'der', 'den']
    
    # Words to remove completely
    remove_words = ['ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation',
                    'plc', 'llc', 'gmbh', 'ag', 'sa', 'srl', 'spa', 'nv', 'bv',
                    'pty', 'pvt', 'pte', 'co', 'company']
    
    # Split by spaces and special characters but preserve them
    parts = re.split(r'(\s+|/|-|\.|\(|\))', name.lower())
    result = []
    
    for i, part in enumerate(parts):
        if not part:
            continue
        
        # Skip if it's a separator
        if part in [' ', '/', '-', '.', '(', ')'] or part.isspace():
            # Don't add multiple spaces in a row
            if part == ' ' and result and result[-1] == ' ':
                continue
            result.append(part)
            continue
        
        # Remove unwanted suffixes
        if part.lower() in remove_words:
            # Remove the preceding space too if there is one
            if result and result[-1] == ' ':
                result.pop()
            continue
        
        # Check if should be all caps
        if part.lower() in all_caps:
            result.append(part.upper())
        # Check if should remain lowercase (unless it's the first word)
        elif part.lower() in lowercase_words and i > 0:
            result.append(part.lower())
        # Numbers with letters (like 3g, 4g, 5g)
        elif re.match(r'^\d+[a-z]+$', part.lower()):
            result.append(part.upper())
        # Otherwise capitalize first letter
        else:
            result.append(part.capitalize())
    
    # Clean up the result
    final = ''.join(result).strip()
    
    # Remove trailing separators
    final = re.sub(r'[\s/\-\.]+$', '', final)
    
    # Consolidate common variations
    consolidations = {
        'telephone communications': 'Telecom',
        'telephone': 'Telecom',
        'telecommunications': 'Telecom',
        'telefonica': 'Telefónica',
        'vodafone': 'Vodafone',
        'orange': 'Orange',
        'telenor': 'Telenor',
        'telstra': 'Telstra',
        'verizon': 'Verizon',
        'at&t': 'AT&T',
        'o2': 'O2',
        't-mobile': 'T-Mobile',
        'three': 'Three',
        'airtel': 'Airtel',
        'movistar': 'Movistar',
        'claro': 'Claro',
        'vivo': 'Vivo',
        'digicel': 'Digicel'
    }
    
    final_lower = final.lower()
    for pattern, replacement in consolidations.items():
        if final_lower == pattern:
            return replacement
        # Also check if it ends with the pattern (after removing country)
        if final_lower.endswith(' ' + pattern):
            prefix = final[:-len(pattern)-1]
            return f"{prefix} {replacement}" if prefix else replacement
    
    return final

def clean_network_name(name, country):
    """Remove country from network name and clean it up"""
    if not name:
        return 'Unknown'
    
    # First remove country if present
    name_clean = name
    if country:
        # Remove country at beginning or end
        country_pattern = re.escape(country)
        # Try various patterns
        patterns = [
            f'^{country_pattern}\\s*/\\s*',  # Country / Name
            f'^{country_pattern}\\s+',       # Country Name
            f'\\s*/\\s*{country_pattern}$',  # Name / Country
            f'\\s+{country_pattern}$',       # Name Country
            f'^{country_pattern}\\s*-\\s*',  # Country - Name
            f'\\s*-\\s*{country_pattern}$'   # Name - Country
        ]
        
        for pattern in patterns:
            name_clean = re.sub(pattern, '', name_clean, flags=re.IGNORECASE)
    
    # Now apply proper capitalization
    return proper_capitalize(name_clean)

def import_notes_from_files():
    """Import notes directly from Excel files"""
    notes_by_tadig = {}
    
    # Import Tele2 notes
    print("📄 Reading Tele2 notes...")
    try:
        df = pd.read_excel('0- Invoice Monogoto 2025-04.xlsx', sheet_name='Pricelist 2024-11-01', header=0)
        for _, row in df.iterrows():
            if pd.notna(row.get('TADIG')) and pd.notna(row.get('Comments')):
                tadig = str(row['TADIG']).strip()
                comment = str(row['Comments']).strip()
                # Skip non-restriction comments
                if comment.lower() not in ['access fee', 'direct roaming', '']:
                    if tadig not in notes_by_tadig:
                        notes_by_tadig[tadig] = {}
                    notes_by_tadig[tadig]['Tele2'] = comment
    except Exception as e:
        print(f"  Error reading Tele2 file: {e}")
    
    # Import A1 notes
    print("📘 Reading A1 notes...")
    try:
        df = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)
        for _, row in df.iterrows():
            if pd.notna(row.get('TADIG')) and pd.notna(row.get('Restrictions')):
                tadig = str(row['TADIG']).strip()
                restriction = str(row['Restrictions']).strip()
                if restriction:
                    if tadig not in notes_by_tadig:
                        notes_by_tadig[tadig] = {}
                    notes_by_tadig[tadig]['A1'] = restriction
    except Exception as e:
        print(f"  Error reading A1 file: {e}")
    
    return notes_by_tadig

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     🔧 FIXING ALL NETWORK ISSUES")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # Get all networks
    print("\n📡 Fetching all networks...")
    response = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers)
    networks = response.json()
    print(f"  Found {len(networks)} networks")
    
    # First, import notes from files
    print("\n📋 Importing notes from Excel files...")
    notes_by_tadig = import_notes_from_files()
    print(f"  Found notes for {len(notes_by_tadig)} networks")
    
    # Process each network
    print("\n🔄 Processing network names...")
    updated_networks = 0
    name_changes = []
    
    for network in networks:
        old_name = network['network_name']
        country = network['country']
        tadig = network['tadig']
        
        # Clean and properly capitalize the name
        new_name = clean_network_name(old_name, country)
        
        # Check if name changed
        if new_name != old_name:
            # Update the network name
            update_response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/networks?id=eq.{network['id']}",
                headers=headers,
                json={'network_name': new_name}
            )
            
            if update_response.status_code in [200, 204]:
                updated_networks += 1
                if len(name_changes) < 15:
                    name_changes.append({
                        'tadig': tadig,
                        'country': country,
                        'old': old_name,
                        'new': new_name
                    })
                
                if updated_networks % 50 == 0:
                    print(f"  Updated {updated_networks} network names...")
    
    print(f"\n✅ Updated {updated_networks} network names")
    
    # Show examples of changes
    if name_changes:
        print("\n📝 Example name changes:")
        for change in name_changes[:10]:
            print(f"  {change['tadig']} ({change['country']})")
            print(f"    Before: '{change['old']}'")
            print(f"    After:  '{change['new']}'")
    
    # Now update notes in the database
    print("\n📌 Updating notes in database...")
    
    # Get pricing sources
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_map = {s['source_name']: s['id'] for s in sources}
    
    # Get updated networks for mapping
    response = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers)
    networks = response.json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    notes_updated = 0
    for tadig, source_notes in notes_by_tadig.items():
        if tadig not in network_map:
            continue
        
        network_id = network_map[tadig]
        
        for source_name, note_text in source_notes.items():
            if source_name not in source_map:
                continue
            
            source_id = source_map[source_name]
            
            # Update the pricing record with the note
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}",
                headers=headers
            )
            
            if response.status_code == 200 and response.json():
                pricing_record = response.json()[0]
                
                update_response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_record['id']}",
                    headers=headers,
                    json={'restrictions': note_text}
                )
                
                if update_response.status_code in [200, 204]:
                    notes_updated += 1
    
    print(f"  Updated {notes_updated} pricing records with notes")
    
    # Verify final state
    print("\n🔍 Verifying final state...")
    
    # Check for remaining issues
    response = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers)
    networks = response.json()
    
    issues = {
        'lowercase': [],
        'has_ltd': [],
        'has_country': [],
        'duplicates': {}
    }
    
    for network in networks:
        name = network['network_name']
        country = network['country']
        
        # Check if all lowercase
        if name and name.islower():
            issues['lowercase'].append(f"{network['tadig']}: {name}")
        
        # Check for Ltd
        if re.search(r'\bltd\b', name, re.IGNORECASE):
            issues['has_ltd'].append(f"{network['tadig']}: {name}")
        
        # Check for country in name
        if country and country.lower() in name.lower():
            issues['has_country'].append(f"{network['tadig']}: {name}")
        
        # Track duplicates
        key = f"{country}|{name.lower()}"
        if key not in issues['duplicates']:
            issues['duplicates'][key] = []
        issues['duplicates'][key].append(network['tadig'])
    
    # Report issues
    if issues['lowercase']:
        print(f"\n⚠️  {len(issues['lowercase'])} networks still all lowercase")
        for item in issues['lowercase'][:3]:
            print(f"    {item}")
    
    if issues['has_ltd']:
        print(f"\n⚠️  {len(issues['has_ltd'])} networks still have 'Ltd'")
        for item in issues['has_ltd'][:3]:
            print(f"    {item}")
    
    if issues['has_country']:
        print(f"\n⚠️  {len(issues['has_country'])} networks still have country in name")
        for item in issues['has_country'][:3]:
            print(f"    {item}")
    
    # Count actual duplicates (more than 1 TADIG for same name)
    real_duplicates = {k: v for k, v in issues['duplicates'].items() if len(v) > 1}
    if real_duplicates:
        print(f"\n📊 {len(real_duplicates)} network names appear multiple times:")
        for key, tadigs in list(real_duplicates.items())[:5]:
            country, name = key.split('|', 1)
            print(f"    {country} - {name}: {', '.join(tadigs)}")
    
    # Check notes
    print("\n📌 Checking notes status...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/network_pricing?select=restrictions&restrictions=not.is.null&limit=100",
        headers=headers
    )
    
    if response.status_code == 200:
        records_with_notes = response.json()
        print(f"  Found {len(records_with_notes)} pricing records with notes/restrictions")
        
        # Show a few examples
        if records_with_notes:
            print("\n  Sample notes:")
            for record in records_with_notes[:5]:
                if record.get('restrictions'):
                    print(f"    • {record['restrictions'][:60]}...")
    
    print("\n✅ Network cleanup complete!")
    print("   Refresh https://deal-desk.netlify.app/ to see the improvements")

if __name__ == "__main__":
    main()