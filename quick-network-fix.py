#!/usr/bin/env python3
"""
Quick fix for network names - optimized version
"""

import requests
import re

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def fix_name(name, country=None):
    """Quick fix for network names"""
    if not name or name == 'unknown':
        return 'Unknown'
    
    # Remove country if present
    if country:
        # Remove country patterns
        name = re.sub(f'^{re.escape(country)}\\s*[/-]\\s*', '', name, flags=re.I)
        name = re.sub(f'\\s*[/-]\\s*{re.escape(country)}$', '', name, flags=re.I)
        name = re.sub(f'^{re.escape(country)}\\s+', '', name, flags=re.I)
        name = re.sub(f'\\s+{re.escape(country)}$', '', name, flags=re.I)
    
    # Remove Ltd and similar
    name = re.sub(r'\b(ltd|limited|inc|corp|plc|llc|gmbh|ag|sa|srl|co\.?)\b\.?', '', name, flags=re.I)
    
    # Fix telephone/telecommunications
    name = re.sub(r'\btelephone\s+(communications?|telecom)?\b', 'Telecom', name, flags=re.I)
    name = re.sub(r'\btelecommunications?\b', 'Telecom', name, flags=re.I)
    name = re.sub(r'\btelephone\b', 'Telecom', name, flags=re.I)
    
    # Clean up spaces
    name = re.sub(r'\s+', ' ', name)
    name = name.strip(' /-.')
    
    # Capitalize properly
    words = name.split()
    result = []
    
    for i, word in enumerate(words):
        # Keep certain words uppercase
        if word.upper() in ['USA', 'UK', 'UAE', 'EU', 'GSM', 'CDMA', 'LTE', 'MTN', 
                            'MTS', 'STC', 'TIM', 'MTC', 'KPN', 'SFR', 'AT&T', 'O2']:
            result.append(word.upper())
        # Keep certain words lowercase (unless first)
        elif i > 0 and word.lower() in ['and', 'or', 'of', 'for', 'de', 'del', 'la']:
            result.append(word.lower())
        # Numbers with letters
        elif re.match(r'^\d+[a-z]+$', word, re.I):
            result.append(word.upper())
        # Regular capitalization
        else:
            result.append(word.capitalize())
    
    final = ' '.join(result)
    
    # Special cases
    replacements = {
        'Telefonica': 'Telefónica',
        'T-mobile': 'T-Mobile',
        'Vodafone': 'Vodafone',
        'Orange': 'Orange',
        'Three': 'Three'
    }
    
    for old, new in replacements.items():
        if final.lower() == old.lower():
            return new
    
    return final

def main():
    print("🚀 Quick Network Name Fix")
    print("-" * 40)
    
    # Get all networks
    print("Fetching networks...")
    response = requests.get(f"{SUPABASE_URL}/rest/v1/networks?select=id,tadig,network_name,country", headers=headers)
    networks = response.json()
    print(f"Found {len(networks)} networks")
    
    # Process in batches
    batch_size = 50
    updated = 0
    examples = []
    
    for i in range(0, len(networks), batch_size):
        batch = networks[i:i+batch_size]
        updates = []
        
        for network in batch:
            old_name = network['network_name']
            new_name = fix_name(old_name, network.get('country'))
            
            if new_name != old_name:
                updates.append({
                    'id': network['id'],
                    'network_name': new_name
                })
                
                if len(examples) < 10:
                    examples.append(f"  {network['tadig']}: '{old_name}' → '{new_name}'")
        
        # Apply batch updates
        if updates:
            for update in updates:
                requests.patch(
                    f"{SUPABASE_URL}/rest/v1/networks?id=eq.{update['id']}",
                    headers=headers,
                    json={'network_name': update['network_name']}
                )
                updated += 1
            
            print(f"Updated {updated} networks...")
    
    print(f"\n✅ Fixed {updated} network names")
    
    if examples:
        print("\nExamples:")
        for ex in examples:
            print(ex)
    
    print("\n🎉 Done! Refresh the website to see changes.")

if __name__ == "__main__":
    main()