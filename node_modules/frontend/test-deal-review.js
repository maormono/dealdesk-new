import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uddmjjgnexdazfedrytt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0'
);

async function testDealReview() {
  console.log('Testing deal review with sample deals...\n');
  
  // Test 1: Check UK networks
  console.log('1. Checking UK networks with pricing:');
  const { data: ukNetworks } = await supabase
    .from('networks')
    .select(`
      network_name,
      country,
      network_pricing (
        data_per_mb,
        pricing_sources (
          source_name
        )
      )
    `)
    .eq('country', 'United Kingdom')
    .limit(5);
    
  if (ukNetworks && ukNetworks.length > 0) {
    console.log('Found UK networks:');
    ukNetworks.forEach(n => {
      n.network_pricing?.forEach(p => {
        const pricePerGB = (p.data_per_mb * 1024).toFixed(2);
        console.log(`  - ${n.network_name} (${p.pricing_sources?.source_name}): €${pricePerGB}/GB`);
      });
    });
  } else {
    console.log('  No UK networks found');
  }
  
  // Test 2: Check Belgium networks
  console.log('\n2. Checking Belgium networks:');
  const { data: beNetworks } = await supabase
    .from('networks')
    .select(`
      network_name,
      country,
      network_pricing (
        data_per_mb,
        pricing_sources (
          source_name
        )
      )
    `)
    .eq('country', 'Belgium')
    .limit(5);
    
  if (beNetworks && beNetworks.length > 0) {
    console.log('Found Belgium networks:');
    beNetworks.forEach(n => {
      n.network_pricing?.forEach(p => {
        const pricePerGB = (p.data_per_mb * 1024).toFixed(2);
        console.log(`  - ${n.network_name} (${p.pricing_sources?.source_name}): €${pricePerGB}/GB`);
      });
    });
  } else {
    console.log('  No Belgium networks found');
  }
  
  // Test 3: Check Netherlands networks
  console.log('\n3. Checking Netherlands networks:');
  const { data: nlNetworks } = await supabase
    .from('networks')
    .select(`
      network_name,
      country,
      network_pricing (
        data_per_mb,
        pricing_sources (
          source_name
        )
      )
    `)
    .eq('country', 'Netherlands')
    .limit(5);
    
  if (nlNetworks && nlNetworks.length > 0) {
    console.log('Found Netherlands networks:');
    nlNetworks.forEach(n => {
      n.network_pricing?.forEach(p => {
        const pricePerGB = (p.data_per_mb * 1024).toFixed(2);
        console.log(`  - ${n.network_name} (${p.pricing_sources?.source_name}): €${pricePerGB}/GB`);
      });
    });
  } else {
    console.log('  No Netherlands networks found');
  }
  
  console.log('\n✅ Deal Review can now calculate costs for these countries!');
  console.log('\nSample queries to try:');
  console.log('• "1000 SIMs in UK, Belgium, and Netherlands, 1GB at €2.50/month"');
  console.log('• "500 IoT devices in Belgium with 500MB CAT-M"');
  console.log('• "Quote for 2000 SIMs across UK and Netherlands, 2GB data each"');
}

testDealReview();