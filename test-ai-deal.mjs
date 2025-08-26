#!/usr/bin/env node

// Test the AI deal analyzer with the user's request
// Deal: 1000 SIMs, 1GB/month, UK and Belgium

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  'https://uddmjjgnexdazfedrytt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0'
);

// Deal configuration (matching frontend)
const dealConfig = {
  platformCosts: {
    activeSIMCost: 0.10,
  },
  margins: {
    minimum: 0.20,
    target: 0.35,
    optimal: 0.50,
  },
  connectivityMarkup: 0.50,
  volumeTiers: [
    { minQty: 1, maxQty: 999, discount: 0 },
    { minQty: 1000, maxQty: 4999, discount: 0.05 },
    { minQty: 5000, maxQty: 9999, discount: 0.10 },
    { minQty: 10000, maxQty: 49999, discount: 0.15 },
    { minQty: 50000, maxQty: null, discount: 0.20 },
  ],
};

async function analyzeDeal() {
  const dealRequest = {
    simQuantity: 1000,
    monthlyDataPerSim: 1, // GB
    countries: ['United Kingdom', 'Belgium'],
    duration: 24,
    proposedPricePerSim: 2, // €2 default
    currency: 'EUR'
  };

  console.log('🔍 Analyzing deal request:');
  console.log('• 1000 SIMs');
  console.log('• 1 GB per month per SIM');
  console.log('• UK and Belgium coverage');
  console.log('• 24-month commitment (default)\n');

  // Fetch network pricing for UK and Belgium
  console.log('📊 Fetching network pricing from database...\n');
  
  const { data: networks, error } = await supabase
    .from('networks')
    .select(`
      network_name,
      country,
      tadig,
      network_pricing (
        data_per_mb,
        imsi_access_fee,
        pricing_sources (
          source_name
        )
      )
    `)
    .in('country', ['United Kingdom', 'Belgium'])
    .order('country');

  if (error) {
    console.error('Error fetching networks:', error);
    return;
  }

  // Process and find best options
  const networkOptions = [];
  networks?.forEach(network => {
    network.network_pricing?.forEach(pricing => {
      if (pricing.data_per_mb && pricing.data_per_mb > 0) {
        networkOptions.push({
          country: network.country,
          network: network.network_name,
          tadig: network.tadig,
          operator: pricing.pricing_sources?.source_name || 'Unknown',
          dataPerMB: pricing.data_per_mb,
          dataPerGB: pricing.data_per_mb * 1024,
          imsiCost: pricing.imsi_access_fee || 0,
          monthlyCost: (pricing.data_per_mb * 1024) + (pricing.imsi_access_fee || 0)
        });
      }
    });
  });

  // Select best (cheapest) network per country
  const selectedNetworks = [];
  const countries = ['United Kingdom', 'Belgium'];
  
  countries.forEach(country => {
    const countryOptions = networkOptions.filter(n => n.country === country);
    if (countryOptions.length > 0) {
      const best = countryOptions.sort((a, b) => a.monthlyCost - b.monthlyCost)[0];
      selectedNetworks.push(best);
      console.log(`✅ ${country}: ${best.network} via ${best.operator}`);
      console.log(`   Data: €${best.dataPerGB.toFixed(2)}/GB, IMSI: €${best.imsiCost.toFixed(2)}`);
    }
  });

  console.log('\n💰 Cost Calculation:\n');

  // Calculate average costs
  const avgDataCost = selectedNetworks.reduce((sum, n) => sum + n.dataPerGB, 0) / selectedNetworks.length;
  const avgImsiCost = selectedNetworks.reduce((sum, n) => sum + n.imsiCost, 0) / selectedNetworks.length;
  
  console.log(`• Average carrier data cost: €${avgDataCost.toFixed(2)}/GB`);
  console.log(`• Average IMSI cost: €${avgImsiCost.toFixed(3)}`);
  console.log(`• Platform cost: €${dealConfig.platformCosts.activeSIMCost.toFixed(2)}/SIM`);
  
  // Calculate total costs with markup
  const connectivityCost = avgDataCost + avgImsiCost;
  const markedUpConnectivity = connectivityCost * (1 + dealConfig.connectivityMarkup);
  const totalCostPerSim = markedUpConnectivity + dealConfig.platformCosts.activeSIMCost;
  
  console.log(`\n• Connectivity cost (raw): €${connectivityCost.toFixed(2)}`);
  console.log(`• Connectivity with 50% markup: €${markedUpConnectivity.toFixed(2)}`);
  console.log(`• Total cost per SIM: €${totalCostPerSim.toFixed(2)}`);

  // Apply volume discount
  const volumeDiscount = 0.05; // 5% for 1000 SIMs
  const listPrice = totalCostPerSim / (1 - dealConfig.margins.target); // 35% margin
  const discountedPrice = listPrice * (1 - volumeDiscount);
  
  console.log('\n📈 Pricing Recommendation:\n');
  console.log(`• List price (35% margin): €${listPrice.toFixed(2)}/SIM`);
  console.log(`• Volume discount (5%): -€${(listPrice * volumeDiscount).toFixed(2)}`);
  console.log(`• Your price: €${discountedPrice.toFixed(2)}/SIM`);
  console.log(`• Total monthly revenue: €${(discountedPrice * 1000).toFixed(2)}`);
  console.log(`• Total contract value (24mo): €${(discountedPrice * 1000 * 24).toFixed(2)}`);
  
  // Calculate margins
  const profit = discountedPrice - totalCostPerSim;
  const margin = (profit / discountedPrice) * 100;
  
  console.log('\n✅ Deal Analysis:\n');
  console.log(`• Profit per SIM: €${profit.toFixed(2)}`);
  console.log(`• Profit margin: ${margin.toFixed(1)}%`);
  console.log(`• Deal status: ${margin >= 35 ? 'APPROVED' : margin >= 20 ? 'NEGOTIABLE' : 'REJECTED'}`);
  
  // Format as pay-as-you-go vs package
  console.log('\n💼 Pricing Options:\n');
  console.log('**Pay-as-you-go:**');
  console.log(`• Active SIM fee: €${dealConfig.platformCosts.activeSIMCost.toFixed(2)}/month`);
  console.log(`• Data rate: €${(markedUpConnectivity / 1).toFixed(2)}/GB`);
  console.log(`• Total per SIM: €${totalCostPerSim.toFixed(2)}/month`);
  
  console.log('\n**Package Deal:**');
  console.log(`• All-inclusive: €${discountedPrice.toFixed(2)}/SIM/month`);
  console.log(`• Includes: 1GB data + platform services`);
  console.log(`• Volume discount: 5% applied`);
  
  process.exit(0);
}

analyzeDeal().catch(console.error);