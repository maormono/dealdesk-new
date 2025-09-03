import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import { DealEvaluationService } from './dealEvaluationService';
import { dealConfig } from '../config/dealConfig';
import type { DealRequest } from '../config/dealConfig';
import type { UserRole } from '../contexts/UserContext';

// Initialize Gemini AI with the most capable model
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export class AIAdvisorService {
  // Using Gemini 2.0 Flash Experimental - latest and best model with good performance
  // Alternative options: 'gemini-2.0-flash' (stable), 'gemini-2.0-pro' (highest quality)
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  });
  
  private dealEvaluator = new DealEvaluationService();
  private userRole: UserRole | null = null;
  
  constructor(userRole?: UserRole | null) {
    this.userRole = userRole || null;
  }

  async processNaturalLanguageQuery(query: string): Promise<{
    answer: string;
    data?: any[];
    confidence: number;
  }> {
    try {
      // Parse the query to extract deal parameters
      const dealParams = await this.extractDealParameters(query);
      
      // If we can extract structured deal parameters, use the deal evaluation service
      if (dealParams) {
        const evaluation = await this.dealEvaluator.evaluateDeal(dealParams);
        
        // Format the evaluation results for AI presentation
        const answer = await this.formatEvaluationWithAI(evaluation, dealParams, query);
        
        return {
          answer,
          data: evaluation.carrierOptions,
          confidence: 0.95 // High confidence when using structured evaluation
        };
      }
      
      // Otherwise, fall back to general network data analysis
      // First, fetch ALL network data to give Gemini full context
      const { data: networksData, error } = await supabase
        .from('networks')
        .select(`
          id,
          network_name,
          country,
          tadig,
          network_pricing (
            data_per_mb,
            sms_mo,
            sms_mt,
            imsi_access_fee,
            lte_m,
            nb_iot,
            notes,
            pricing_sources (
              source_name
            )
          )
        `)
        .order('country', { ascending: true });

      if (error) throw error;

      // Transform the data to a simpler format
      const networks: any[] = [];
      networksData?.forEach(network => {
        network.network_pricing?.forEach((pricing: any) => {
          networks.push({
            network_name: network.network_name,
            country: network.country,
            tadig: network.tadig,
            operator: pricing.pricing_sources?.source_name || 'Unknown',
            data_cost_per_mb: pricing.data_per_mb || 0,
            data_cost_per_gb: (pricing.data_per_mb || 0) * 1024,
            sms_cost: pricing.sms_mo || pricing.sms_mt || 0,
            imsi_cost: pricing.imsi_access_fee || 0,
            supports_cat_m: pricing.lte_m || false,
            supports_nb_iot: pricing.nb_iot || false,
            notes: pricing.notes
          });
        });
      });

      // Create a comprehensive prompt for Gemini based on user role
      const isSales = this.userRole?.role === 'sales';
      const canSeeCosts = this.userRole?.canSeeCosts || false;
      
      const systemPrompt = isSales ? `
You are an expert telecom pricing advisor for Monogoto's sales team. You have access to customer pricing data.

USER QUERY: "${query}"

AVAILABLE NETWORK DATA:
${JSON.stringify(networks, null, 2)}

IMPORTANT INSTRUCTIONS FOR SALES RESPONSES:
1. You are speaking to a sales representative
2. The prices shown are already customer prices (with built-in margin)
3. NEVER mention costs, margins, or markup percentages
4. NEVER reveal that prices have been adjusted
5. Focus on value proposition and competitive positioning
6. Present pricing as competitive market rates
7. Emphasize service quality and coverage benefits

RESPONSE FORMAT:
"📊 Deal Analysis: [Brief Summary]

💰 Pricing Recommendation:
• Standard Price: €X.XX per SIM/month
• Volume Discount Available: Up to XX% for large deals
• Total Monthly: €X,XXX

📝 Value Proposition:
• [Coverage benefit 1]
• [Service quality benefit 2]
• [Competitive advantage]

✅ Deal Recommendation: [Highly Competitive/Competitive/Needs Review]"

Focus on helping close deals by emphasizing value, not revealing internal pricing structures.
` : `
You are an expert telecom pricing advisor for Monogoto's operations team. You have access to network pricing and cost data.

USER QUERY: "${query}"

AVAILABLE NETWORK DATA:
${JSON.stringify(networks, null, 2)}

PRICING RULES (INTERNAL USE ONLY):
- Connectivity markup: ${dealConfig.connectivityMarkup * 100}% on carrier costs
- Platform cost: €${dealConfig.platformCosts.activeSIMCost} per active SIM
- Minimum margin requirement: ${dealConfig.margins.minimum * 100}%
- Target margin: ${dealConfig.margins.target * 100}%

INSTRUCTIONS FOR ADMIN/OPERATIONS RESPONSES:
1. You CAN reveal actual costs and margins
2. Show both cost and recommended customer pricing
3. Include margin calculations
4. Provide detailed profitability analysis
5. Be transparent about pricing structure

RESPONSE FORMAT:
"📊 Deal Analysis: [Brief Summary]

💰 Cost & Pricing Breakdown:
• Carrier Cost: €X.XX per SIM/month
• Platform Cost: €X.XX per SIM/month
• Total Cost: €X.XX per SIM/month
• Recommended Price: €X.XX per SIM/month
• Margin: XX%

📝 Profitability Analysis:
• [Cost driver 1]
• [Margin consideration 2]
• [Risk factor if applicable]

✅ Deal Status: [Profitable/Marginal/Loss-making]"

Provide full transparency on costs and margins for internal decision-making.
`;

      console.log(`Processing query with ${networks.length} networks available`);
      
      const result = await this.model.generateContent(systemPrompt);
      const response = result.response;
      const answer = response.text();

      // Calculate confidence based on response characteristics
      let confidence = 0.8; // Base confidence with Gemini Pro
      if (networks.length > 0) confidence += 0.1;
      if (answer.includes('€') || answer.includes('$')) confidence += 0.05;
      if (answer.length > 100) confidence += 0.05;
      confidence = Math.min(confidence, 1.0);

      return {
        answer,
        data: networks,
        confidence
      };

    } catch (error) {
      console.error('Error processing query:', error);
      
      // Fallback response
      return {
        answer: `I encountered an error processing your query. Please make sure:
1. The Gemini API key is configured correctly
2. You have access to Gemini 1.5 Pro (or try 'gemini-1.5-flash' instead)
3. Your internet connection is stable

Error details: ${error}`,
        data: [],
        confidence: 0
      };
    }
  }

  async getSuggestions(context: string): Promise<string[]> {
    const prompt = `
Given a telecom pricing database query context: "${context}"

Generate 3 relevant follow-up questions that would help analyze:
- Pricing optimization
- Network coverage
- IoT deployment options
- Cost comparisons
- Volume discounts

Return ONLY a JSON array of 3 question strings, nothing else.
Example: ["Question 1?", "Question 2?", "Question 3?"]
`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // Try to extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          return suggestions.slice(0, 3);
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }

    // Fallback suggestions
    return [
      'What are the best IoT network options for large-scale deployments?',
      'How do pricing tiers change with volume commitments?',
      'Which operators offer the most comprehensive coverage in Europe?'
    ];
  }

  private async extractDealParameters(query: string): Promise<DealRequest | null> {
    try {
      // Use AI to extract structured parameters from natural language
      const extractionPrompt = `
Extract deal parameters from this query. Return ONLY valid JSON, no markdown formatting.

Query: "${query}"

Extract these parameters and return as JSON:
{
  "simQuantity": number,
  "countries": ["country1", "country2"],
  "monthlyDataPerSim": number (in GB),
  "monthlySmsPerSim": number (default 0),
  "duration": number (months),
  "proposedPricePerSim": number (if mentioned, otherwise use 0),
  "currency": "EUR" or "USD" (default EUR),
  "carriers": [] (specific carrier names if mentioned),
  "isNewCustomer": boolean (default true),
  "expectedUsagePattern": "low" | "medium" | "high" (default "medium"),
  "requiresIoT": boolean (default false)
}

If you cannot extract clear deal parameters, return null.
`;

      const result = await this.model.generateContent(extractionPrompt);
      const text = result.response.text();
      
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const params = JSON.parse(jsonMatch[0]);
        
        // Validate required fields
        if (params.simQuantity && params.countries && params.monthlyDataPerSim) {
          // Set defaults for missing fields
          return {
            simQuantity: params.simQuantity,
            countries: params.countries,
            monthlyDataPerSim: params.monthlyDataPerSim,
            monthlySmsPerSim: params.monthlySmsPerSim || 0,
            duration: params.duration || 12,
            proposedPricePerSim: params.proposedPricePerSim || 2, // Default €2 if not specified
            currency: params.currency || 'EUR',
            carriers: params.carriers || [],
            isNewCustomer: params.isNewCustomer !== false,
            expectedUsagePattern: params.expectedUsagePattern || 'medium',
            requiresIoT: params.requiresIoT || false,
            usagePercentages: this.calculateUsagePercentages(params.countries)
          } as DealRequest;
        }
      }
    } catch (error) {
      console.error('Error extracting deal parameters:', error);
    }
    
    return null;
  }

  private calculateUsagePercentages(countries: string[]): Record<string, number> {
    // Evenly distribute usage across countries if not specified
    const percentage = 100 / countries.length;
    const percentages: Record<string, number> = {};
    countries.forEach(country => {
      percentages[country] = percentage;
    });
    return percentages;
  }

  private async formatEvaluationWithAI(evaluation: any, dealParams: DealRequest, originalQuery: string): Promise<string> {
    // Format the evaluation results in a user-friendly way
    const verdict = evaluation.verdict.toUpperCase();
    const isSales = this.userRole?.role === 'sales';
    const profitMargin = (evaluation.profitMargin * 100).toFixed(1);
    
    // Calculate pricing details with role-aware markup
    const markupMultiplier = isSales ? 1.5 : 1.0; // 50% markup for sales
    
    const payAsYouGo = {
      activeSim: (evaluation.platformFees * markupMultiplier).toFixed(2),
      dataRate: ((evaluation.carrierDataCost / dealParams.monthlyDataPerSim) / 1024 * (1 + dealConfig.connectivityMarkup) * markupMultiplier).toFixed(2),
      total: (evaluation.totalCostPerSim * markupMultiplier).toFixed(2)
    };
    
    const packagePrice = (evaluation.revenuePerSim || evaluation.recommendedPrice || evaluation.totalCostPerSim * (1 + dealConfig.margins.target)) * markupMultiplier;
    
    // Get volume discount
    const volumeDiscount = this.getVolumeDiscount(dealParams.simQuantity);
    
    // Build carrier details
    const carrierDetails = evaluation.carrierOptions.map((opt: any) => {
      return `
### ${opt.country}
**${opt.carrier}** via ${opt.operator}
✓ Preferred Network`;
    }).join('\n');
    
    // Calculate package pricing
    const packageMonthlyFee = packagePrice.toFixed(2);
    const packageTotalMonthly = (packagePrice * dealParams.simQuantity).toFixed(0);
    const payAsYouGoTotal = (parseFloat(payAsYouGo.total) * dealParams.simQuantity).toFixed(0);
    const packageSavings = ((1 - (parseFloat(packageTotalMonthly) / parseFloat(payAsYouGoTotal))) * 100).toFixed(0);
    
    // Format the response based on user role
    if (isSales) {
      // Sales-focused response - NO cost/margin information
      return `## Deal Evaluation

### ${verdict === 'APPROVED' ? '✅ DEAL APPROVED' : verdict === 'REVIEW' ? '⚠️ NEEDS REVIEW' : '❌ NOT RECOMMENDED'}

## 💡 Standard Pricing Structure

**ACTIVE SIM FEE**
$${payAsYouGo.activeSim}/month

**DATA RATE**
$${payAsYouGo.dataRate}/GB

**ESTIMATED MONTHLY**
$${payAsYouGo.total}/SIM

## 💳 Recommended Package Deal

**MONTHLY FEE**
$${packageMonthlyFee}/SIM

**DATA INCLUDED**
${dealParams.monthlyDataPerSim}GB

**TOTAL MONTHLY**
$${packageTotalMonthly}

**VOLUME DISCOUNT**
${(volumeDiscount * 100).toFixed(0)}% OFF list price

## 📊 Coverage Summary

${dealParams.countries.map(country => `**${country}:** Full Coverage ✓`).join('  ')}

## 🌐 Network Coverage

${evaluation.carrierOptions.map((opt: any) => `**${opt.country.toUpperCase()}**
Premium Network Available
✓ Full LTE/5G Coverage`).join('\n\n')}

## 📝 Value Proposition

✓ Volume pricing for ${dealParams.simQuantity} SIMs
✓ ${dealParams.duration}-month commitment benefits
✓ Multi-country roaming included
✓ Premium network quality guaranteed
✓ 24/7 support included

## 💰 Pricing Summary

**Package Price:** $${packageMonthlyFee}/SIM/month
**Volume Discount:** ${(volumeDiscount * 100).toFixed(0)}%
**Total Monthly Value:** $${packageTotalMonthly}

## ✨ Competitive Advantages

• Best-in-class network coverage across ${dealParams.countries.length} countries
• Seamless roaming with no additional charges
• Enterprise-grade SLAs and support
• Flexible data pooling options available
• Real-time usage monitoring dashboard

**Next Steps:** ${verdict === 'APPROVED' ? 'Ready to proceed with contract' : 'Contact sales manager for special pricing options'}`;
    } else {
      // Admin/Operations response - FULL transparency
      return `## Evaluation Results

### ${verdict}

## 💡 Pay-as-you-go Pricing Structure

**ACTIVE SIM FEE**
$${payAsYouGo.activeSim}/month

**DATA RATE**
$${payAsYouGo.dataRate}/GB

**TOTAL/SIM**
$${payAsYouGo.total}

**DISCOUNT**
${(volumeDiscount * 100).toFixed(1)}% OFF

## 💳 Package Pricing Structure

**MONTHLY FEE**
$${packageMonthlyFee}/SIM

**DATA INCLUDED**
${dealParams.monthlyDataPerSim}GB

**TOTAL PACKAGE**
$${packageTotalMonthly}/month

**SAVINGS**
${packageSavings}% vs Pay-as-you-go

## 📊 Regional & Carrier Optimization:

${dealParams.countries.map(country => `**${country}:** ${(100/dealParams.countries.length).toFixed(0)}%`).join('  ')}

## 📝 Business Justification:

✓ Volume commitment of ${dealParams.simQuantity} SIMs qualifies for volume pricing
✓ ${dealParams.duration}-month contract provides revenue stability
✓ Multi-country deployment increases strategic value

## 🔍 Key Assumptions:

• Pay-as-you-go usage model
• Standard network redundancy requirements
• Monthly billing cycle with upfront activation

**DEAL STATUS**

✅

**YOUR PRICE**
$${packagePrice.toFixed(2)}

**SAVINGS**
${(volumeDiscount * 100).toFixed(0)}%

**MONTHLY VALUE**
$${packageTotalMonthly}

## 🌐 Network Structure

${evaluation.carrierOptions.map((opt: any) => `**${opt.country.toUpperCase()}**
${opt.carrier} via ${opt.operator}
✓ Preferred`).join('\n\n')}

## 📊 Detailed Analysis

**Deal Overview:** ${dealParams.simQuantity} SIMs requiring ${dealParams.monthlyDataPerSim}GB/month across ${dealParams.countries.length} countries

**Network Selection Reasoning:**
${evaluation.carrierOptions.map((opt: any) => 
  `• **${opt.country}:** Selected ${opt.carrier} via ${opt.operator} at €${(opt.pricePerMB * 1024 * markupMultiplier).toFixed(2)}/GB (€${(opt.pricePerMB * dealParams.monthlyDataPerSim * 1024 * markupMultiplier).toFixed(2)}/SIM for ${dealParams.monthlyDataPerSim}GB)
→ Chosen as the most cost-effective option available in ${opt.country}`
).join('\n')}

**Cost Breakdown per SIM:**
• Average carrier data cost: €${evaluation.carrierDataCost.toFixed(3)}
• Average IMSI fees: €0.050
• Platform cost per active SIM: €${evaluation.platformFees.toFixed(2)}

**Profitability Analysis:**
• ${profitMargin}% margin - ${parseFloat(profitMargin) >= 20 ? 'above' : 'below'} minimum 20% threshold
• Volume discount of ${(volumeDiscount * 100).toFixed(0)}% applied for ${dealParams.simQuantity} SIMs

**Alternative Network Options:**
• Additional networks may be available at different price points
• Consider multi-network redundancy for critical deployments

**Risk Assessment:**
• ${dealParams.isNewCustomer ? 'New customer - additional onboarding and credit checks required' : 'Existing customer - established relationship'}
• ${dealParams.duration >= 24 ? 'Long contract (' + dealParams.duration + ' months) - stable revenue stream' : 'Standard contract duration'}`;
    }
  }

  private getVolumeDiscount(quantity: number): number {
    const tier = dealConfig.volumeTiers.find(t => 
      quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty)
    );
    return tier?.discount || 0;
  }
}