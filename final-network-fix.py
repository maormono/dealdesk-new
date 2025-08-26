#!/usr/bin/env python3
"""
Final comprehensive network name fix
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

def clean_and_capitalize(name, country=None):
    """Clean and properly capitalize network names"""
    if not name or name == 'unknown':
        return 'Unknown'
    
    original = name
    
    # Step 1: Remove country from name
    if country:
        # Remove country at beginning with various separators
        patterns = [
            f'^{re.escape(country)}\\s*/\\s*',  # Country / Name
            f'^{re.escape(country)}\\s*-\\s*',   # Country - Name
            f'^{re.escape(country)}\\s+',        # Country Name
        ]
        for pattern in patterns:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
    
    # Step 2: Remove corporate suffixes
    suffixes = r'\b(ltd\.?|limited|inc\.?|incorporated|corp\.?|corporation|plc|llc|gmbh|ag|sa|srl|spa|nv|bv|pty|pvt|pte|co\.?|company)\b\.?'
    name = re.sub(suffixes, '', name, flags=re.IGNORECASE)
    
    # Step 3: Fix telephone/telecommunications variations
    name = re.sub(r'\btelephone\s+communications?\b', 'Telecom', name, flags=re.IGNORECASE)
    name = re.sub(r'\btelecommunications?\b', 'Telecom', name, flags=re.IGNORECASE)
    name = re.sub(r'\btelephone\b', 'Telecom', name, flags=re.IGNORECASE)
    
    # Step 4: Clean up whitespace and separators
    name = re.sub(r'\s+', ' ', name)
    name = re.sub(r'\s*/\s*', ' / ', name)
    name = re.sub(r'\s*-\s*', ' - ', name)
    name = name.strip(' /-.')
    
    # Step 5: Handle slash-separated parts
    if ' / ' in name:
        parts = name.split(' / ')
        # Remove duplicates (like "Claro / Claro")
        if len(parts) == 2 and parts[0].lower() == parts[1].lower():
            name = parts[0]
        # Keep both if different
        else:
            name = ' / '.join(parts)
    
    # Step 6: Proper capitalization
    # Special cases that need specific capitalization
    special_cases = {
        'tim': 'TIM',
        'mtn': 'MTN',
        'mts': 'MTS', 
        'stc': 'STC',
        'mtc': 'MTC',
        'ice': 'ICE',
        'dna': 'DNA',
        'tdc': 'TDC',
        'kpn': 'KPN',
        'sfr': 'SFR',
        'meo': 'MEO',
        'nos': 'NOS',
        'o2': 'O2',
        'ee': 'EE',
        'bt': 'BT',
        'at&t': 'AT&T',
        'telefonica': 'Telefónica',
        'telefónica': 'Telefónica',
        't-mobile': 'T-Mobile',
        'vodafone': 'Vodafone',
        'orange': 'Orange',
        'three': 'Three',
        'telenor': 'Telenor',
        'telia': 'Telia',
        'telstra': 'Telstra',
        'verizon': 'Verizon',
        'sprint': 'Sprint',
        'claro': 'Claro',
        'vivo': 'Vivo',
        'oi': 'Oi',
        'movistar': 'Movistar',
        'entel': 'Entel',
        'digicel': 'Digicel',
        'airtel': 'Airtel',
        'etisalat': 'Etisalat',
        'zain': 'Zain',
        'ooredoo': 'Ooredoo',
        'turkcell': 'Turkcell',
        'türk telekom': 'Türk Telekom',
        'telekom': 'Telekom',
        'telecom': 'Telecom',
        'a1': 'A1',
        'play': 'Play',
        'plus': 'Plus',
        'proximus': 'Proximus',
        'swisscom': 'Swisscom',
        'sunrise': 'Sunrise',
        'salt': 'Salt'
    }
    
    # Check if entire name matches a special case
    name_lower = name.lower()
    if name_lower in special_cases:
        return special_cases[name_lower]
    
    # Otherwise capitalize each word appropriately
    words = name.split()
    result = []
    
    for i, word in enumerate(words):
        word_lower = word.lower()
        
        # Check special cases
        if word_lower in special_cases:
            result.append(special_cases[word_lower])
        # Words that should stay lowercase (unless first word)
        elif i > 0 and word_lower in ['and', 'or', 'of', 'for', 'the']:
            result.append(word_lower)
        # Acronyms and special patterns
        elif word_lower in ['usa', 'uk', 'uae', 'eu', 'gsm', 'cdma', 'lte', 'umts', 'hspa', 'mvno']:
            result.append(word.upper())
        # Numbers with letters (2g, 3g, 4g, 5g)
        elif re.match(r'^\d+[a-z]+$', word_lower):
            result.append(word.upper())
        # Regular capitalization
        else:
            # Handle hyphenated words
            if '-' in word:
                hyphen_parts = word.split('-')
                hyphen_result = []
                for part in hyphen_parts:
                    if part.lower() in special_cases:
                        hyphen_result.append(special_cases[part.lower()])
                    else:
                        hyphen_result.append(part.capitalize())
                result.append('-'.join(hyphen_result))
            else:
                result.append(word.capitalize())
    
    final = ' '.join(result)
    
    # Final cleanup
    final = re.sub(r'\s+', ' ', final)
    final = final.strip()
    
    return final

def import_notes():
    """Import notes from Excel files"""
    notes = {}
    
    # Import Tele2 notes
    try:
        df = pd.read_excel('0- Invoice Monogoto 2025-04.xlsx', sheet_name='Pricelist 2024-11-01', header=0)
        for _, row in df.iterrows():
            if pd.notna(row.get('TADIG')) and pd.notna(row.get('Comments')):
                tadig = str(row['TADIG']).strip()
                comment = str(row['Comments']).strip()
                if comment.lower() not in ['access fee', 'direct roaming']:
                    if tadig not in notes:
                        notes[tadig] = {}
                    notes[tadig]['Tele2'] = comment
    except:
        pass
    
    # Import A1 notes
    try:
        df = pd.read_excel('202509_Country Price List A1 IMSI Sponsoring.xlsx', sheet_name='prices A1 WS', header=7)
        for _, row in df.iterrows():
            if pd.notna(row.get('TADIG')) and pd.notna(row.get('Restrictions')):
                tadig = str(row['TADIG']).strip()
                restriction = str(row['Restrictions']).strip()
                if restriction:
                    if tadig not in notes:
                        notes[tadig] = {}
                    notes[tadig]['A1'] = restriction
    except:
        pass
    
    return notes

def main():
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("     🔧 FINAL NETWORK NAME FIX")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # Get all networks
    print("\n📡 Fetching networks...")
    response = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers)
    networks = response.json()
    print(f"  Found {len(networks)} networks")
    
    # Import notes
    print("\n📋 Importing notes...")
    notes_by_tadig = import_notes()
    print(f"  Found notes for {len(notes_by_tadig)} networks")
    
    # Process networks
    print("\n🔄 Processing network names...")
    updated = 0
    examples = []
    
    for network in networks:
        old_name = network['network_name']
        country = network.get('country', '')
        tadig = network['tadig']
        
        # Clean and capitalize
        new_name = clean_and_capitalize(old_name, country)
        
        if new_name != old_name:
            # Update network
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/networks?id=eq.{network['id']}",
                headers=headers,
                json={'network_name': new_name}
            )
            
            if response.status_code in [200, 204]:
                updated += 1
                if len(examples) < 15:
                    examples.append({
                        'tadig': tadig,
                        'old': old_name,
                        'new': new_name,
                        'country': country
                    })
                
                if updated % 50 == 0:
                    print(f"  Updated {updated} networks...")
    
    print(f"\n✅ Updated {updated} network names")
    
    # Show examples
    if examples:
        print("\n📝 Example changes:")
        for ex in examples[:10]:
            print(f"\n  {ex['tadig']} ({ex['country']})")
            print(f"    Before: {ex['old']}")
            print(f"    After:  {ex['new']}")
    
    # Update notes in database
    print("\n📌 Updating notes in database...")
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_map = {s['source_name']: s['id'] for s in sources}
    
    # Get networks again for mapping
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
            
            # Get pricing record
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/network_pricing?network_id=eq.{network_id}&source_id=eq.{source_id}",
                headers=headers
            )
            
            if response.status_code == 200 and response.json():
                pricing_id = response.json()[0]['id']
                
                # Update with note
                response = requests.patch(
                    f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{pricing_id}",
                    headers=headers,
                    json={'restrictions': note_text}
                )
                
                if response.status_code in [200, 204]:
                    notes_updated += 1
    
    print(f"  Updated {notes_updated} pricing records with notes")
    
    # Verify notes
    print("\n🔍 Verifying notes...")
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/network_pricing?select=restrictions&restrictions=not.is.null&limit=1000",
        headers=headers
    )
    
    if response.status_code == 200:
        records = response.json()
        unique_notes = set()
        for r in records:
            if r.get('restrictions'):
                unique_notes.add(r['restrictions'])
        
        print(f"  Found {len(records)} pricing records with notes")
        print(f"  {len(unique_notes)} unique note types")
        
        # Show sample notes
        print("\n  Sample notes:")
        for note in list(unique_notes)[:10]:
            print(f"    • {note}")
    
    print("\n✅ All fixes complete!")
    print("   Refresh https://deal-desk.netlify.app/ to see the improvements")

if __name__ == "__main__":
    main()