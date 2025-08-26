/**
 * Formats deal analysis results for sales team presentation
 * Ensures consistent, professional output without revealing costs
 */

export interface FormattedDealResponse {
  status: 'APPROVED' | 'REVIEW' | 'REJECTED';
  statusEmoji: string;
  pricingStructure: {
    activeSimFee: string;
    dataRate: string;
    listPrice: string;
    yourPrice: string;
    discount: string;
    totalMonthly: string;
    contractValue: string;
  };
  regionalOptimization?: {
    impact: string;
    distribution: Array<{ country: string; percentage: string }>;
  };
  businessJustification: string[];
  assumptions: string[];
  nextSteps: string[];
  confidence: string;
}

export function formatDealForSales(
  analysis: any,
  simCount: number,
  contractLength: number,
  currency: 'USD' | 'EUR' = 'EUR'
): string {
  const currencySymbol = currency === 'USD' ? '$' : '€';
  const payAsYouGo = analysis.payAsYouGo;
  
  if (!payAsYouGo) {
    return '## ❌ Analysis Error\nUnable to process deal analysis. Please try again.';
  }

  // Determine status
  const status = analysis.approved ? 'APPROVED' : 'REVIEW REQUIRED';
  const statusEmoji = analysis.approved ? '✅' : '⚠️';
  
  // Calculate totals
  const monthlyTotal = (payAsYouGo.listPrice - (payAsYouGo.listPrice * payAsYouGo.discountPercentage / 100)) * simCount;
  const contractValue = monthlyTotal * contractLength;
  
  // Format the response
  let output = `## 📊 Deal Analysis: ${status} ${statusEmoji}\n\n`;
  
  // Pricing Structure
  output += `### 💰 Pricing Structure (Pay-as-you-go)\n\n`;
  output += `**Component Pricing:**\n`;
  output += `- Active SIM Fee: ${currencySymbol}${payAsYouGo.activeSimFee.toFixed(2)}/month per SIM\n`;
  output += `- Data Charge: ${currencySymbol}${(payAsYouGo.dataFee * 1024).toFixed(2)}/GB\n`;
  output += `- **Total List Price: ${currencySymbol}${payAsYouGo.listPrice.toFixed(2)}/SIM/month**\n\n`;
  
  output += `**Your Recommended Price:**\n`;
  const yourPrice = payAsYouGo.listPrice * (1 - payAsYouGo.discountPercentage / 100);
  output += `- ${currencySymbol}${yourPrice.toFixed(2)}/SIM/month (${payAsYouGo.discountPercentage.toFixed(0)}% discount from list)\n`;
  output += `- Total Monthly: ${currencySymbol}${monthlyTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`;
  output += `- Contract Value: ${currencySymbol}${contractValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${contractLength} months)\n\n`;
  
  // Regional & Carrier Optimization (if multi-country)
  if (analysis.usageDistribution && Object.keys(analysis.usageDistribution).length > 1) {
    output += `### 📍 Regional & Carrier Optimization\n\n`;
    output += `**Usage Distribution & Network Selection:**\n`;
    
    // Show carrier strategy if available
    if (analysis.regionalOptimization?.carrierStrategy) {
      for (const [country, strategy] of Object.entries(analysis.regionalOptimization.carrierStrategy)) {
        const percentage = analysis.usageDistribution[country] || 0;
        output += `- **${country} (${percentage.toFixed(0)}%)**: ${strategy}\n`;
      }
    } else {
      // Fallback to simple distribution
      for (const [country, percentage] of Object.entries(analysis.usageDistribution)) {
        output += `- ${country} (${(percentage as number).toFixed(0)}%): Optimized network selection\n`;
      }
    }
    
    if (analysis.regionalOptimization?.impact) {
      output += `\n**Pricing Impact**: ${analysis.regionalOptimization.impact}\n`;
    }
    
    // Add carrier redundancy note if multiple carriers
    if (analysis.regionalOptimization?.breakdown) {
      output += `**Network Strategy**: ${analysis.regionalOptimization.breakdown}\n`;
    }
    
    output += '\n';
  } else if (analysis.carrierOptimization) {
    // Single country carrier optimization
    output += `### 📡 Carrier Optimization\n\n`;
    const country = Object.keys(analysis.carrierOptimization)[0];
    const carrier = analysis.carrierOptimization[country];
    if (carrier) {
      output += `**Primary Network**: ${carrier.primaryCarrier} via ${carrier.operator}\n`;
      if (carrier.alternativeOptions && carrier.alternativeOptions.length > 0) {
        output += `**Alternative Options**: `;
        output += carrier.alternativeOptions.map((alt: any) => 
          `${alt.carrier} (${alt.operator})`
        ).join(', ');
        output += '\n';
      }
    }
    output += '\n';
  }
  
  // Business Justification
  output += `### 🎯 Business Justification\n\n`;
  if (analysis.reasoning && analysis.reasoning.length > 0) {
    output += `**Why this discount is approved:**\n`;
    analysis.reasoning.forEach((reason: string, index: number) => {
      output += `${index + 1}. ${reason}\n`;
    });
  } else {
    output += `1. Volume commitment qualifies for preferred pricing\n`;
    output += `2. Contract duration ensures stable revenue\n`;
    output += `3. Strategic partnership value\n`;
  }
  output += '\n';
  
  // Key Assumptions
  output += `### 🔍 Key Assumptions\n\n`;
  if (analysis.assumptions && analysis.assumptions.length > 0) {
    analysis.assumptions.forEach((assumption: string) => {
      output += `- ${assumption}\n`;
    });
  } else {
    output += `- Usage patterns remain stable throughout contract\n`;
    output += `- Active SIM fees apply to all deployed SIMs\n`;
    output += `- Standard pay-as-you-go rates for overages\n`;
    output += `- Monthly billing with NET-30 terms\n`;
  }
  output += '\n';
  
  // Next Steps
  output += `### ✅ Next Steps\n\n`;
  if (analysis.nextSteps && analysis.nextSteps.length > 0) {
    analysis.nextSteps.forEach((step: string, index: number) => {
      output += `${index + 1}. ${step}\n`;
    });
  } else {
    output += `1. Confirm usage distribution with customer\n`;
    output += `2. Lock in ${contractLength}-month pricing commitment\n`;
    output += `3. Set up automated billing for pay-as-you-go model\n`;
  }
  output += '\n';
  
  // Confidence Score
  const confidence = analysis.aiConfidence ? (analysis.aiConfidence * 100).toFixed(0) : '85';
  output += `**Confidence Score**: ${confidence}% `;
  if (parseInt(confidence) >= 90) {
    output += '(High confidence based on historical data)';
  } else if (parseInt(confidence) >= 70) {
    output += '(Good confidence with standard assumptions)';
  } else {
    output += '(Review recommended for edge cases)';
  }
  
  return output;
}

// Helper function to determine discount tier
export function getDiscountTier(simCount: number, contractLength: number): string {
  if (simCount >= 5000) return 'Enterprise';
  if (simCount >= 1000) return 'Volume';
  if (simCount >= 500 || contractLength >= 24) return 'Strategic';
  return 'Standard';
}

// Helper function to calculate recommended discount
export function calculateRecommendedDiscount(
  simCount: number,
  contractLength: number,
  isStrategic: boolean = false
): number {
  let discount = 0;
  
  // Volume-based discount
  if (simCount >= 5000) discount = 20;
  else if (simCount >= 1000) discount = 15;
  else if (simCount >= 500) discount = 10;
  else if (simCount >= 100) discount = 5;
  
  // Contract length bonus
  if (contractLength >= 36) discount += 7;
  else if (contractLength >= 24) discount += 5;
  else if (contractLength >= 12) discount += 2;
  
  // Strategic account bonus
  if (isStrategic) discount += 5;
  
  // Cap at maximum discount
  return Math.min(discount, 40);
}