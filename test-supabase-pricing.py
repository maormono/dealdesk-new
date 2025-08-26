#!/usr/bin/env python3
"""
Test script to verify Supabase pricing data
Specifically checks that Tele2 shows €0.50 for AUSTA, not €1.25
"""

from supabase import create_client
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or SUPABASE_URL == 'your-project-url-here':
    print("❌ Please update .env.local with your Supabase credentials first!")
    exit(1)

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_australia_pricing():
    """Test that Australia pricing is correct for each source"""
    print("🇦🇺 Testing Australia Network Pricing")
    print("=" * 60)
    
    # Test AUSTA (Telstra) specifically
    print("\n📊 AUSTA (Telstra) Pricing by Source:")
    print("-" * 40)
    
    # Get pricing comparison for AUSTA
    result = supabase.rpc('get_pricing_comparison', {'p_tadig': 'AUSTA'}).execute()
    
    if result.data:
        for row in result.data:
            source = row['source_name']
            imsi_fee = row['imsi_access_fee']
            data_rate = row['data_per_mb']
            
            # Highlight the key finding
            if source == 'Tele2' and imsi_fee == 0.5:
                status = "✅ CORRECT!"
            elif source == 'Tele2' and imsi_fee != 0.5:
                status = "❌ WRONG! Should be €0.50"
            elif source == 'A1' and imsi_fee == 1.25:
                status = "✅ Correct"
            else:
                status = ""
            
            print(f"  {source:12} : IMSI fee €{imsi_fee:6.2f}, Data ${data_rate or 0:6.4f}/MB {status}")
    else:
        print("  No data found for AUSTA")
    
    # Check all Australia networks
    print("\n📋 All Australia Networks:")
    print("-" * 40)
    
    aus_result = supabase.from_('v_australia_pricing').select('*').execute()
    
    if aus_result.data:
        # Group by TADIG
        by_tadig = {}
        for item in aus_result.data:
            tadig = item['tadig']
            if tadig not in by_tadig:
                by_tadig[tadig] = {
                    'network': item['network_name'],
                    'sources': {}
                }
            by_tadig[tadig]['sources'][item['source_name']] = {
                'imsi': item['imsi_access_fee'],
                'data': item['data_per_mb'],
                'prohibited': item['is_prohibited']
            }
        
        for tadig, info in by_tadig.items():
            print(f"\n{tadig} - {info['network']}")
            for source, pricing in info['sources'].items():
                prohibited = " [PROHIBITED]" if pricing['prohibited'] else ""
                print(f"  {source:12} : IMSI €{pricing['imsi']:6.2f}, Data ${pricing['data'] or 0:6.4f}/MB{prohibited}")
    else:
        print("  No Australia data found")

def test_imsi_fees_by_source():
    """Test networks with IMSI fees by source"""
    print("\n💰 Networks with IMSI Fees by Source")
    print("=" * 60)
    
    for source in ['Tele2', 'A1', 'Telefonica']:
        result = supabase.from_('v_networks_with_imsi_fees')\
            .select('*')\
            .eq('source_name', source)\
            .order('imsi_access_fee', desc=True)\
            .limit(5)\
            .execute()
        
        print(f"\n{source} - Top 5 IMSI fees:")
        if result.data:
            for item in result.data:
                print(f"  {item['tadig']:8} {item['network_name'][:25]:25} : €{item['imsi_access_fee']:6.2f}/month")
        else:
            print("  No IMSI fees found")

def test_restrictions():
    """Test restricted networks"""
    print("\n🚫 Network Restrictions Summary")
    print("=" * 60)
    
    result = supabase.from_('network_restrictions')\
        .select('restriction_type, networks(tadig, network_name)')\
        .eq('is_active', True)\
        .execute()
    
    if result.data:
        by_type = {}
        for item in result.data:
            rtype = item['restriction_type']
            if rtype not in by_type:
                by_type[rtype] = []
            by_type[rtype].append(f"{item['networks']['tadig']} ({item['networks']['network_name']})")
        
        for rtype, networks in by_type.items():
            print(f"\n{rtype.replace('_', ' ').title()}: {len(networks)} networks")
            for net in networks[:3]:  # Show first 3
                print(f"  • {net}")
            if len(networks) > 3:
                print(f"  ... and {len(networks) - 3} more")
    else:
        print("  No restrictions found")

def main():
    print("\n🔍 Supabase Pricing Data Verification")
    print("=" * 60)
    
    test_australia_pricing()
    test_imsi_fees_by_source()
    test_restrictions()
    
    print("\n" + "=" * 60)
    print("✅ Test complete!")
    print("\nKey Points to Verify:")
    print("  1. Tele2 AUSTA (Telstra) = €0.50 ✓")
    print("  2. A1 AUSTA (Telstra) = €1.25 ✓")
    print("  3. Telefonica has no IMSI fees ✓")
    print("  4. Prohibited networks are marked ✓")

if __name__ == "__main__":
    main()