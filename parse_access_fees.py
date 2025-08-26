#!/usr/bin/env python3
"""
Parse Access Fees from Invoice Comments Column
Access fee = IMSI fee (they are the same thing)
"""

import pandas as pd
import re
import warnings
warnings.filterwarnings('ignore')

def extract_access_fee_from_comments(comments):
    """
    Extract access fee from comments like "0.5 Access fee"
    Returns: (fee_amount, is_prohibited, other_notes)
    """
    if pd.isna(comments):
        return 0, False, ""
    
    comments_str = str(comments).strip()
    
    # Check for prohibited network
    if 'prohibited network' in comments_str.lower():
        return 0, True, 'prohibited network'
    
    # Extract access fee using regex
    # Matches patterns like "0.5 Access fee", "0.13 Access fee"
    fee_pattern = r'(\d+\.?\d*)\s*[Aa]ccess\s*fee'
    match = re.search(fee_pattern, comments_str)
    
    if match:
        fee = float(match.group(1))
        # Remove the access fee part from comments to get other notes
        other_notes = re.sub(fee_pattern, '', comments_str).strip()
        return fee, False, other_notes
    
    # Check for other restrictions
    restrictions = []
    if 'no permanent roaming' in comments_str.lower():
        restrictions.append('no permanent roaming')
    if 'data not launched' in comments_str.lower():
        restrictions.append('data not launched')
    if 'no resell' in comments_str.lower():
        restrictions.append('no resell on domestic market')
    
    return 0, False, ', '.join(restrictions) if restrictions else comments_str

def parse_invoice_with_access_fees(filepath):
    """
    Parse the invoice file and extract access fees from comments
    """
    print(f"📄 Parsing Invoice: {filepath}\n")
    
    # Read the Pricelist sheet
    df = pd.read_excel(filepath, sheet_name='Pricelist 2024-11-01', header=0)
    
    print(f"Total rows: {len(df)}")
    print("\nColumn headers found:")
    print(df.columns.tolist())
    
    # Process each row
    results = []
    networks_with_fees = 0
    prohibited_networks = 0
    restricted_networks = 0
    
    for idx, row in df.iterrows():
        if pd.isna(row.get('TADIG', '')):
            continue
        
        tadig = str(row['TADIG']).strip()
        country = str(row.get('Country', '')).strip()
        network = str(row.get('Network', '')).strip()
        
        # Get the comments column (might be named differently)
        comments = row.get('Comments', row.get('Access fee per IMSI Comments', ''))
        
        # Extract access fee and restrictions
        access_fee, is_prohibited, notes = extract_access_fee_from_comments(comments)
        
        # Get data rate
        data_rate = 0
        if 'Data/MB' in row:
            try:
                data_rate = float(row['Data/MB']) if not pd.isna(row['Data/MB']) else 0
            except:
                data_rate = 0
        
        network_info = {
            'tadig': tadig,
            'country': country,
            'network': network,
            'access_fee_per_imsi': access_fee,
            'data_per_mb': data_rate,
            'is_prohibited': is_prohibited,
            'restrictions': notes,
            'original_comments': str(comments) if not pd.isna(comments) else ''
        }
        
        results.append(network_info)
        
        if access_fee > 0:
            networks_with_fees += 1
        if is_prohibited:
            prohibited_networks += 1
        if notes and not is_prohibited:
            restricted_networks += 1
    
    print(f"\n📊 Summary:")
    print(f"  Total networks parsed: {len(results)}")
    print(f"  Networks with access fees: {networks_with_fees}")
    print(f"  Prohibited networks: {prohibited_networks}")
    print(f"  Networks with other restrictions: {restricted_networks}")
    
    return results

def show_sample_networks(results, sample_size=10):
    """
    Show sample of networks with access fees and restrictions
    """
    print("\n" + "="*60)
    print("💰 NETWORKS WITH ACCESS FEES (IMSI FEES)")
    print("="*60)
    
    with_fees = [r for r in results if r['access_fee_per_imsi'] > 0]
    for net in with_fees[:sample_size]:
        print(f"\n{net['tadig']} - {net['network']} ({net['country']})")
        print(f"  Access fee: €{net['access_fee_per_imsi']}")
        print(f"  Data rate: ${net['data_per_mb']}/MB")
        if net['restrictions']:
            print(f"  Notes: {net['restrictions']}")
    
    print("\n" + "="*60)
    print("🚫 PROHIBITED NETWORKS")
    print("="*60)
    
    prohibited = [r for r in results if r['is_prohibited']]
    for net in prohibited[:sample_size]:
        print(f"\n{net['tadig']} - {net['network']} ({net['country']})")
        print(f"  Status: PROHIBITED")
        print(f"  Data rate: ${net['data_per_mb']}/MB")
    
    print("\n" + "="*60)
    print("⚠️ NETWORKS WITH RESTRICTIONS")
    print("="*60)
    
    restricted = [r for r in results if r['restrictions'] and not r['is_prohibited']]
    for net in restricted[:sample_size]:
        print(f"\n{net['tadig']} - {net['network']} ({net['country']})")
        print(f"  Restriction: {net['restrictions']}")
        print(f"  Data rate: ${net['data_per_mb']}/MB")

def check_australia_networks(results):
    """
    Specifically check Australia networks
    """
    print("\n" + "="*60)
    print("🇦🇺 AUSTRALIA NETWORKS DETAIL CHECK")
    print("="*60)
    
    aus_networks = [r for r in results if r['tadig'].startswith('AUS')]
    
    for net in aus_networks:
        print(f"\n{net['tadig']} - {net['network']}")
        print(f"  Access fee (IMSI fee): €{net['access_fee_per_imsi']}")
        print(f"  Data rate: ${net['data_per_mb']}/MB")
        print(f"  Prohibited: {'YES' if net['is_prohibited'] else 'NO'}")
        print(f"  Original comment: '{net['original_comments']}'")

# Main execution
if __name__ == "__main__":
    import os
    
    invoice_file = '0- Invoice Monogoto 2025-04.xlsx'
    
    if os.path.exists(invoice_file):
        results = parse_invoice_with_access_fees(invoice_file)
        show_sample_networks(results)
        check_australia_networks(results)
        
        # Export to CSV for verification
        df = pd.DataFrame(results)
        output_file = 'parsed_access_fees.csv'
        df.to_csv(output_file, index=False)
        print(f"\n✅ Results exported to {output_file}")
    else:
        print(f"❌ File not found: {invoice_file}")