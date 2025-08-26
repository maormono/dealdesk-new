import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uddmjjgnexdazfedrytt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testIoTQuery() {
  console.log('Testing IoT queries for Italy...\n');
  
  // Get Italy networks with IoT support
  const { data: italyNetworks, error } = await supabase
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
    .eq('country', 'Italy');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${italyNetworks?.length || 0} networks in Italy`);
  
  // Find CAT-M networks
  const catMNetworks = [];
  italyNetworks?.forEach(network => {
    network.network_pricing?.forEach(pricing => {
      if (pricing.lte_m === true) {
        catMNetworks.push({
          network_name: network.network_name,
          tadig: network.tadig,
          operator: pricing.pricing_sources?.source_name,
          data_cost: pricing.data_per_mb,
          lte_m: pricing.lte_m,
          nb_iot: pricing.nb_iot
        });
      }
    });
  });
  
  console.log(`\nFound ${catMNetworks.length} CAT-M/LTE-M networks in Italy:`);
  
  if (catMNetworks.length > 0) {
    // Sort by price
    catMNetworks.sort((a, b) => (a.data_cost || 999) - (b.data_cost || 999));
    
    catMNetworks.forEach((n, i) => {
      console.log(`\n${i + 1}. ${n.network_name} (${n.operator})`);
      console.log(`   TADIG: ${n.tadig}`);
      console.log(`   Data: €${n.data_cost?.toFixed(4)}/MB (€${(n.data_cost * 1024).toFixed(2)}/GB)`);
      console.log(`   IoT Support: ${n.lte_m ? 'CAT-M/LTE-M' : ''} ${n.nb_iot ? 'NB-IoT' : ''}`);
    });
    
    console.log(`\n✅ Best CAT-M price in Italy: ${catMNetworks[0].network_name} at €${(catMNetworks[0].data_cost * 1024).toFixed(2)}/GB`);
  } else {
    console.log('No CAT-M networks found in Italy');
  }
  
  // Also check NB-IoT
  const nbIotNetworks = [];
  italyNetworks?.forEach(network => {
    network.network_pricing?.forEach(pricing => {
      if (pricing.nb_iot === true) {
        nbIotNetworks.push({
          network_name: network.network_name,
          operator: pricing.pricing_sources?.source_name,
          data_cost: pricing.data_per_mb
        });
      }
    });
  });
  
  console.log(`\n\nFound ${nbIotNetworks.length} NB-IoT networks in Italy`);
}

testIoTQuery();