// Test script for AI Deal Analyzer
// Deal Request: 1000 SIMs, 1GB/month, UK & Belgium, 2 networks each, 24 months

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  }
});

async function analyzeDeal() {
  const dealRequest = {
    simCount: 1000,
    dataPerMonth: 1, // GB
    countries: ['UK', 'Belgium'],
    networksPerCountry: 2,
    commitmentMonths: 24,
    totalDataVolume: 1000 * 1 * 24 // 24,000 GB total
  };

  // Sample network pricing data for UK and Belgium
  const sampleNetworks = [
    // UK Networks
    { country: 'UK', network: 'EE', tadig: 'GBREE', data_cost_per_mb: 0.0098, data_cost_per_gb: 10.04, imsi_cost: 0.35 },
    { country: 'UK', network: 'Vodafone UK', tadig: 'GBRVF', data_cost_per_mb: 0.0105, data_cost_per_gb: 10.75, imsi_cost: 0.35 },
    { country: 'UK', network: 'O2 UK', tadig: 'GBRO2', data_cost_per_mb: 0.0095, data_cost_per_gb: 9.73, imsi_cost: 0.35 },
    { country: 'UK', network: 'Three UK', tadig: 'GBR3U', data_cost_per_mb: 0.0088, data_cost_per_gb: 9.01, imsi_cost: 0.35 },
    
    // Belgium Networks  
    { country: 'Belgium', network: 'Proximus', tadig: 'BELPR', data_cost_per_mb: 0.0092, data_cost_per_gb: 9.42, imsi_cost: 0.40 },
    { country: 'Belgium', network: 'Orange Belgium', tadig: 'BELMO', data_cost_per_mb: 0.0089, data_cost_per_gb: 9.11, imsi_cost: 0.40 },
    { country: 'Belgium', network: 'BASE', tadig: 'BELBS', data_cost_per_mb: 0.0085, data_cost_per_gb: 8.70, imsi_cost: 0.40 }
  ];

  // Monogoto pricing rules
  const pricingRules = {
    officialMarkup: 50, // 50% markup on cost
    officialSimProfit: 35, // €0.35 per SIM profit
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
You are an expert telecom pricing advisor analyzing a deal for Monogoto. 

DEAL REQUEST:
- Customer wants: ${dealRequest.simCount} SIMs
- Data usage: ${dealRequest.dataPerMonth} GB per month per SIM
- Coverage needed: ${dealRequest.countries.join(', ')} (${dealRequest.networksPerCountry} networks in each country)
- Contract length: ${dealRequest.commitmentMonths} months
- Total data volume: ${dealRequest.totalDataVolume.toLocaleString()} GB over contract period

AVAILABLE NETWORKS AND COSTS:
${JSON.stringify(sampleNetworks, null, 2)}

PRICING RULES:
- Standard markup: ${pricingRules.officialMarkup}% on network costs
- Per-SIM profit target: €${(pricingRules.officialSimProfit/100).toFixed(2)}
- Package deals: Assume ${pricingRules.packageUnusedAllowance}% data will be unused (can price more aggressively)
- Minimum margin requirement: ${pricingRules.minDataProfitMargin}%
- Volume discount for ${dealRequest.simCount} SIMs: ${pricingRules.volumeDiscounts[1000]}%

CALCULATE AND PROVIDE:
1. Network selection recommendation (which 2 networks in each country)
2. Cost breakdown per SIM per month
3. Recommended list price and discounted price
4. Total monthly revenue and annual revenue
5. Profit margin analysis
6. Risk assessment and recommendations

FORMAT YOUR RESPONSE AS:

📊 **Deal Analysis Summary**
[Brief overview of the deal]

🌐 **Recommended Network Selection**
• UK: [Network 1], [Network 2] 
• Belgium: [Network 1], [Network 2]
• Reasoning: [Why these networks]

💰 **Pricing Recommendation**
• Cost per SIM/month: €[X.XX] (internal - do not share)
• List price per SIM/month: €[X.XX]
• Your price per SIM/month: €[X.XX] (15% volume discount)
• Total monthly: €[X,XXX]
• Total annual: €[XX,XXX]
• Contract total (24 months): €[XXX,XXX]

📈 **Profitability Analysis**
• Gross margin: [X]%
• Net margin after operations: [X]%
• ROI: [X]%

⚠️ **Risk Assessment**
• [Risk 1]
• [Risk 2]
• Mitigation strategies

✅ **Deal Recommendation**
[APPROVED/CONDITIONAL/REJECTED] with reasoning

Provide a professional analysis suitable for sales team use.`;

  try {
    console.log('🤖 Analyzing deal with Gemini AI...\n');
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('                   DEAL ANALYSIS RESULT                 ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(response);
    console.log('═══════════════════════════════════════════════════════');
    
    return response;
  } catch (error) {
    console.error('❌ Error analyzing deal:', error);
    return null;
  }
}

// Run the analysis
console.log('🚀 Starting Deal Analysis...\n');
console.log('Deal Parameters:');
console.log('• 1,000 SIMs');
console.log('• 1 GB per month per SIM');
console.log('• UK & Belgium coverage');
console.log('• 2 networks per country');
console.log('• 24-month commitment\n');

analyzeDeal();