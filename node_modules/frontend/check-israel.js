import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uddmjjgnexdazfedrytt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIsraelData() {
  console.log('Checking for Israel data...\n');
  
  // First check if Israel exists in countries
  const { data: israelNetworks, error } = await supabase
    .from('networks')
    .select('*')
    .eq('country', 'Israel');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${israelNetworks?.length || 0} networks in Israel`);
  
  if (israelNetworks && israelNetworks.length > 0) {
    console.log('\nIsrael networks:');
    israelNetworks.forEach(n => {
      console.log(`- ${n.network_name} (TADIG: ${n.tadig})`);
    });
  }
  
  // Check with pricing
  const { data: israelWithPricing, error: error2 } = await supabase
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
    .eq('country', 'Israel');
  
  if (israelWithPricing && israelWithPricing.length > 0) {
    console.log('\n\nIsrael networks with pricing:');
    israelWithPricing.forEach(n => {
      if (n.network_pricing && n.network_pricing.length > 0) {
        n.network_pricing.forEach(p => {
          console.log(`\n${n.network_name} (${p.pricing_sources?.source_name}):`);
          console.log(`  Data: €${p.data_per_mb}/MB`);
          console.log(`  SMS: €${p.sms_mo}`);
          console.log(`  IMSI: €${p.imsi_access_fee}`);
        });
      }
    });
  }
  
  // Also check all unique countries
  const { data: allNetworks } = await supabase
    .from('networks')
    .select('country');
  
  const uniqueCountries = [...new Set(allNetworks?.map(n => n.country))].sort();
  console.log('\n\nAll countries in database:');
  console.log(uniqueCountries);
}

checkIsraelData();