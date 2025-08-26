#!/usr/bin/env python3
"""
Import pricing data from all sources into Supabase
Properly tracks source and handles IMSI/Access fees
"""

import pandas as pd
import os
from datetime import datetime
from supabase import create_client, Client
import json
from typing import Dict, List, Any
import warnings
warnings.filterwarnings('ignore')

# Supabase configuration (set these as environment variables)
SUPABASE_URL = os.getenv('SUPABASE_URL', 'your-supabase-url')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', 'your-anon-key')

class PricingImporter:
    def __init__(self):
        """Initialize Supabase client"""
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.source_ids = {}
        self.network_cache = {}
        self.stats = {
            'networks_created': 0,
            'prices_imported': 0,
            'restrictions_added': 0,
            'errors': []
        }
    
    def get_or_create_network(self, tadig: str, network_name: str, country: str) -> str:
        """Get existing network or create new one"""
        if tadig in self.network_cache:
            return self.network_cache[tadig]
        
        # Check if network exists
        result = self.supabase.table('networks').select('id').eq('tadig', tadig).execute()
        
        if result.data and len(result.data) > 0:
            network_id = result.data[0]['id']
        else:
            # Create new network
            new_network = {
                'tadig': tadig,
                'network_name': network_name,
                'country': country
            }
            result = self.supabase.table('networks').insert(new_network).execute()
            network_id = result.data[0]['id']
            self.stats['networks_created'] += 1
        
        self.network_cache[tadig] = network_id
        return network_id
    
    def get_source_id(self, source_name: str) -> str:
        """Get source ID from database"""
        if source_name in self.source_ids:
            return self.source_ids[source_name]
        
        result = self.supabase.table('pricing_sources').select('id').eq('source_name', source_name).execute()
        if result.data:
            self.source_ids[source_name] = result.data[0]['id']
            return result.data[0]['id']
        else:
            raise ValueError(f"Source {source_name} not found in database")
    
    def import_invoice_tele2(self, filepath: str):
        """Import Tele2 pricing from Invoice file"""
        print("\n📄 Importing Tele2 pricing from Invoice...")
        
        df = pd.read_excel(filepath, sheet_name='Pricelist 2024-11-01', header=0)
        source_id = self.get_source_id('Tele2')
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('TADIG')):
                continue
            
            tadig = str(row['TADIG']).strip()
            network_name = str(row.get('Network', '')).strip()
            country = str(row.get('Country', '')).strip()
            
            # Get or create network
            network_id = self.get_or_create_network(tadig, network_name, country)
            
            # Parse IMSI/Access fee from dedicated column
            imsi_fee = 0
            if not pd.isna(row.get('Access fee per IMSI, EUR/month')):
                imsi_fee = float(row['Access fee per IMSI, EUR/month'])
            
            # Prepare pricing data
            pricing = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': float(row['Data/MB']) if not pd.isna(row.get('Data/MB')) else None,
                'sms_mo': float(row['SMS']) if not pd.isna(row.get('SMS')) else None,
                'voice_moc': float(row['MOC/Min']) if not pd.isna(row.get('MOC/Min')) else None,
                'voice_mtc': float(row['MTC/Min']) if not pd.isna(row.get('MTC/Min')) else None,
                'volte_per_mb': float(row['VoLTE/MB']) if not pd.isna(row.get('VoLTE/MB')) else None,
                'imsi_access_fee': imsi_fee,  # IMPORTANT: Tele2's access fee!
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Upsert pricing
            self.supabase.table('network_pricing').upsert(
                pricing, 
                on_conflict='network_id,source_id,effective_date'
            ).execute()
            self.stats['prices_imported'] += 1
            
            # Handle restrictions from comments
            comments = str(row.get('Comments', '')) if not pd.isna(row.get('Comments')) else ''
            if comments:
                self.process_restrictions(network_id, source_id, comments)
        
        print(f"✅ Imported {self.stats['prices_imported']} Tele2 prices")
    
    def import_a1(self, filepath: str):
        """Import A1 pricing"""
        print("\n📘 Importing A1 pricing...")
        
        df = pd.read_excel(filepath, sheet_name='prices A1 WS', header=7)
        source_id = self.get_source_id('A1')
        count = 0
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('TADIG')) or pd.isna(row.iloc[0]):
                continue
            
            tadig = str(row['TADIG']).strip()
            network_name = str(row.iloc[1]).strip() if not pd.isna(row.iloc[1]) else ''
            country = str(row.iloc[0]).strip()
            
            # Get or create network
            network_id = self.get_or_create_network(tadig, network_name, country)
            
            # Parse IMSI fee from General column (column 24)
            imsi_fee = float(row['General']) if not pd.isna(row.get('General')) else 0
            
            # Parse technologies
            technologies = {
                'gsm': row.iloc[8] == 'Live' if len(row) > 8 else False,
                'gprs_2g': row.iloc[9] == 'Live' if len(row) > 9 else False,
                'umts_3g': row.iloc[10] == 'Live' if len(row) > 10 else False,
                'lte_4g': row.iloc[11] == 'Live' if len(row) > 11 else False,
                'lte_5g': row.iloc[12] == 'Live' if len(row) > 12 else False,
                'lte_m': row.iloc[13] == 'Live' if len(row) > 13 else False,
                'nb_iot': row.iloc[16] == 'Live' if len(row) > 16 else False,
            }
            
            # Prepare pricing data
            pricing = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': float(row['price/MB']) if not pd.isna(row.get('price/MB')) else None,
                'sms_mo': float(row.iloc[30]) if len(row) > 30 and not pd.isna(row.iloc[30]) else None,
                'sms_mt': float(row.iloc[31]) if len(row) > 31 and not pd.isna(row.iloc[31]) else None,
                'voice_moc': float(row.iloc[32]) if len(row) > 32 and not pd.isna(row.iloc[32]) else None,
                'imsi_access_fee': imsi_fee,  # A1's IMSI fee
                **technologies,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Upsert pricing
            self.supabase.table('network_pricing').upsert(
                pricing,
                on_conflict='network_id,source_id,effective_date'
            ).execute()
            count += 1
            
            # Handle restrictions
            if not pd.isna(row.iloc[6]):
                self.process_restrictions(network_id, source_id, str(row.iloc[6]))
        
        print(f"✅ Imported {count} A1 prices")
    
    def import_telefonica(self, filepath: str):
        """Import Telefonica pricing"""
        print("\n📕 Importing Telefonica pricing...")
        
        df = pd.read_excel(filepath, sheet_name='Format All', header=0)
        source_id = self.get_source_id('Telefonica')
        count = 0
        
        for idx, row in df.iterrows():
            if pd.isna(row.get('Tadig')):
                continue
            
            tadig = str(row['Tadig']).strip()
            network_name = str(row.get('Operator', '')).strip()
            country = str(row.get('Country', '')).strip()
            
            # Get or create network
            network_id = self.get_or_create_network(tadig, network_name, country)
            
            # Parse technologies
            technologies = {
                'gsm': row.iloc[14] == 'Live' if len(row) > 14 else False,
                'gprs_2g': row.iloc[17] == 'Live' if len(row) > 17 else False,
                'umts_3g': row.iloc[18] == 'Live' if len(row) > 18 else False,
                'lte_4g': row.iloc[19] == 'Live' if len(row) > 19 else False,
                'lte_5g': row.iloc[20] == 'Live' if len(row) > 20 else False,
                'volte': row.iloc[21] == 'Live' if len(row) > 21 else False,
                'lte_m': row.iloc[22] == 'Live' if len(row) > 22 else False,
                'nb_iot': row.iloc[25] == 'Live' if len(row) > 25 else False,
            }
            
            # Prepare pricing data (Telefonica has NO IMSI fees)
            pricing = {
                'network_id': network_id,
                'source_id': source_id,
                'data_per_mb': float(row['Data']) if not pd.isna(row.get('Data')) else None,
                'sms_mo': float(row['SMS']) if not pd.isna(row.get('SMS')) else None,
                'voice_moc': float(row['MOC']) if not pd.isna(row.get('MOC')) else None,
                'voice_mtc': float(row['MTC']) if not pd.isna(row.get('MTC')) else None,
                'imsi_access_fee': 0,  # Telefonica doesn't charge IMSI fees
                **technologies,
                'is_current': True,
                'effective_date': datetime.now().date().isoformat()
            }
            
            # Upsert pricing
            self.supabase.table('network_pricing').upsert(
                pricing,
                on_conflict='network_id,source_id,effective_date'
            ).execute()
            count += 1
        
        print(f"✅ Imported {count} Telefonica prices")
    
    def process_restrictions(self, network_id: str, source_id: str, comments: str):
        """Process and store network restrictions"""
        comments_lower = comments.lower()
        
        restrictions = []
        if 'prohibited network' in comments_lower:
            restrictions.append(('prohibited', 'Network access prohibited'))
        if 'no permanent roaming' in comments_lower:
            restrictions.append(('no_roaming', 'No permanent roaming allowed'))
        if 'data not launched' in comments_lower:
            restrictions.append(('data_not_launched', 'Data service not yet launched'))
        if 'no resell' in comments_lower:
            restrictions.append(('no_resell', 'No reselling on domestic market'))
        
        for restriction_type, description in restrictions:
            restriction = {
                'network_id': network_id,
                'source_id': source_id,
                'restriction_type': restriction_type,
                'description': description,
                'is_active': True
            }
            self.supabase.table('network_restrictions').insert(restriction).execute()
            self.stats['restrictions_added'] += 1
    
    def verify_australia_pricing(self):
        """Verify Australia pricing is correctly imported"""
        print("\n🔍 Verifying Australia pricing...")
        
        result = self.supabase.rpc('get_pricing_comparison', {'p_tadig': 'AUSTA'}).execute()
        
        print("\nAUSTA (Telstra) pricing by source:")
        for row in result.data:
            print(f"  {row['source_name']}: IMSI fee €{row['imsi_access_fee']}, Data ${row['data_per_mb']}/MB")
        
        # Check all Australia networks
        aus_result = self.supabase.table('v_australia_pricing').select('*').execute()
        print(f"\nTotal Australia entries: {len(aus_result.data)}")
    
    def run_import(self):
        """Run the complete import process"""
        print("🚀 Starting Supabase import...")
        print("=" * 60)
        
        # Import from each source
        if os.path.exists('0- Invoice Monogoto 2025-04.xlsx'):
            self.import_invoice_tele2('0- Invoice Monogoto 2025-04.xlsx')
        
        if os.path.exists('202509_Country Price List A1 IMSI Sponsoring.xlsx'):
            self.import_a1('202509_Country Price List A1 IMSI Sponsoring.xlsx')
        
        if os.path.exists('20250205 Monogoto TGS UK V1.xlsx'):
            self.import_telefonica('20250205 Monogoto TGS UK V1.xlsx')
        
        # Verify results
        self.verify_australia_pricing()
        
        print("\n" + "=" * 60)
        print("📊 Import Summary:")
        print(f"  Networks created: {self.stats['networks_created']}")
        print(f"  Prices imported: {self.stats['prices_imported']}")
        print(f"  Restrictions added: {self.stats['restrictions_added']}")
        if self.stats['errors']:
            print(f"  Errors: {len(self.stats['errors'])}")
        
        print("\n✅ Import complete!")

# Configuration helper
def setup_supabase_env():
    """Helper to set up Supabase environment"""
    print("\n📝 Supabase Setup Instructions:")
    print("1. Create a new project at https://supabase.com")
    print("2. Run the schema.sql file in the SQL editor")
    print("3. Get your project URL and anon key from Settings > API")
    print("4. Set environment variables:")
    print("   export SUPABASE_URL='your-project-url'")
    print("   export SUPABASE_ANON_KEY='your-anon-key'")
    print("\nOr create a .env file with:")
    print("SUPABASE_URL=your-project-url")
    print("SUPABASE_ANON_KEY=your-anon-key")

if __name__ == "__main__":
    if not SUPABASE_URL or SUPABASE_URL == 'your-supabase-url':
        setup_supabase_env()
    else:
        importer = PricingImporter()
        importer.run_import()