import { supabase } from '../lib/supabase';

export interface DealRules {
  minProfitPerActiveSim: number; // in cents (official: 35 cents)
  minProfitPerMegabyte: number; // in cents  
  minDataProfitMargin: number; // percentage (official: 50%)
  packageUnusedAllowance: number; // percentage (30% unused assumption)
  minDealSize: number; // minimum SIMs
  maxRiskScore: number; // 1-10 scale
  officialMarkup: number; // official markup on cost (50%)
  officialSimProfit: number; // official per-SIM profit (35 cents)
}

export interface DealRequest {
  simCount: number;
  countries: string[];
  dataRequirement: number; // GB per month
  isPackage: boolean;
  networkRedundancy: boolean;
  contractLength?: number; // months
}

export interface DealEvaluation {
  approved: boolean;
  recommendedPrice: {
    min: number;
    max: number;
    currency: string;
  };
  margin: number;
  riskScore: number;
  recommendations: string[];
  warnings?: string[];
}

// Fetch current rules from database
export async function getDealRules(): Promise<DealRules> {
  try {
    const { data, error } = await supabase
      .from('deal_rules')
      .select('rules')
      .single();
    
    if (error || !data) {
      // Return default rules if fetch fails
      return {
        minProfitPerActiveSim: 35,
        minProfitPerMegabyte: 0.01,
        minDataProfitMargin: 50,
        packageUnusedAllowance: 30,
        minDealSize: 100,
        maxRiskScore: 7,
        officialMarkup: 50,
        officialSimProfit: 35
      };
    }
    
    return data.rules as DealRules;
  } catch (error) {
    console.error('Error fetching deal rules:', error);
    // Return defaults on error
    return {
      minProfitPerActiveSim: 35,
      minProfitPerMegabyte: 0.01,
      minDataProfitMargin: 50,
      packageUnusedAllowance: 30,
      minDealSize: 100,
      maxRiskScore: 7,
      officialMarkup: 50,
      officialSimProfit: 35
    };
  }
}

// Evaluate a deal against current rules
export async function evaluateDeal(request: DealRequest): Promise<DealEvaluation> {
  const rules = await getDealRules();
  
  // Check minimum deal size
  if (request.simCount < rules.minDealSize) {
    return {
      approved: false,
      recommendedPrice: { min: 0, max: 0, currency: 'EUR' },
      margin: 0,
      riskScore: 10,
      recommendations: [],
      warnings: [`Deal size (${request.simCount} SIMs) below minimum threshold (${rules.minDealSize} SIMs)`]
    };
  }
  
  // Calculate base costs (hidden from sales)
  const baseCostPerGB = 4.0; // €4 average cost per GB (example)
  const simCost = 0.5; // €0.50 per SIM activation
  
  // Apply package allowance if applicable
  let effectiveDataUsage = request.dataRequirement;
  if (request.isPackage) {
    // Account for unused data in packages
    effectiveDataUsage = request.dataRequirement * (1 - rules.packageUnusedAllowance / 100);
  }
  
  // Calculate required pricing to meet profit rules
  const totalCost = (baseCostPerGB * effectiveDataUsage + simCost) * request.simCount;
  
  // Add minimum profit requirements
  const minProfitFromSims = (rules.minProfitPerActiveSim / 100) * request.simCount;
  const minProfitFromData = (rules.minProfitPerMegabyte / 100) * effectiveDataUsage * 1000 * request.simCount;
  const minProfitTotal = Math.max(minProfitFromSims, minProfitFromData);
  
  // Apply margin requirement
  const minPriceWithMargin = totalCost * (1 + rules.minDataProfitMargin / 100);
  const minPriceWithProfit = totalCost + minProfitTotal;
  
  // Use the higher of the two requirements
  const minPrice = Math.max(minPriceWithMargin, minPriceWithProfit);
  
  // Calculate per-SIM pricing for sales
  const minPricePerSim = minPrice / request.simCount;
  const maxPricePerSim = minPricePerSim * 1.3; // Allow up to 30% higher for negotiation
  
  // Calculate risk score
  let riskScore = 3; // Base risk
  
  // Adjust risk based on factors
  if (request.simCount > 5000) riskScore -= 1; // Lower risk for larger deals
  if (request.countries.length > 5) riskScore += 2; // Higher risk for many countries
  if (!request.networkRedundancy) riskScore += 1; // Higher risk without redundancy
  if (request.contractLength && request.contractLength >= 24) riskScore -= 1; // Lower risk for long contracts
  
  riskScore = Math.max(1, Math.min(10, riskScore)); // Clamp between 1-10
  
  // Generate recommendations
  const recommendations = [];
  
  if (request.simCount >= 1000) {
    recommendations.push(`Volume pricing available for ${request.simCount} SIMs`);
  }
  
  if (request.networkRedundancy) {
    recommendations.push('Multi-network redundancy ensures 99%+ uptime');
  }
  
  if (request.isPackage) {
    recommendations.push(`Package deal accounts for ${rules.packageUnusedAllowance}% typical unused data`);
  }
  
  if (request.contractLength && request.contractLength >= 24) {
    recommendations.push('Long-term contract qualifies for preferential rates');
  }
  
  // Check if deal meets requirements
  const approved = riskScore <= rules.maxRiskScore;
  
  return {
    approved,
    recommendedPrice: {
      min: Math.round(minPricePerSim * 100) / 100,
      max: Math.round(maxPricePerSim * 100) / 100,
      currency: 'EUR'
    },
    margin: Math.round((minPrice - totalCost) / totalCost * 100),
    riskScore,
    recommendations,
    warnings: approved ? undefined : [`Risk score (${riskScore}) exceeds threshold (${rules.maxRiskScore})`]
  };
}

// Format evaluation for sales team (no cost details)
export function formatEvaluationForSales(evaluation: DealEvaluation, request: DealRequest): string {
  const status = evaluation.approved ? '✅ APPROVED' : '❌ NEEDS REVIEW';
  
  // Calculate list price and discount
  const rules = { officialMarkup: 50, officialSimProfit: 35, packageUnusedAllowance: 30 }; // Default official pricing
  const listPrice = evaluation.recommendedPrice.max; // Max is list price
  const yourPrice = evaluation.recommendedPrice.min; // Min is discounted price
  const discountPercent = ((listPrice - yourPrice) / listPrice * 100).toFixed(1);
  
  let response = `## Deal Analysis: ${status}\n\n`;
  
  response += `### 💰 Recommended Pricing\n`;
  response += `- **List Price**: €${listPrice.toFixed(2)}/SIM/month\n`;
  response += `- **Your Price**: €${yourPrice.toFixed(2)}/SIM/month (${discountPercent}% discount)\n`;
  response += `- **Total Monthly**: €${(yourPrice * request.simCount).toLocaleString()}\n\n`;
  
  if (request.contractLength) {
    const totalContract = evaluation.recommendedPrice.min * request.simCount * request.contractLength;
    response += `- **Contract Value** (${request.contractLength} months): €${totalContract.toLocaleString()}\n\n`;
  }
  
  response += `### 📝 Business Justification\n`;
  if (request.simCount >= 1000) {
    response += `✓ Volume discount applied for ${request.simCount.toLocaleString()} SIMs (${discountPercent}% off list)\n`;
  }
  if (request.contractLength && request.contractLength >= 24) {
    response += `✓ Long-term commitment bonus for ${request.contractLength}-month contract\n`;
  }
  if (request.networkRedundancy) {
    response += `✓ Premium service with multi-network redundancy included\n`;
  }
  response += `✓ Pricing ensures sustainable margins while remaining competitive\n`;
  
  response += `\n### 🔍 Key Assumptions\n`;
  if (request.isPackage) {
    response += `• Package deal: ${rules.packageUnusedAllowance || 30}% of data expected to remain unused\n`;
  } else {
    response += `• Pay-as-you-go model with full data utilization\n`;
  }
  response += `• Standard activation and platform fees included\n`;
  response += `• Monthly billing cycle with ${request.countries.length} country coverage\n`;
  
  response += `\n### ✓ Deal Features\n`;
  evaluation.recommendations.forEach(rec => {
    response += `• ${rec}\n`;
  });
  
  if (evaluation.warnings && evaluation.warnings.length > 0) {
    response += `\n### ⚠️ Considerations\n`;
    evaluation.warnings.forEach(warning => {
      response += `- ${warning}\n`;
    });
  }
  
  response += `\n### Next Steps\n`;
  if (evaluation.approved) {
    response += `1. Confirm ${request.contractLength || 12}-month commitment\n`;
    response += `2. Validate primary usage patterns\n`;
    response += `3. Proceed with contract preparation\n`;
  } else {
    response += `1. Review deal parameters with management\n`;
    response += `2. Consider volume adjustments or contract terms\n`;
    response += `3. Request special approval if needed\n`;
  }
  
  return response;
}