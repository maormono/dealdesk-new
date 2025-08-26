import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uddmjjgnexdazfedrytt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCarrierData() {
  console.log('Checking Verizon and Bell pricing data...\n');
  
  // Check Verizon networks
  const { data: verizonNetworks, error: vError } = await supabase
    .from('networks')
    .select(`
      id,
      network_name,
      country,
      tadig,
      network_pricing (
        data_per_mb,
        sms_mo,
        imsi_access_fee,
        pricing_sources (
          source_name
        )
      )
    `)
    .ilike('network_name', '%verizon%');
  
  if (!vError && verizonNetworks) {
    console.log('=== VERIZON NETWORKS ===');
    verizonNetworks.forEach(n => {
      console.log(`\n${n.network_name} (${n.country}) - TADIG: ${n.tadig}`);
      if (n.network_pricing && n.network_pricing.length > 0) {
        n.network_pricing.forEach(p => {
          const pricePerGB = p.data_per_mb ? (p.data_per_mb * 1024).toFixed(2) : 'NULL';
          console.log(`  - Operator: ${p.pricing_sources?.source_name || 'Unknown'}`);
          console.log(`    Data: €${p.data_per_mb || 0}/MB (€${pricePerGB}/GB)`);
          console.log(`    IMSI: €${p.imsi_access_fee || 0}`);
        });
      } else {
        console.log('  No pricing data');
      }
    });
  }
  
  // Check Bell networks
  console.log('\n\n=== BELL NETWORKS ===');
  const { data: bellNetworks, error: bError } = await supabase
    .from('networks')
    .select(`
      id,
      network_name,
      country,
      tadig,
      network_pricing (
        data_per_mb,
        sms_mo,
        imsi_access_fee,
        pricing_sources (
          source_name
        )
      )
    `)
    .ilike('network_name', '%bell%');
  
  if (!bError && bellNetworks) {
    bellNetworks.forEach(n => {
      console.log(`\n${n.network_name} (${n.country}) - TADIG: ${n.tadig}`);
      if (n.network_pricing && n.network_pricing.length > 0) {
        n.network_pricing.forEach(p => {
          const pricePerGB = p.data_per_mb ? (p.data_per_mb * 1024).toFixed(2) : 'NULL';
          console.log(`  - Operator: ${p.pricing_sources?.source_name || 'Unknown'}`);
          console.log(`    Data: €${p.data_per_mb || 0}/MB (€${pricePerGB}/GB)`);
          console.log(`    IMSI: €${p.imsi_access_fee || 0}`);
        });
      } else {
        console.log('  No pricing data');
      }
    });
  }
  
  // Check for any Tele2 pricing with 0 or null data rates
  console.log('\n\n=== CHECKING TELE2 ZERO/NULL PRICES ===');
  const { data: tele2Pricing, error: t2Error } = await supabase
    .from('network_pricing')
    .select(`
      data_per_mb,
      imsi_access_fee,
      networks (
        network_name,
        country,
        tadig
      ),
      pricing_sources (
        source_name
      )
    `)
    .eq('source_id', 3) // Tele2 is ID 3
    .or('data_per_mb.is.null,data_per_mb.eq.0');
  
  if (!t2Error && tele2Pricing) {
    console.log(`Found ${tele2Pricing.length} Tele2 entries with null or zero data rates:`);
    tele2Pricing.forEach(p => {
      console.log(`  - ${p.networks?.network_name} (${p.networks?.country})`);
      console.log(`    Data rate: ${p.data_per_mb === null ? 'NULL' : p.data_per_mb}`);
      console.log(`    IMSI fee: €${p.imsi_access_fee || 0}`);
    });
  }
}

checkCarrierData();