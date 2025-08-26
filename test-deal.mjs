#!/usr/bin/env node

// Test script for AI Deal Analyzer
// Deal Request: 1000 SIMs, 1GB/month, UK & Belgium, 2 networks each, 24 months

import https from 'https';

const GEMINI_API_KEY = 'AIzaSyAZw1oOCupKS_Oz3a62i4JvV2JvQSlDIic';

async function callGeminiAPI(prompt) {
  const data = JSON.stringify({
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.candidates && response.candidates[0]) {
            resolve(response.candidates[0].content.parts[0].text);
          } else {
            reject(new Error('Invalid response from Gemini API'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function analyzeDeal() {
  const dealRequest = {
    simCount: 1000,
    dataPerMonth: 1, // GB
    countries: ['UK', 'Belgium'],
    networksPerCountry: 2,
    commitmentMonths: 24,
    totalDataVolume: 1000 * 1 * 24 // 24,000 GB total
  };

  // Sample network pricing data based on typical operator rates
  const sampleNetworks = [
    // UK Networks (USD pricing)
    { country: 'UK', network: 'EE', tadig: 'GBREE', data_cost_per_mb: 0.0098, data_cost_per_gb: 10.04, imsi_cost: 0.35 },
    { country: 'UK', network: 'Vodafone UK', tadig: 'GBRVF', data_cost_per_mb: 0.0105, data_cost_per_gb: 10.75, imsi_cost: 0.35 },
    { country: 'UK', network: 'O2 UK', tadig: 'GBRO2', data_cost_per_mb: 0.0095, data_cost_per_gb: 9.73, imsi_cost: 0.35 },
    { country: 'UK', network: 'Three UK', tadig: 'GBR3U', data_cost_per_mb: 0.0088, data_cost_per_gb: 9.01, imsi_cost: 0.35 },
    
    // Belgium Networks (USD pricing)
    { country: 'Belgium', network: 'Proximus', tadig: 'BELPR', data_cost_per_mb: 0.0092, data_cost_per_gb: 9.42, imsi_cost: 0.40 },
    { country: 'Belgium', network: 'Orange Belgium', tadig: 'BELMO', data_cost_per_mb: 0.0089, data_cost_per_gb: 9.11, imsi_cost: 0.40 },
    { country: 'Belgium', network: 'BASE', tadig: 'BELBS', data_cost_per_mb: 0.0085, data_cost_per_gb: 8.70, imsi_cost: 0.40 }
  ];

  // Monogoto pricing rules
  const pricingRules = {
    officialMarkup: 50, // 50% markup on cost
    officialSimProfit: 0.35, // $0.35 per SIM profit
    packageUnusedAllowance: 30, // Assume 30% unused
    minDataProfitMargin: 50, // 50% minimum margin
    volumeDiscounts: {
      500: 10,   // 10% discount for 500+ SIMs
      1000: 15,  // 15% discount for 1000+ SIMs
      5000: 20,  // 20% discount for 5000+ SIMs
      10000: 25  // 25% discount for 10000+ SIMs
    }
  };

  const prompt = `
You are an expert telecom pricing advisor analyzing a deal for Monogoto. Provide a comprehensive analysis.

DEAL REQUEST:
- Customer wants: ${dealRequest.simCount} SIMs
- Data usage: ${dealRequest.dataPerMonth} GB per month per SIM  
- Coverage needed: ${dealRequest.countries.join(', ')} (${dealRequest.networksPerCountry} networks in each country)
- Contract length: ${dealRequest.commitmentMonths} months
- Total data volume: ${dealRequest.totalDataVolume.toLocaleString()} GB over contract period

AVAILABLE NETWORKS AND COSTS (USD):
${JSON.stringify(sampleNetworks, null, 2)}

PRICING RULES:
- Standard markup: ${pricingRules.officialMarkup}% on network costs
- Per-SIM profit target: $${pricingRules.officialSimProfit}
- Package deals: Assume ${pricingRules.packageUnusedAllowance}% data will be unused (can price more aggressively)
- Minimum margin requirement: ${pricingRules.minDataProfitMargin}%
- Volume discount for ${dealRequest.simCount} SIMs: ${pricingRules.volumeDiscounts[1000]}%

CALCULATE AND PROVIDE:

📊 **Deal Analysis Summary**
Provide brief overview of the deal opportunity

🌐 **Recommended Network Selection**
• UK: Select 2 most cost-effective networks with good coverage
• Belgium: Select 2 most cost-effective networks with good coverage
• Reasoning: Explain selection based on cost and reliability

💰 **Pricing Recommendation**
Calculate based on:
- Average network cost across selected networks
- Apply markup and volume discounts
- Consider 70% utilization (30% unused)

Provide:
• Cost per SIM/month: $X.XX (internal cost - weighted average)
• List price per SIM/month: $X.XX (with 50% markup)
• Your price per SIM/month: $X.XX (with 15% volume discount)
• Total monthly revenue: $X,XXX
• Total annual revenue: $XX,XXX
• Contract total (24 months): $XXX,XXX

📈 **Profitability Analysis**
• Gross margin: X%
• Effective margin after utilization: X%
• Break-even point: X months

⚠️ **Risk Assessment**
• Network reliability risks
• Currency fluctuation (USD/EUR/GBP)
• Usage pattern risks
• Competition risks

✅ **Deal Recommendation**
Provide clear APPROVED/CONDITIONAL/REJECTED recommendation with reasoning

💡 **Additional Value Propositions**
• Multi-network redundancy benefits
• Potential for expansion
• IoT/M2M opportunities

Provide a professional, detailed analysis suitable for executive decision-making.`;

  try {
    console.log('🤖 Analyzing deal with Gemini AI...\n');
    const response = await callGeminiAPI(prompt);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('              AI DEAL ANALYSIS RESULT                   ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(response);
    console.log('═══════════════════════════════════════════════════════');
    
    return response;
  } catch (error) {
    console.error('❌ Error analyzing deal:', error.message);
    return null;
  }
}

// Run the analysis
console.log('🚀 Starting Deal Analysis for Monogoto...\n');
console.log('Customer Request Details:');
console.log('═══════════════════════════════════════════');
console.log('• Quantity: 1,000 SIMs');
console.log('• Data: 1 GB per month per SIM');
console.log('• Coverage: UK & Belgium');
console.log('• Networks: 2 per country (4 total)');
console.log('• Contract: 24-month commitment');
console.log('• Total Volume: 24,000 GB');
console.log('═══════════════════════════════════════════\n');

analyzeDeal();