#!/usr/bin/env python3
"""
Post-Import Validation Script
Checks for common import issues and data quality problems
"""

import requests
import sys
from datetime import datetime

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def check_critical_networks():
    """Check that critical networks are correctly imported"""
    print("\n🔍 Checking Critical Networks...")
    
    critical_networks = [
        {
            'tadig': 'CANST',
            'expected_country': 'Canada',
            'expected_network': ['SaskTel', 'Canada - SaskTel'],
            'error_if_country': 'Unknown',
            'error_if_network': 'Canada'
        },
        {
            'tadig': 'USAVZ',
            'expected_country': 'United States',
            'expected_network': ['Verizon', 'Verizon Wireless'],
        },
        {
            'tadig': 'GBRCN',
            'expected_country': 'United Kingdom',
            'expected_network': ['O2', 'EE', 'Everything Everywhere'],
        },
        {
            'tadig': 'ISRMS',
            'expected_country': 'Israel',
            'expected_network': ['Hot', 'Hot Mobile', 'Mirs'],
        }
    ]
    
    issues = []
    
    for network in critical_networks:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/networks?tadig=eq.{network['tadig']}",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"  ❌ {network['tadig']}: API error {response.status_code}")
            issues.append(f"{network['tadig']} API error")
            continue
            
        data = response.json()
        
        if not data:
            print(f"  ❌ {network['tadig']}: NOT FOUND IN DATABASE!")
            issues.append(f"{network['tadig']} missing")
            continue
        
        record = data[0]
        
        # Check country
        country_ok = record['country'] == network['expected_country']
        if 'error_if_country' in network and record['country'] == network['error_if_country']:
            country_ok = False
            
        # Check network name
        network_ok = any(expected in record['network_name'] for expected in network['expected_network'])
        if 'error_if_network' in network and record['network_name'] == network['error_if_network']:
            network_ok = False
            
        if country_ok and network_ok:
            print(f"  ✅ {network['tadig']}: {record['country']} - {record['network_name']}")
        else:
            print(f"  ❌ {network['tadig']}: {record['country']} - {record['network_name']}")
            if not country_ok:
                print(f"     Expected country: {network['expected_country']}")
            if not network_ok:
                print(f"     Expected network to contain: {network['expected_network']}")
            issues.append(f"{network['tadig']} has wrong data")
    
    return issues

def check_unknown_countries():
    """Check for networks with Unknown country"""
    print("\n🔍 Checking for Unknown Countries...")
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/networks?or=(country.eq.Unknown,country.is.null)",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"  ❌ API error: {response.status_code}")
        return ["API error checking unknown countries"]
    
    data = response.json()
    
    if not data:
        print(f"  ✅ No networks with Unknown country")
        return []
    else:
        print(f"  ❌ Found {len(data)} networks with Unknown country:")
        for network in data[:10]:  # Show first 10
            print(f"     • {network['tadig']}: {network['network_name']}")
        if len(data) > 10:
            print(f"     • ... and {len(data) - 10} more")
        return [f"{len(data)} networks with Unknown country"]

def check_html_entities():
    """Check for HTML entities in network names"""
    print("\n🔍 Checking for HTML Entities...")
    
    # Check for &amp;
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/networks?or=(network_name.like.*%26amp%3B*,country.like.*%26amp%3B*)",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"  ❌ API error: {response.status_code}")
        return ["API error checking HTML entities"]
    
    data = response.json()
    
    if not data:
        print(f"  ✅ No HTML entities found")
        return []
    else:
        print(f"  ❌ Found {len(data)} networks with HTML entities:")
        for network in data[:5]:
            print(f"     • {network['tadig']}: {network['network_name']}")
        return [f"{len(data)} networks with HTML entities"]

def check_swapped_fields():
    """Check for potential country/network swaps"""
    print("\n🔍 Checking for Swapped Country/Network Fields...")
    
    # Networks where the network_name looks like a country
    suspicious_names = ['Canada', 'United States', 'Mexico', 'Germany', 'France', 
                       'Spain', 'Italy', 'Japan', 'China', 'Australia']
    
    issues = []
    for country_name in suspicious_names:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/networks?network_name=eq.{country_name}",
            headers=headers
        )
        
        if response.status_code == 200 and response.json():
            data = response.json()
            for network in data:
                print(f"  ⚠️  {network['tadig']}: network=\"{network['network_name']}\" country=\"{network['country']}\"")
                issues.append(f"{network['tadig']} may have swapped fields")
    
    if not issues:
        print("  ✅ No obvious country/network swaps detected")
    
    return issues

def check_data_statistics():
    """Check overall data statistics"""
    print("\n📊 Data Statistics...")
    
    # Total networks
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/networks?select=tadig",
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    )
    
    if response.status_code == 200:
        total = len(response.json())
        print(f"  Total networks: {total}")
        
        if total < 1000:
            print(f"    ⚠️  Warning: Expected ~1,291 networks, found only {total}")
        elif total > 1500:
            print(f"    ⚠️  Warning: Expected ~1,291 networks, found {total} (possible duplicates)")
        else:
            print(f"    ✅ Network count looks reasonable")
    
    # Count by source (if you have source tracking)
    # This would need to be adjusted based on your actual schema
    
    return []

def generate_report(all_issues):
    """Generate final validation report"""
    print("\n" + "="*60)
    print("📋 VALIDATION REPORT")
    print("="*60)
    
    if not all_issues:
        print("\n✅ ALL CHECKS PASSED! Data import looks good.")
        print("\n🎉 The import appears to be using the fixed parser.")
    else:
        print(f"\n❌ FOUND {len(all_issues)} ISSUES:")
        for issue in all_issues:
            print(f"  • {issue}")
        
        print("\n🔧 TO FIX THESE ISSUES:")
        print("  1. Read IMPORTANT-DATA-IMPORT-README.md")
        print("  2. Use: npx tsx import-with-fixed-parser.js")
        print("  3. Or manually fix using the Supabase dashboard")
        
        if any('CANST' in issue for issue in all_issues):
            print("\n⚠️  CANST FIX COMMAND:")
            print("  curl -X PATCH \\")
            print(f"    \"{SUPABASE_URL}/rest/v1/networks?tadig=eq.CANST\" \\")
            print(f"    -H \"apikey: {SUPABASE_KEY}\" \\")
            print("    -H \"Content-Type: application/json\" \\")
            print("    -d '{\"network_name\": \"SaskTel\", \"country\": \"Canada\"}'")

def main():
    print("="*60)
    print("🧪 POST-IMPORT VALIDATION")
    print("="*60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Database: {SUPABASE_URL}")
    
    all_issues = []
    
    # Run all checks
    all_issues.extend(check_critical_networks())
    all_issues.extend(check_unknown_countries())
    all_issues.extend(check_html_entities())
    all_issues.extend(check_swapped_fields())
    all_issues.extend(check_data_statistics())
    
    # Generate report
    generate_report(all_issues)
    
    # Exit with error code if issues found
    if all_issues:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()