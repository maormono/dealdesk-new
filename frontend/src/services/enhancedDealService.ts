import { supabase } from '../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface DealAnalysisRequest {
  simCount: number;
  countries: string[];
  dataPerSim: number; // in MB
  pricingModel: 'payAsYouGo' | 'package';
  usagePercentages?: Record<string, number>; // e.g., { "USA": 60, "Mexico": 30, "Canada": 10 }
  contractLength: number; // months
  requestedPrice?: number; // what customer wants to pay
}

interface PricingOption {
  model: 'payAsYouGo' | 'package';
  activeSimFee: number; // Monthly fee per active SIM
  dataFee: number; // Per MB/GB charge
  totalMonthlyPrice: number;
  listPrice: number;
  discountPercentage: number;
  reasoning: string[];
}

interface DealAnalysisResponse {
  approved: boolean;
  payAsYouGo: PricingOption;
  package?: PricingOption; // Deprecated but included for comparison
  recommendedOption: 'payAsYouGo' | 'package';
  usageDistribution: Record<string, number>;
  reasoning: string[];
  assumptions: string[];
  warnings?: string[];
  aiConfidence: number;
}

export class EnhancedDealService {
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  });

  async analyzeDeal(request: DealAnalysisRequest): Promise<DealAnalysisResponse> {
    // Step 1: Get network pricing data from Supabase
    const networkData = await this.fetchNetworkPricing(request.countries);
    
    // Step 2: Get deal rules
    const rules = await this.fetchDealRules();
    
    // Step 3: Ensure usage percentages add up or default to even
    const usageDistribution = this.normalizeUsagePercentages(
      request.usagePercentages || {},
      request.countries
    );
    
    // Step 4: Calculate both pricing options
    
    // Pay-as-you-go calculation
    const payAsYouGoCosts = this.calculateCosts(
      networkData,
      { ...request, pricingModel: 'payAsYouGo', usagePercentages: usageDistribution },
      rules
    );
    
    // Calculate pay-as-you-go pricing
    const payAsYouGoOption = this.calculatePayAsYouGoPricing(
      payAsYouGoCosts,
      rules,
      request.simCount,
      request.requestedPrice
    );
    
    // Package calculation (for comparison, deprecated)
    const packageCosts = this.calculateCosts(
      networkData,
      { ...request, pricingModel: 'package', usagePercentages: usageDistribution },
      rules
    );
    
    const packageOption = this.calculatePackagePricing(
      packageCosts,
      rules,
      request.simCount,
      request.requestedPrice
    );
    
    // Step 5: Send to Gemini for intelligent analysis
    const geminiAnalysis = await this.getGeminiRecommendation(
      request,
      networkData,
      rules,
      { payAsYouGo: payAsYouGoCosts, package: packageCosts },
      { payAsYouGo: payAsYouGoOption, package: packageOption },
      usageDistribution
    );
    
    // Step 6: Format response for sales team
    return this.formatSalesResponseV2(
      payAsYouGoOption,
      packageOption,
      geminiAnalysis,
      usageDistribution,
      rules
    );
  }
  
  private normalizeUsagePercentages(
    percentages: Record<string, number>,
    countries: string[]
  ): Record<string, number> {
    const result: Record<string, number> = {};
    
    if (Object.keys(percentages).length === 0) {
      // Default to even distribution
      const evenPercentage = 100 / countries.length;
      countries.forEach(country => {
        result[country] = evenPercentage;
      });
    } else {
      // Ensure percentages add up to 100
      let total = 0;
      for (const country of countries) {
        const pct = percentages[country] || 0;
        result[country] = pct;
        total += pct;
      }
      
      // Normalize if not 100%
      if (total !== 100 && total > 0) {
        for (const country of countries) {
          result[country] = (result[country] / total) * 100;
        }
      }
    }
    
    return result;
  }
  
  private calculatePayAsYouGoPricing(costs: any, rules: any, simCount: number, requestedPrice?: number): PricingOption {
    // Validate rules exist
    if (!rules || typeof rules.officialMarkup !== 'number' || typeof rules.officialSimProfit !== 'number') {
      console.error('Invalid rules object:', rules);
      // Use defaults if rules are invalid
      rules = {
        officialMarkup: 50,
        officialSimProfit: 35,
        ...rules
      };
    }

    // Active SIM fee: Apply markup to IMSI costs + fixed profit
    // If IMSI cost is 0 (like in Israel), the fee is just the fixed profit
    const imsiCost = costs.imsiCost || 0;
    const markupPercent = rules.officialMarkup || 50;
    const simProfit = rules.officialSimProfit || 35;
    const activeSimFee = (imsiCost * (1 + markupPercent / 100)) + (simProfit / 100);

    // Data fee per MB: Calculate the average weighted cost per MB
    let dataFeePerMB = 0;
    if (costs.totalDataMB > 0 && costs.weightedDataPerMB > 0) {
      // Use the weighted average cost per MB from the detailed breakdown
      dataFeePerMB = costs.weightedDataPerMB * (1 + markupPercent / 100);
    }

    // Log for debugging
    console.log('Pay-as-you-go pricing calculation:', {
      imsiCost: imsiCost,
      activeSimFee: activeSimFee.toFixed(2),
      weightedDataPerMB: costs.weightedDataPerMB || 0,
      dataFeePerMB: dataFeePerMB.toFixed(4),
      markup: markupPercent,
      simProfit: simProfit,
      rulesReceived: rules,
      requestedPrice: requestedPrice
    });

    // If customer has a requested price, use that as the list price
    // Otherwise calculate based on costs
    let listPrice: number;
    if (requestedPrice && requestedPrice > 0) {
      listPrice = requestedPrice; // Use customer's target price
    } else {
      // Total cost per SIM with markup (standard calculation)
      const totalCostWithMarkup = (costs.totalCostPerSim * (1 + markupPercent / 100)) + (simProfit / 100);
      listPrice = totalCostWithMarkup;
    }

    const totalMonthlyPrice = listPrice * simCount;
    
    return {
      model: 'payAsYouGo',
      activeSimFee: Number(activeSimFee.toFixed(2)),
      dataFee: Number(dataFeePerMB.toFixed(4)),
      totalMonthlyPrice: Number(totalMonthlyPrice.toFixed(2)),
      listPrice: Number(listPrice.toFixed(2)),
      discountPercentage: 0, // Will be calculated by Gemini
      reasoning: [
        'Pay-as-you-go model with separate active SIM and data charges',
        'Full transparency on usage-based billing',
        'No unused data waste'
      ]
    };
  }
  
  private calculatePackagePricing(costs: any, rules: any, simCount: number, requestedPrice?: number): PricingOption {
    // Use requested price if provided, otherwise calculate from costs
    const packagePrice = requestedPrice && requestedPrice > 0
      ? requestedPrice
      : (costs.totalCostPerSim * (1 + rules.officialMarkup / 100)) + (rules.officialSimProfit / 100);
    const totalMonthlyPrice = packagePrice * simCount;
    
    return {
      model: 'package',
      activeSimFee: 0, // Bundle price includes everything
      dataFee: 0,
      totalMonthlyPrice,
      listPrice: packagePrice,
      discountPercentage: 0,
      reasoning: [
        'Bundled package with data included',
        '30% buffer for unused data built into pricing',
        'Simple single price per SIM'
      ]
    };
  }

  private async fetchNetworkPricing(countries: string[]) {
    const { data, error } = await supabase
      .from('networks')
      .select(`
        network_name,
        country,
        tadig,
        network_pricing (
          data_per_mb,
          imsi_access_fee,
          lte_m,
          nb_iot,
          pricing_sources (
            source_name
          )
        )
      `)
      .in('country', countries);

    if (error) throw error;
    return data || [];
  }

  private async fetchDealRules() {
    try {
      const { data, error } = await supabase
        .from('deal_rules')
        .select('rules')
        .single();
      
      if (error) {
        console.error('Error fetching deal rules:', error);
      }
      
      // Ensure all required fields exist, merge with defaults
      const defaultRules = {
        officialMarkup: 50,
        officialSimProfit: 35,
        packageUnusedAllowance: 30,
        minDataProfitMargin: 50
      };
      
      const rules = data?.rules ? { ...defaultRules, ...data.rules } : defaultRules;
      
      console.log('Loaded deal rules:', rules);
      return rules;
    } catch (error) {
      console.error('Failed to fetch deal rules:', error);
      // Return defaults on error
      return {
        officialMarkup: 50,
        officialSimProfit: 35,
        packageUnusedAllowance: 30,
        minDataProfitMargin: 50
      };
    }
  }

  private calculateCosts(networkData: any[], request: DealAnalysisRequest, rules: any) {
    // Find best operator/carrier combination per country
    const costPerCountry = new Map<string, { 
      dataCost: number, 
      imsiCost: number,
      carrier: string,
      operator: string,
      lte_m?: boolean,
      nb_iot?: boolean,
      alternativeCarriers?: Array<{carrier: string, operator: string}>
    }>();
    
    networkData.forEach(network => {
      const country = network.country;
      
      // Process ALL pricing entries for this network, not just the first one
      if (network.network_pricing && network.network_pricing.length > 0) {
        // Find the best pricing option for this network
        type BestPricingType = {
          dataCost: number;
          imsiCost: number;
          lte_m?: boolean;
          nb_iot?: boolean;
          source?: string;
        };
        let bestPricing: BestPricingType | null = null;
        let bestCost = Infinity;
        
        network.network_pricing.forEach((pricing: any) => {
          if (pricing?.data_per_mb) {
            const dataCostPerMB = pricing.data_per_mb;
            const imsiCost = pricing.imsi_access_fee || 0;
            const totalCost = dataCostPerMB * request.dataPerSim + imsiCost;
            
            if (totalCost < bestCost) {
              bestCost = totalCost;
              bestPricing = {
                dataCost: dataCostPerMB,
                imsiCost: imsiCost,
                lte_m: pricing.lte_m,
                nb_iot: pricing.nb_iot,
                source: pricing.pricing_sources?.source_name
              };
            }
          }
        });
        
        if (bestPricing) {
          const currentBest = costPerCountry.get(country);
          const finalPricing = bestPricing as BestPricingType;
          
          if (!currentBest || (currentBest.dataCost + currentBest.imsiCost) > bestCost) {
            // Store previous best as alternative
            const alternatives = currentBest ? [{
              carrier: currentBest.carrier,
              operator: currentBest.operator
            }] : [];
            
            costPerCountry.set(country, {
              dataCost: finalPricing.dataCost,
              imsiCost: finalPricing.imsiCost,
              carrier: network.network_name || 'Unknown Carrier',
              operator: finalPricing.source || 'Unknown Operator',
              lte_m: finalPricing.lte_m,
              nb_iot: finalPricing.nb_iot,
              alternativeCarriers: alternatives
            });
          } else if (currentBest && Math.abs(bestCost - (currentBest.dataCost + currentBest.imsiCost)) < 0.001) {
            // Add as alternative if similar cost
            currentBest.alternativeCarriers = currentBest.alternativeCarriers || [];
            currentBest.alternativeCarriers.push({
              carrier: network.network_name || 'Unknown Carrier',
              operator: finalPricing.source || 'Unknown Operator'
            });
          }
        }
      }
    });
    
    // Calculate weighted cost based on usage percentages
    let weightedDataCost = 0;
    let weightedImsiCost = 0;
    let weightedDataPerMB = 0; // Track weighted average cost per MB
    let detailedBreakdown: Record<string, any> = {};
    
    if (request.usagePercentages && Object.keys(request.usagePercentages).length > 0) {
      // Use provided usage percentages
      console.log('Applying usage percentages:', request.usagePercentages);
      
      for (const [country, percentage] of Object.entries(request.usagePercentages)) {
        const countryCosts = costPerCountry.get(country);
        if (countryCosts) {
          const countryDataCost = countryCosts.dataCost * request.dataPerSim * (percentage / 100);
          const countryImsiCost = countryCosts.imsiCost * (percentage / 100);
          
          weightedDataCost += countryDataCost;
          weightedImsiCost += countryImsiCost;
          weightedDataPerMB += countryCosts.dataCost * (percentage / 100); // Weighted average per MB
          
          // Store detailed breakdown for debugging
          detailedBreakdown[country] = {
            percentage,
            dataCostPerMB: countryCosts.dataCost,
            totalDataCost: countryDataCost,
            imsiCost: countryImsiCost,
            carrier: countryCosts.carrier,
            operator: countryCosts.operator,
            weightedContribution: countryCosts.dataCost * (percentage / 100)
          };
          
          console.log(`${country} (${percentage}%): Data=${countryDataCost.toFixed(3)}, IMSI=${countryImsiCost.toFixed(3)}, DataPerMB=${countryCosts.dataCost.toFixed(4)}`);
        }
      }
    } else {
      // Default to even distribution
      const evenPercentage = 100 / request.countries.length;
      costPerCountry.forEach((costs, country) => {
        const countryDataCost = costs.dataCost * request.dataPerSim * (evenPercentage / 100);
        const countryImsiCost = costs.imsiCost * (evenPercentage / 100);
        
        weightedDataCost += countryDataCost;
        weightedImsiCost += countryImsiCost;
        weightedDataPerMB += costs.dataCost * (evenPercentage / 100);
        
        detailedBreakdown[country] = {
          percentage: evenPercentage,
          dataCostPerMB: costs.dataCost,
          totalDataCost: countryDataCost,
          imsiCost: countryImsiCost,
          carrier: costs.carrier,
          operator: costs.operator,
          weightedContribution: costs.dataCost * (evenPercentage / 100)
        };
      });
    }
    
    // Calculate effective costs based on pricing model
    let effectiveDataCost = weightedDataCost;
    let effectiveImsiCost = weightedImsiCost;
    
    if (request.pricingModel === 'package') {
      // Package model: assume 30% unused
      effectiveDataCost = weightedDataCost * (1 - rules.packageUnusedAllowance / 100);
    }
    
    // Log the final weighted calculation
    console.log('Final weighted costs:', {
      weightedDataCost: weightedDataCost.toFixed(3),
      weightedImsiCost: weightedImsiCost.toFixed(3),
      weightedDataPerMB: weightedDataPerMB ? weightedDataPerMB.toFixed(4) : '0',
      totalPerSim: (effectiveDataCost + effectiveImsiCost).toFixed(3),
      dataPerSim: request.dataPerSim,
      countriesFound: costPerCountry.size,
      requestedCountries: request.countries
    });
    
    // Ensure we have valid values even if no network data found
    return {
      dataCost: effectiveDataCost || 0,
      imsiCost: effectiveImsiCost || 0,
      totalCostPerSim: (effectiveDataCost || 0) + (effectiveImsiCost || 0),
      totalMonthlyCost: ((effectiveDataCost || 0) + (effectiveImsiCost || 0)) * request.simCount,
      totalDataMB: request.dataPerSim,
      weightedDataPerMB: weightedDataPerMB || 0,
      costBreakdown: costPerCountry,
      carrierOptimization: this.formatCarrierOptimization(costPerCountry, request.usagePercentages || {}),
      detailedBreakdown // Include detailed breakdown for transparency
    };
  }
  
  private formatCarrierOptimization(
    costBreakdown: Map<string, any>,
    usagePercentages: Record<string, number>
  ): Record<string, any> {
    const optimization: Record<string, any> = {};
    
    costBreakdown.forEach((details, country) => {
      const usage = usagePercentages[country] || 0;
      optimization[country] = {
        primaryCarrier: details.carrier,
        operator: details.operator,
        usagePercentage: usage,
        alternativeOptions: details.alternativeCarriers || []
      };
    });
    
    return optimization;
  }

  private calculateListPrice(costs: any, rules: any): number {
    // Official pricing: cost * (1 + markup%) + fixed profit per SIM
    const markupMultiplier = 1 + (rules.officialMarkup / 100);
    const pricePerSim = (costs.effectiveCost * markupMultiplier) + (rules.officialSimProfit / 100);
    
    return pricePerSim;
  }

  private async getGeminiRecommendation(
    request: DealAnalysisRequest,
    networkData: any[],
    rules: any,
    costs: any,
    pricingOptions: any,
    usageDistribution: Record<string, number>
  ) {
    const prompt = `
Analyze this telecom deal for Monogoto sales team:

DEAL PARAMETERS:
- SIMs: ${request.simCount}
- Countries: ${request.countries.join(', ')}
- Usage Distribution: ${JSON.stringify(usageDistribution)}
- Data per SIM: ${request.dataPerSim}MB/month
- Pricing Model: Pay-as-you-go (Active SIM fee + Data charges)
- Contract: ${request.contractLength} months
${request.requestedPrice ? `- Customer wants: €${request.requestedPrice}/SIM` : ''}

PRICING OPTIONS:
Pay-as-you-go:
- Active SIM Fee: €${pricingOptions.payAsYouGo.activeSimFee.toFixed(2)}/month
- Data Fee: €${pricingOptions.payAsYouGo.dataFee.toFixed(4)}/MB
- List Price: €${pricingOptions.payAsYouGo.listPrice.toFixed(2)}/SIM

CARRIER OPTIMIZATION:
${JSON.stringify(costs.payAsYouGo.carrierOptimization, null, 2)}

INTERNAL DATA (CONFIDENTIAL):
- Weighted costs based on usage distribution
- Minimum margin: ${rules.minDataProfitMargin}%

AVAILABLE NETWORKS:
${JSON.stringify(networkData.slice(0, 5), null, 2)}

TASK: Analyze this deal and provide structured recommendations

REQUIRED OUTPUT FORMAT (Use exact structure):

{
  "approved": true/false,
  "recommendedPrice": number (per SIM/month after discount),
  "discountPercentage": number (0-25% typically, max 40% for enterprise),
  "discountTier": "Standard|Volume|Enterprise|Strategic",
  "regionalOptimization": {
    "impact": "Your weighted pricing is X% lower/higher than uniform distribution",
    "breakdown": "Brief description of network selection per country",
    "carrierStrategy": {
      "[Country]": "Using [Carrier] via [Operator] for optimal pricing",
      "[Country2]": "Leveraging [Carrier] through [Operator] network"
    }
  },
  "reasoning": [
    "Volume Commitment: [Specific tier and discount justification]",
    "Contract Length: [Duration benefit explanation]",
    "Strategic Value: [Partnership or growth opportunity]"
  ],
  "assumptions": [
    "Usage distribution remains stable ([percentages])",
    "Active SIM fee applies to all [X] SIMs monthly",
    "Data overage charged at standard pay-as-you-go rates",
    "Monthly billing cycle with NET-30 payment terms"
  ],
  "nextSteps": [
    "Confirm usage distribution with customer",
    "Lock in [X]-month pricing commitment",
    "Set up automated billing for pay-as-you-go model"
  ],
  "confidence": number (0-100),
  "warnings": [] // Only if issues found
}

DISCOUNT GUIDELINES:
- 0-100 SIMs: 0-5% discount
- 100-500 SIMs: 5-10% discount  
- 500-1000 SIMs: 10-15% discount
- 1000-5000 SIMs: 15-20% discount
- 5000+ SIMs: 20-25% discount
- Add 5% for 24+ month contracts
- Add 5% for strategic accounts

IMPORTANT: Focus on value, not cost. Never mention actual costs or margins.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Gemini analysis error:', error);
    }

    // Fallback calculation
    const baseDiscount = Math.min(
      request.simCount > 1000 ? 15 : 10,
      request.contractLength >= 24 ? 20 : 15
    );
    
    // Use the list price from pricingOptions
    const fallbackListPrice = pricingOptions.payAsYouGo.listPrice;
    
    return {
      recommendedPrice: fallbackListPrice * (1 - baseDiscount / 100),
      discountPercentage: baseDiscount,
      approved: true,
      reasoning: [
        `Volume commitment of ${request.simCount} SIMs qualifies for volume pricing`,
        `${request.contractLength}-month contract provides revenue stability`,
        'Multi-country deployment increases strategic value'
      ],
      assumptions: [
        'Pay-as-you-go usage model',
        'Standard network redundancy requirements',
        'Monthly billing cycle with upfront activation'
      ],
      warnings: []
    };
  }

  private formatSalesResponseV2(
    payAsYouGoOption: PricingOption,
    packageOption: PricingOption | null,
    geminiAnalysis: any,
    usageDistribution: Record<string, number>,
    rules: any
  ): DealAnalysisResponse {
    // Ensure we have the required structure
    const response: DealAnalysisResponse = {
      approved: geminiAnalysis?.approved ?? true,
      payAsYouGo: {
        ...payAsYouGoOption,
        discountPercentage: geminiAnalysis?.discountPercentage ?? 0,
        reasoning: geminiAnalysis?.payAsYouGoReasons ?? payAsYouGoOption.reasoning
      },
      package: packageOption ? {
        ...packageOption,
        discountPercentage: 0,
        reasoning: packageOption.reasoning
      } : undefined,
      recommendedOption: 'payAsYouGo', // Always recommend pay-as-you-go
      usageDistribution,
      reasoning: geminiAnalysis?.reasoning ?? [
        `Multi-country deployment with weighted pricing based on usage`,
        `Pay-as-you-go model provides transparency and flexibility`,
        `Pricing optimized for ${Object.keys(usageDistribution).length} countries`
      ],
      assumptions: geminiAnalysis?.assumptions ?? [
        'Usage distribution based on customer indicated patterns',
        'Active SIM fees apply to all deployed SIMs',
        'Data charges based on actual consumption'
      ],
      warnings: geminiAnalysis?.warnings,
      aiConfidence: geminiAnalysis?.confidence ?? 0.85
    };
    
    return response;
  }

  // Helper method for sales team to format the response
  formatForSalesTeam(analysis: DealAnalysisResponse, request: DealAnalysisRequest): string {
    const payAsYouGoPrice = analysis.payAsYouGo.listPrice * (1 - analysis.payAsYouGo.discountPercentage / 100);
    const totalMonthly = payAsYouGoPrice * request.simCount;
    const totalContract = totalMonthly * request.contractLength;
    
    return `
## 📊 Deal Analysis Report

### 💰 Pricing Recommendation
- **List Price**: €${analysis.payAsYouGo.listPrice.toFixed(2)} per SIM/month
- **Your Price**: €${payAsYouGoPrice.toFixed(2)} per SIM/month
- **Discount**: ${analysis.payAsYouGo.discountPercentage.toFixed(1)}% off list price
- **Total Monthly**: €${totalMonthly.toLocaleString()}
- **Contract Value**: €${totalContract.toLocaleString()} (${request.contractLength} months)

### 📝 Business Justification
${analysis.reasoning.map((r, i) => `${i + 1}. ${r}`).join('\n')}

### 🔍 Key Assumptions
${analysis.assumptions.map((a, i) => `• ${a}`).join('\n')}

### ✅ Deal Status: ${analysis.approved ? 'APPROVED' : 'REQUIRES REVIEW'}
${analysis.warnings?.length ? '\n### ⚠️ Notes\n' + analysis.warnings.join('\n') : ''}

---
*This pricing includes all platform fees and ensures sustainable margins while remaining competitive.*
`;
  }
}