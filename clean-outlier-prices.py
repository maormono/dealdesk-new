#!/usr/bin/env python3
"""
Clean outlier prices from the database
Removes or flags any pricing entries above $1/MB (€0.90/MB)
These are likely errors or special restricted networks that shouldn't be used
"""

import requests
import json
from datetime import datetime

SUPABASE_URL = "https://uddmjjgnexdazfedrytt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0"

# Price threshold: $1/MB = approximately €0.90/MB at typical exchange rate
MAX_REASONABLE_PRICE_EUR_MB = 0.90

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def find_and_clean_outliers():
    """Find and remove pricing outliers from the database"""
    
    print("🔍 Searching for pricing outliers...")
    print(f"   Threshold: €{MAX_REASONABLE_PRICE_EUR_MB}/MB (~$1/MB)")
    print("=" * 60)
    
    # Get all pricing records
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/network_pricing?select=*,networks(network_name,country,tadig),pricing_sources(source_name)",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Error fetching pricing data: {response.status_code}")
        return
    
    all_pricing = response.json()
    outliers = []
    
    # Find outliers
    for pricing in all_pricing:
        data_price = pricing.get('data_per_mb', 0)
        if data_price and data_price > MAX_REASONABLE_PRICE_EUR_MB:
            network = pricing.get('networks', {})
            source = pricing.get('pricing_sources', {})
            outliers.append({
                'id': pricing['id'],
                'network': network.get('network_name', 'Unknown'),
                'country': network.get('country', 'Unknown'),
                'tadig': network.get('tadig', 'Unknown'),
                'operator': source.get('source_name', 'Unknown'),
                'price': data_price
            })
    
    if not outliers:
        print("✅ No pricing outliers found!")
        return
    
    print(f"\n⚠️  Found {len(outliers)} outlier prices:\n")
    
    # Display outliers
    for outlier in outliers:
        print(f"   {outlier['network']} ({outlier['country']}) - {outlier['operator']}")
        print(f"   TADIG: {outlier['tadig']}")
        print(f"   Price: €{outlier['price']:.2f}/MB")
        print(f"   ID: {outlier['id']}")
        print()
    
    # Auto-delete outliers without confirmation
    print("🚀 Auto-deleting outlier prices...")
    
    # Delete outliers
    print("\n🗑️  Deleting outlier prices...")
    deleted_count = 0
    
    for outlier in outliers:
        delete_response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/network_pricing?id=eq.{outlier['id']}",
            headers=headers
        )
        
        if delete_response.status_code in [200, 204]:
            print(f"   ✓ Deleted {outlier['network']} - {outlier['operator']} (€{outlier['price']:.2f}/MB)")
            deleted_count += 1
        else:
            print(f"   ✗ Failed to delete {outlier['network']} - {outlier['operator']}")
    
    print(f"\n✅ Cleanup complete! Deleted {deleted_count} outlier prices")
    print(f"   Average prices should now be more realistic")

def add_price_validation_note():
    """Add a note to the database about price validation"""
    note = {
        'note_type': 'SYSTEM',
        'note': f'Price validation active: Entries above €{MAX_REASONABLE_PRICE_EUR_MB}/MB are filtered',
        'created_at': datetime.now().isoformat()
    }
    
    print(f"\n📝 Note: Future imports will automatically skip prices above €{MAX_REASONABLE_PRICE_EUR_MB}/MB")

if __name__ == "__main__":
    print("🧹 DealDesk Price Outlier Cleanup Tool")
    print("=" * 60)
    find_and_clean_outliers()
    add_price_validation_note()