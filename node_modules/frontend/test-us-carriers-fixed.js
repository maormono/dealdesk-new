import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uddmjjgnexdazfedrytt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUSCarriers() {
  console.log('Checking for US carriers (AT&T and T-Mobile)...\n');
  
  // Check United States networks (not USA)
  const { data: usNetworks, error } = await supabase
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
        lte_m,
        nb_iot,
        pricing_sources (
          source_name
        )
      )
    `)
    .eq('country', 'United States');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${usNetworks?.length || 0} networks in United States\n`);
  
  // Look for AT&T
  const attNetworks = usNetworks?.filter(n => 
    n.network_name.toLowerCase().includes('at&t') || 
    n.network_name.toLowerCase().includes('at & t') ||
    n.network_name.toLowerCase().includes('att')
  );
  
  console.log('AT&T Networks:');
  if (attNetworks && attNetworks.length > 0) {
    attNetworks.forEach(n => {
      console.log(`\n${n.network_name} (TADIG: ${n.tadig})`);
      n.network_pricing?.forEach(p => {
        const pricePerGB = p.data_per_mb ? (p.data_per_mb * 1024).toFixed(2) : 'N/A';
        console.log(`  - ${p.pricing_sources?.source_name}: €${p.data_per_mb?.toFixed(4)}/MB (€${pricePerGB}/GB)`);
        console.log(`    IMSI: €${p.imsi_access_fee || 0}`);
      });
    });
  } else {
    console.log('  No AT&T networks found');
  }
  
  // Look for T-Mobile
  const tmobileNetworks = usNetworks?.filter(n => 
    n.network_name.toLowerCase().includes('t-mobile') || 
    n.network_name.toLowerCase().includes('tmobile')
  );
  
  console.log('\n\nT-Mobile Networks:');
  if (tmobileNetworks && tmobileNetworks.length > 0) {
    tmobileNetworks.forEach(n => {
      console.log(`\n${n.network_name} (TADIG: ${n.tadig})`);
      n.network_pricing?.forEach(p => {
        const pricePerGB = p.data_per_mb ? (p.data_per_mb * 1024).toFixed(2) : 'N/A';
        console.log(`  - ${p.pricing_sources?.source_name}: €${p.data_per_mb?.toFixed(4)}/MB (€${pricePerGB}/GB)`);
        console.log(`    IMSI: €${p.imsi_access_fee || 0}`);
      });
    });
  } else {
    console.log('  No T-Mobile networks found');
  }
  
  // Show all US networks
  console.log('\n\nAll United States Networks:');
  const sortedNetworks = usNetworks?.sort((a, b) => {
    const aPrice = a.network_pricing?.[0]?.data_per_mb || 999;
    const bPrice = b.network_pricing?.[0]?.data_per_mb || 999;
    return aPrice - bPrice;
  });
  
  sortedNetworks?.forEach(n => {
    const bestPrice = n.network_pricing?.reduce((min, p) => {
      return p.data_per_mb < min ? p.data_per_mb : min;
    }, 999);
    
    if (bestPrice && bestPrice < 999) {
      const pricePerGB = (bestPrice * 1024).toFixed(2);
      console.log(`- ${n.network_name} (TADIG: ${n.tadig}) - Best: €${pricePerGB}/GB`);
    } else {
      console.log(`- ${n.network_name} (TADIG: ${n.tadig}) - No pricing`);
    }
  });
}

checkUSCarriers();