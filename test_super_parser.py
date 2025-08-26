import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

class SuperParser:
    def __init__(self):
        self.all_networks = {}
        self.restriction_patterns = {
            'prohibited': 'prohibited',
            'no_roaming': 'no permanent roaming',
            'data_not_launched': 'data not launched',
            'no_resell': 'no resell'
        }
    
    def parse_number(self, value):
        """Parse number from various formats"""
        if pd.isna(value) or value == '':
            return 0
        try:
            if isinstance(value, (int, float)):
                return float(value)
            # Remove non-numeric characters
            clean = str(value).replace('€', '').replace('$', '').strip()
            return float(clean)
        except:
            return 0
    
    def parse_restrictions(self, text):
        """Parse restriction text into flags"""
        if pd.isna(text):
            return {}
        
        text_lower = str(text).lower()
        result = {}
        
        if 'prohibited' in text_lower:
            result['prohibited_network'] = True
        if 'no permanent roaming' in text_lower:
            result['no_roaming'] = True
        if 'data not launched' in text_lower:
            result['data_not_launched'] = True
        if 'no resell' in text_lower:
            result['no_resell'] = True
        
        # Extract access fee from comments
        import re
        fee_match = re.search(r'(\d+\.?\d*)\s*access fee', text_lower)
        if fee_match:
            result['extracted_access_fee'] = float(fee_match.group(1))
        
        return result
    
    def parse_invoice_file(self, filepath):
        """Parse Invoice file with IMSI fees and restrictions"""
        print(f'\n📄 Parsing Invoice file: {filepath}')
        
        xl = pd.ExcelFile(filepath)
        results = []
        
        # Parse price list sheet
        if 'Pricelist 2024-11-01' in xl.sheet_names:
            df = pd.read_excel(filepath, sheet_name='Pricelist 2024-11-01', header=0)
            print(f"Found {len(df)} rows in price sheet")
            
            for idx, row in df.iterrows():
                if pd.isna(row.get('TADIG', row.iloc[2] if len(row) > 2 else None)):
                    continue
                
                tadig = str(row.get('TADIG', row.iloc[2])).strip()
                
                # Get comments/notes
                comments_col = 'Comments' if 'Comments' in row else (row.iloc[9] if len(row) > 9 else '')
                comments = str(comments_col) if not pd.isna(comments_col) else ''
                
                # Parse access fee
                access_fee = 0
                if 'Access fee' in row:
                    access_fee = self.parse_number(row['Access fee'])
                elif len(row) > 8:
                    access_fee = self.parse_number(row.iloc[8])
                
                # Parse restrictions
                restrictions = self.parse_restrictions(comments)
                if 'extracted_access_fee' in restrictions and access_fee == 0:
                    access_fee = restrictions['extracted_access_fee']
                
                network = {
                    'tadig': tadig,
                    'country': str(row.get('Country', row.iloc[0] if len(row) > 0 else '')).strip(),
                    'network': str(row.get('Network', row.iloc[1] if len(row) > 1 else '')).strip(),
                    'imsi_access_fee': access_fee,
                    'data_per_mb': self.parse_number(row.get('Data/MB', row.iloc[6] if len(row) > 6 else 0)),
                    'sms_rate': self.parse_number(row.get('SMS', row.iloc[5] if len(row) > 5 else 0)),
                    'source': 'Invoice',
                    'special_notes': comments,
                    **restrictions
                }
                
                results.append(network)
                self.all_networks[tadig] = network
        
        print(f"✅ Parsed {len(results)} networks from Invoice")
        
        # Show networks with restrictions
        restricted = [n for n in results if any([
            n.get('prohibited_network'),
            n.get('data_not_launched'),
            n.get('no_roaming')
        ])]
        
        if restricted:
            print(f"\n⚠️  Found {len(restricted)} networks with restrictions:")
            for n in restricted[:5]:
                print(f"  {n['tadig']} ({n['network']}): {n['special_notes']}")
        
        # Show networks with IMSI fees
        with_fees = [n for n in results if n['imsi_access_fee'] > 0]
        if with_fees:
            print(f"\n💰 Found {len(with_fees)} networks with IMSI fees:")
            for n in with_fees[:5]:
                print(f"  {n['tadig']} ({n['network']}): €{n['imsi_access_fee']}")
        
        return results
    
    def parse_a1_file(self, filepath):
        """Parse A1 file"""
        print(f'\n📘 Parsing A1 file: {filepath}')
        
        df = pd.read_excel(filepath, sheet_name='prices A1 WS', header=7)
        results = []
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('TADIG', row.iloc[4] if len(row) > 4 else None)):
                continue
            
            tadig = str(row.get('TADIG', row.iloc[4])).strip()
            restrictions = str(row.iloc[6]) if len(row) > 6 and not pd.isna(row.iloc[6]) else ''
            
            network = {
                'tadig': tadig,
                'country': str(row.iloc[0]) if not pd.isna(row.iloc[0]) else '',
                'network': str(row.iloc[1]) if not pd.isna(row.iloc[1]) else '',
                'imsi_access_fee': self.parse_number(row.get('General', row.iloc[24] if len(row) > 24 else 0)),
                'data_per_mb': self.parse_number(row.get('price/MB', row.iloc[27] if len(row) > 27 else 0)),
                'technologies': {
                    'gsm': row.iloc[8] == 'Live' if len(row) > 8 else False,
                    '2g': row.iloc[9] == 'Live' if len(row) > 9 else False,
                    '3g': row.iloc[10] == 'Live' if len(row) > 10 else False,
                    '4g': row.iloc[11] == 'Live' if len(row) > 11 else False,
                    '5g': row.iloc[12] == 'Live' if len(row) > 12 else False,
                },
                'source': 'A1',
                'restrictions': restrictions,
                **self.parse_restrictions(restrictions)
            }
            
            results.append(network)
            
            # Update if not from Invoice
            if tadig not in self.all_networks or self.all_networks[tadig]['source'] != 'Invoice':
                self.all_networks[tadig] = network
        
        print(f"✅ Parsed {len(results)} networks from A1")
        return results
    
    def compare_network(self, tadig):
        """Compare specific network across sources"""
        if tadig not in self.all_networks:
            print(f"Network {tadig} not found")
            return
        
        network = self.all_networks[tadig]
        print(f"\n📊 Network: {tadig} - {network['network']} ({network['country']})")
        print(f"  Source: {network['source']}")
        print(f"  IMSI Fee: €{network.get('imsi_access_fee', 0)}")
        print(f"  Data Rate: ${network.get('data_per_mb', 0)}/MB")
        
        if network.get('prohibited_network'):
            print(f"  ⚠️  PROHIBITED NETWORK")
        if network.get('data_not_launched'):
            print(f"  ⚠️  DATA NOT LAUNCHED")
        if network.get('special_notes'):
            print(f"  📝 Notes: {network['special_notes']}")
    
    def get_summary(self):
        """Get summary statistics"""
        networks = list(self.all_networks.values())
        by_source = {}
        
        for n in networks:
            source = n['source']
            by_source[source] = by_source.get(source, 0) + 1
        
        with_imsi = [n for n in networks if n.get('imsi_access_fee', 0) > 0]
        prohibited = [n for n in networks if n.get('prohibited_network')]
        not_launched = [n for n in networks if n.get('data_not_launched')]
        
        return {
            'total_networks': len(networks),
            'networks_with_imsi': len(with_imsi),
            'prohibited_networks': len(prohibited),
            'data_not_launched': len(not_launched),
            'by_source': by_source
        }

# Test the parser
print('🚀 Super Parser Test')
print('=' * 50)

parser = SuperParser()

# Parse Invoice file
import os
if os.path.exists('0- Invoice Monogoto 2025-04.xlsx'):
    parser.parse_invoice_file('0- Invoice Monogoto 2025-04.xlsx')

# Parse A1 file
if os.path.exists('202509_Country Price List A1 IMSI Sponsoring.xlsx'):
    parser.parse_a1_file('202509_Country Price List A1 IMSI Sponsoring.xlsx')

# Show summary
print('\n' + '=' * 50)
print('📊 OVERALL SUMMARY')
print('=' * 50)

summary = parser.get_summary()
print(f"Total Networks: {summary['total_networks']}")
print(f"Networks with IMSI Fees: {summary['networks_with_imsi']}")
print(f"Prohibited Networks: {summary['prohibited_networks']}")
print(f"Data Not Launched: {summary['data_not_launched']}")
print(f"\nBy Source:")
for source, count in summary['by_source'].items():
    print(f"  {source}: {count} networks")

# Check Australia networks
print('\n' + '=' * 50)
print('🇦🇺 AUSTRALIA NETWORKS CHECK')
print('=' * 50)

for tadig in ['AUSTA', 'AUSVF', 'AUSOP', 'AUTMM']:
    parser.compare_network(tadig)

# Show networks with restrictions
print('\n' + '=' * 50)
print('⚠️  SAMPLE NETWORKS WITH RESTRICTIONS')
print('=' * 50)

restricted = [n for n in parser.all_networks.values() if any([
    n.get('prohibited_network'),
    n.get('data_not_launched'),
    n.get('no_roaming')
])][:5]

for n in restricted:
    print(f"\n{n['tadig']} - {n['network']} ({n['country']})")
    if n.get('prohibited_network'):
        print('  ❌ Prohibited Network')
    if n.get('data_not_launched'):
        print('  ⏸️  Data Not Launched')
    if n.get('no_roaming'):
        print('  🚫 No Permanent Roaming')
    if n.get('special_notes'):
        print(f"  📝 {n['special_notes']}")

print('\n✅ Super Parser test complete!')