#!/usr/bin/env python3
"""
Correctly parse Access Fees from Invoice 
Access fee is in its own column: "Access fee per IMSI, EUR/month"
Comments column contains labels and restrictions
"""

import pandas as pd
import warnings
warnings.filterwarnings('ignore')

def parse_invoice_correctly(filepath):
    """
    Parse the invoice file with correct column mapping
    """
    print(f"📄 Parsing Invoice: {filepath}\n")
    
    # Read the Pricelist sheet
    df = pd.read_excel(filepath, sheet_name='Pricelist 2024-11-01', header=0)
    
    print(f"Total rows: {len(df)}")
    
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
        
        # Get access fee from the dedicated column
        access_fee = 0
        access_fee_col = row.get('Access fee per IMSI, EUR/month', 0)
        if not pd.isna(access_fee_col):
            try:
                access_fee = float(access_fee_col)
            except:
                access_fee = 0
        
        # Get comments for restrictions
        comments = str(row.get('Comments', '')) if not pd.isna(row.get('Comments', '')) else ''
        
        # Parse restrictions
        is_prohibited = 'prohibited network' in comments.lower()
        no_roaming = 'no permanent roaming' in comments.lower()
        data_not_launched = 'data not launched' in comments.lower()
        no_resell = 'no resell' in comments.lower()
        
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
            'access_fee_eur': access_fee,
            'data_per_mb': data_rate,
            'is_prohibited': is_prohibited,
            'no_roaming': no_roaming,
            'data_not_launched': data_not_launched,
            'no_resell': no_resell,
            'comments': comments
        }
        
        results.append(network_info)
        
        if access_fee > 0:
            networks_with_fees += 1
        if is_prohibited:
            prohibited_networks += 1
        if no_roaming or data_not_launched or no_resell:
            restricted_networks += 1
    
    print(f"\n📊 Summary:")
    print(f"  Total networks parsed: {len(results)}")
    print(f"  Networks with access fees: {networks_with_fees}")
    print(f"  Prohibited networks: {prohibited_networks}")
    print(f"  Networks with other restrictions: {restricted_networks}")
    
    return results

def show_networks_with_fees(results):
    """
    Show all networks with access fees
    """
    print("\n" + "="*70)
    print("💰 ALL NETWORKS WITH ACCESS FEES (IMSI FEES)")
    print("="*70)
    
    with_fees = [r for r in results if r['access_fee_eur'] > 0]
    
    # Sort by fee amount
    with_fees.sort(key=lambda x: x['access_fee_eur'], reverse=True)
    
    print(f"\nTotal: {len(with_fees)} networks with access fees\n")
    
    for net in with_fees:
        print(f"{net['tadig']:8} - {net['network'][:30]:30} ({net['country'][:15]:15}) : €{net['access_fee_eur']:6.2f}/month")
    
    # Summary statistics
    if with_fees:
        fees = [n['access_fee_eur'] for n in with_fees]
        print(f"\n📈 Access Fee Statistics:")
        print(f"  Highest: €{max(fees):.2f}")
        print(f"  Lowest:  €{min(fees):.2f}")
        print(f"  Average: €{sum(fees)/len(fees):.2f}")

def show_prohibited_and_restricted(results):
    """
    Show prohibited and restricted networks
    """
    print("\n" + "="*70)
    print("🚫 PROHIBITED NETWORKS")
    print("="*70)
    
    prohibited = [r for r in results if r['is_prohibited']]
    for net in prohibited:
        print(f"{net['tadig']:8} - {net['network']:30} ({net['country']})")
    
    print(f"\nTotal: {len(prohibited)} prohibited networks")
    
    print("\n" + "="*70)
    print("⚠️  RESTRICTED NETWORKS")
    print("="*70)
    
    restricted = [r for r in results if r['no_roaming'] or r['data_not_launched'] or r['no_resell']]
    for net in restricted:
        restrictions = []
        if net['no_roaming']:
            restrictions.append('NO ROAMING')
        if net['data_not_launched']:
            restrictions.append('DATA NOT LAUNCHED')
        if net['no_resell']:
            restrictions.append('NO RESELL')
        
        print(f"{net['tadig']:8} - {net['network']:30} : {', '.join(restrictions)}")
    
    print(f"\nTotal: {len(restricted)} networks with restrictions")

def check_specific_countries(results, countries=['Australia', 'Austria', 'Argentina']):
    """
    Check specific countries in detail
    """
    for country in countries:
        print(f"\n" + "="*70)
        print(f"🌍 {country.upper()} NETWORKS DETAIL")
        print("="*70)
        
        country_nets = [r for r in results if country.lower() in r['country'].lower()]
        
        for net in country_nets:
            print(f"\n{net['tadig']} - {net['network']}")
            print(f"  Access fee: €{net['access_fee_eur']:.2f}/month")
            print(f"  Data rate: ${net['data_per_mb']}/MB")
            
            status = []
            if net['is_prohibited']:
                status.append('PROHIBITED')
            if net['no_roaming']:
                status.append('NO ROAMING')
            if net['data_not_launched']:
                status.append('DATA NOT LAUNCHED')
            if net['no_resell']:
                status.append('NO RESELL')
            
            if status:
                print(f"  ⚠️  Status: {', '.join(status)}")
            
            if net['comments'] and net['comments'] != 'Access fee':
                print(f"  📝 Comments: {net['comments']}")

# Main execution
if __name__ == "__main__":
    import os
    
    invoice_file = '0- Invoice Monogoto 2025-04.xlsx'
    
    if os.path.exists(invoice_file):
        results = parse_invoice_correctly(invoice_file)
        
        show_networks_with_fees(results)
        show_prohibited_and_restricted(results)
        check_specific_countries(results)
        
        # Export to CSV
        df = pd.DataFrame(results)
        output_file = 'access_fees_complete.csv'
        df.to_csv(output_file, index=False)
        print(f"\n✅ Complete results exported to {output_file}")
    else:
        print(f"❌ File not found: {invoice_file}")