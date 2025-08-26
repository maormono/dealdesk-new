#!/usr/bin/env python3
"""
Import IoT coverage (LTE-M and NB-IoT) from Monogoto documentation
Profile mapping: B = Tele2, E = A1, O = Telefonica
"""

import requests
import json

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

# Profile mapping
PROFILE_MAP = {
    'B': 'Tele2',
    'E': 'A1',
    'O': 'Telefonica'
}

# IoT coverage data from Monogoto docs
# Format: {country: {network_name: {'lte_m': [profiles], 'nb_iot': [profiles], 'tadig': code}}}
IOT_COVERAGE = {
    'Argentina': {
        'Claro': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'ARGCM'},
        'Personal': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'ARGTP'},
        'TMA': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'ARGTM'}
    },
    'Australia': {
        'Telstra': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'AUSTA'},
        'Optus': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'AUSOP'},
        'Vodafone': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'AUSVF'}
    },
    'Austria': {
        'T-Mobile': {'lte_m': ['E'], 'nb_iot': ['E'], 'tadig': 'AUTMM'},
        'A1': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'AUTMB'},
        'Hutchison 3G': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'AUTH3'}
    },
    'Belgium': {
        'Telenet': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'BELNT'},
        'Orange': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'BELMS'},
        'Proximus': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'BELPB'}
    },
    'Brazil': {
        'Claro': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'BRACL'},
        'TIM': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'BRATM'},
        'Vivo': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'BRAVC'}
    },
    'Canada': {
        'Rogers': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'CANRW'},
        'Videotron': {'lte_m': ['E'], 'nb_iot': [], 'tadig': 'CANVT'},
        'Bell Mobility': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'CANBM'},
        'Telus': {'lte_m': ['B', 'E'], 'nb_iot': [], 'tadig': 'CANTS'}
    },
    'Chile': {
        'Claro': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'CHLSA'},
        'Entel': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'CHLEN'}
    },
    'China': {
        'China Mobile': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'CHN00'},
        'China Unicom': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'CHN01'},
        'China Telecom': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'CHN03'}
    },
    'Denmark': {
        'Hi3G': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'DNK3D'},
        'TDC': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'DNKTD'},
        'Telia': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'DNKSN'},
        'Telenor': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'DNKDM'}
    },
    'Finland': {
        'DNA': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'FIN2G'},
        'Elisa': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'FINRL'},
        'Telia': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'FINSX'}
    },
    'France': {
        'Orange': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'FRAF1'},
        'SFR': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'FRAF2'},
        'Bouygues': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'FRAF3'},
        'Free': {'lte_m': ['E'], 'nb_iot': ['E'], 'tadig': 'FRAF4'}
    },
    'Germany': {
        'T-Mobile': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'DEUTM'},
        'Vodafone': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'DEUMV'},
        'O2': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'DEUVI'}
    },
    'Iceland': {
        'Nova': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'ISLNO'},
        'Siminn': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'ISLTS'},
        'Vodafone': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'ISLTL'}
    },
    'Ireland': {
        'Vodafone': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'IRLEC'},
        'Three': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'IRLH3'},
        'Eir': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'IRLMM'}
    },
    'Italy': {
        'TIM': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'ITATM'},
        'Vodafone': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'ITAOM'},
        'Wind': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'ITAWI'},
        'Iliad': {'lte_m': ['E'], 'nb_iot': ['E'], 'tadig': 'ITAIL'}
    },
    'Japan': {
        'NTT DoCoMo': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'JPNDC'},
        'KDDI': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'JPNKT'},
        'Softbank': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'JPNSB'}
    },
    'Mexico': {
        'Telcel': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'MEXTA'},
        'AT&T': {'lte_m': ['B'], 'nb_iot': ['B'], 'tadig': 'MEXNX'}
    },
    'Netherlands': {
        'KPN': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'NLDPN'},
        'T-Mobile': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'NLDTM'},
        'Vodafone': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'NLDVF'}
    },
    'New Zealand': {
        'Spark': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'NZLNT'},
        'Vodafone': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'NZLVF'},
        '2degrees': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'NZL2D'}
    },
    'Norway': {
        'Telenor': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'NORTM'},
        'Telia': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'NORNT'},
        'Ice': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'NORIS'}
    },
    'Poland': {
        'Plus': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'POLKM'},
        'T-Mobile': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'POL02'},
        'Orange': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'POL03'},
        'Play': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'POLP4'}
    },
    'Singapore': {
        'Singtel': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'SGPSM'},
        'StarHub': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'SGPSH'},
        'M1': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'SGPM1'}
    },
    'Spain': {
        'Movistar': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'ESPRT'},
        'Vodafone': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'ESPAI'},
        'Orange': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'ESPAM'},
        'Yoigo': {'lte_m': ['E'], 'nb_iot': ['E'], 'tadig': 'ESPXY'}
    },
    'Sweden': {
        'Telia': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'SWETS'},
        'Tele2': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'SWEMC'},
        'Telenor': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'SWETM'},
        'Three': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'SWEH3'}
    },
    'Switzerland': {
        'Swisscom': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'CHESL'},
        'Sunrise': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'CHESG'},
        'Salt': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'CHEOR'}
    },
    'Taiwan': {
        'Chunghwa': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'TWNCH'},
        'FarEasTone': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'TWNFR'},
        'Taiwan Mobile': {'lte_m': ['B', 'E'], 'nb_iot': ['B', 'E'], 'tadig': 'TWNTM'}
    },
    'United Kingdom': {
        'EE': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'GBROR'},
        'O2': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'GBRCN'},
        'Vodafone': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'GBRVF'},
        'Three': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'GBRHU'}
    },
    'United States': {
        'AT&T': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'USACG'},
        'T-Mobile': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'USATW'},
        'Verizon': {'lte_m': ['B', 'E', 'O'], 'nb_iot': ['B', 'E', 'O'], 'tadig': 'USAVZ'}
    }
}

def update_iot_coverage():
    """Update database with IoT coverage from Monogoto docs"""
    
    print("🌐 Importing IoT Coverage from Monogoto Documentation")
    print("=" * 60)
    print("Profile mapping: B = Tele2, E = A1, O = Telefonica")
    print()
    
    # Get network and source mappings
    networks = requests.get(f"{SUPABASE_URL}/rest/v1/networks", headers=headers).json()
    network_map = {n['tadig']: n['id'] for n in networks}
    
    sources = requests.get(f"{SUPABASE_URL}/rest/v1/pricing_sources", headers=headers).json()
    source_map = {s['source_name']: s['id'] for s in sources}
    
    # Get existing pricing records
    all_pricing = []
    offset = 0
    while True:
        headers_with_range = {**headers, 'Range': f'{offset}-{offset+999}'}
        response = requests.get(f"{SUPABASE_URL}/rest/v1/network_pricing", headers=headers_with_range)
        if response.status_code == 200:
            data = response.json()
            if not data:
                break
            all_pricing.extend(data)
            if len(data) < 1000:
                break
            offset += 1000
        else:
            break
    
    # Create lookup for existing records
    existing_map = {}
    for p in all_pricing:
        key = f"{p['network_id']}|{p['source_id']}"
        existing_map[key] = p['id']
    
    print(f"Found {len(existing_map)} existing pricing records\n")
    
    # Process each country
    updates_by_operator = {'Tele2': 0, 'A1': 0, 'Telefonica': 0}
    
    for country, networks_data in IOT_COVERAGE.items():
        for network_name, coverage in networks_data.items():
            tadig = coverage.get('tadig')
            
            if tadig not in network_map:
                continue
            
            network_id = network_map[tadig]
            
            # Process LTE-M coverage
            for profile in coverage.get('lte_m', []):
                operator = PROFILE_MAP.get(profile)
                if operator and operator in source_map:
                    key = f"{network_id}|{source_map[operator]}"
                    if key in existing_map:
                        # Update LTE-M support
                        update_response = requests.patch(
                            f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{existing_map[key]}",
                            headers=headers,
                            json={'lte_m': True}
                        )
                        if update_response.status_code in [200, 204]:
                            updates_by_operator[operator] += 1
            
            # Process NB-IoT coverage
            for profile in coverage.get('nb_iot', []):
                operator = PROFILE_MAP.get(profile)
                if operator and operator in source_map:
                    key = f"{network_id}|{source_map[operator]}"
                    if key in existing_map:
                        # Update NB-IoT support
                        update_response = requests.patch(
                            f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{existing_map[key]}",
                            headers=headers,
                            json={'nb_iot': True}
                        )
                        if update_response.status_code in [200, 204]:
                            pass  # Already counted in LTE-M
    
    # Print summary
    print("📊 IoT Coverage Update Summary:")
    print("-" * 40)
    for operator, count in updates_by_operator.items():
        print(f"  {operator}: {count} networks updated with IoT support")
    
    # Show some examples
    print("\n🌟 Sample Networks with IoT Support:")
    examples = [
        ('Canada', 'Bell Mobility', 'CANBM', ['B', 'E'], ['B', 'E']),
        ('United States', 'AT&T', 'USACG', ['B', 'E', 'O'], ['B', 'E', 'O']),
        ('Germany', 'T-Mobile', 'DEUTM', ['B', 'E', 'O'], ['B', 'E', 'O']),
        ('Australia', 'Telstra', 'AUSTA', ['B', 'E', 'O'], ['B', 'E', 'O']),
        ('United Kingdom', 'EE', 'GBROR', ['B', 'E', 'O'], ['B', 'E', 'O'])
    ]
    
    for country, network, tadig, lte_m, nb_iot in examples:
        lte_m_ops = [PROFILE_MAP[p] for p in lte_m]
        nb_iot_ops = [PROFILE_MAP[p] for p in nb_iot]
        print(f"\n  {country} - {network} ({tadig}):")
        print(f"    LTE-M: {', '.join(lte_m_ops)}")
        print(f"    NB-IoT: {', '.join(nb_iot_ops)}")
    
    print("\n✅ IoT coverage import complete!")
    print("   The website will now show CAT-M and NB-IoT badges for supported networks")

if __name__ == "__main__":
    update_iot_coverage()