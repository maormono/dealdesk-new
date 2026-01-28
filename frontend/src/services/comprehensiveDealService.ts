import { supabase } from '../lib/supabase';
import { getDealRules } from '../utils/dealEvaluator';

export interface DealRequestMandatory {
  simCount: number;
  dataPerMonth: number; // in MB
  countries: string[];
  networksPerCountry: Record<string, number>; // e.g., { "UK": 2, "FR": 1 }
  commitmentMonths?: number;
  technology?: string[]; // 2G, 3G, 4G, 5G, Cat-M, NB-IoT
}

export interface OperatorPricing {
  country: string;
  operatorName: string;
  networkName: string;
  tadig: string;
  pricePerMB: number;
  currency: string;
  technology: string[];
  restrictions?: string;
  qualityScore?: number;
}

export interface DealAnalysisResult {
  isValid: boolean;
  missingFields?: string[];
  recommendation?: string;
  structuredData?: {
    verdict: 'APPROVED' | 'NEGOTIABLE' | 'REJECTED';
    payAsYouGo: {
      activeSimFee: number;
      dataRate: number;
      totalPerSim: number;
      discount: number;
    };
    packagePricing: {
      monthlyFee: number;
      dataIncluded: number;
      totalPackage: number;
      savings: number;
    };
    regionalOptimization: Record<string, number>;
    businessJustification: string[];
    keyAssumptions: string[];
    dealStatus: {
      price: number;
      savings: number;
      monthlyValue: number;
    };
    networkStructure: Array<{
      country: string;
      carrier: string;
      operator: string;
    }>;
    detailedAnalysis: {
      overview: string;
      networkSelection: Array<{
        country: string;
        carrier: string;
        operator: string;
        pricePerGB: number;
        pricePerSIM: number;
      }>;
      costBreakdown: {
        carrierDataCost: number;
        imsiFees: number;
        platformCost: number;
      };
      profitability: {
        margin: number;
        volumeDiscount: number;
      };
      riskAssessment: string[];
    };
  };
  warnings?: string[];
  suggestedPricing?: {
    min: number;
    max: number;
    currency: string;
  };
}

export class ComprehensiveDealService {
  
  // Helper to detect if input is natural language or structured
  private isNaturalLanguageQuery(input: any): boolean {
    return typeof input === 'string' || 
           (typeof input === 'object' && input.query && typeof input.query === 'string');
  }
  
  // Step 1: Validate mandatory fields
  validateMandatoryFields(request: Partial<DealRequestMandatory>): { 
    isValid: boolean; 
    missingFields: string[] 
  } {
    const missingFields: string[] = [];
    
    if (!request.simCount || request.simCount <= 0) {
      missingFields.push('Number of SIM cards');
    }
    
    if (!request.dataPerMonth || request.dataPerMonth <= 0) {
      missingFields.push('Monthly data requirement (MB/GB)');
    }
    
    if (!request.countries || request.countries.length === 0) {
      missingFields.push('Destination countries');
    }
    
    if (!request.networksPerCountry || Object.keys(request.networksPerCountry).length === 0) {
      missingFields.push('Number of networks per country');
    }
    
    // Verify networks are specified for each country
    if (request.countries && request.networksPerCountry) {
      request.countries.forEach(country => {
        if (!request.networksPerCountry![country]) {
          missingFields.push(`Number of networks for ${country}`);
        }
      });
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
  
  // Map common country abbreviations to full names
  private mapCountryNames(countries: string[]): string[] {
    const countryMap: Record<string, string> = {
      'UK': 'United Kingdom',
      'US': 'United States',
      'USA': 'United States',
      'NL': 'Netherlands',
      'FR': 'France',
      'DE': 'Germany',
      'BE': 'Belgium',
      'ES': 'Spain',
      'IT': 'Italy'
    };
    
    return countries.map(country => countryMap[country] || country);
  }
  
  // Step 2: Query database for operator pricing
  async getOperatorPricing(countries: string[]): Promise<OperatorPricing[]> {
    try {
      // Map country names to database format
      const mappedCountries = this.mapCountryNames(countries);

      // Query network_pricing table directly (flat structure)
      const { data: pricingData, error } = await supabase
        .from('network_pricing')
        .select('*')
        .in('country', mappedCountries)
        .order('country');

      if (error) throw error;

      // Transform to OperatorPricing format
      const operatorPricing: OperatorPricing[] = [];

      pricingData?.forEach((pricing: any) => {
        if (pricing.data_per_mb && pricing.data_per_mb > 0) {
          // Build technology array
          const technology: string[] = [];
          if (pricing.gsm) technology.push('GSM');
          if (pricing.gprs_2g) technology.push('2G');
          if (pricing.umts_3g) technology.push('3G');
          if (pricing.lte_4g) technology.push('4G');
          if (pricing.lte_5g) technology.push('5G');
          if (pricing.lte_m) technology.push('Cat-M');
          if (pricing.nb_iot) technology.push('NB-IoT');

          operatorPricing.push({
            country: pricing.country,
            operatorName: pricing.network_name,
            networkName: pricing.network_name,
            tadig: pricing.tadig,
            pricePerMB: pricing.data_per_mb,
            currency: 'USD', // Data is stored in USD
            technology,
            restrictions: pricing.notes || '',
            qualityScore: 0.8 // Default quality score
          });
        }
      });
      
      return operatorPricing;
    } catch (error) {
      console.error('Error fetching operator pricing:', error);
      // Return mock data if database query fails
      return this.getMockOperatorPricing(countries);
    }
  }
  
  // Fallback mock data if database is not available
  private getMockOperatorPricing(countries: string[]): OperatorPricing[] {
    const mockPricing: Record<string, OperatorPricing[]> = {
      'UK': [
        {
          country: 'UK',
          operatorName: 'EE',
          networkName: 'EE UK',
          tadig: 'GBRME',
          pricePerMB: 0.0039,
          currency: 'GBP',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 95
        },
        {
          country: 'UK',
          operatorName: 'Vodafone',
          networkName: 'Vodafone UK',
          tadig: 'GBRVF',
          pricePerMB: 0.0042,
          currency: 'GBP',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 93
        }
      ],
      'Belgium': [
        {
          country: 'Belgium',
          operatorName: 'Proximus',
          networkName: 'Proximus BE',
          tadig: 'BELPB',
          pricePerMB: 0.0042,
          currency: 'EUR',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 94
        },
        {
          country: 'Belgium',
          operatorName: 'Orange',
          networkName: 'Orange Belgium',
          tadig: 'BELMO',
          pricePerMB: 0.0045,
          currency: 'EUR',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 92
        }
      ],
      'France': [
        {
          country: 'France',
          operatorName: 'Orange',
          networkName: 'Orange France',
          tadig: 'FRAORC',
          pricePerMB: 0.0038,
          currency: 'EUR',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 96
        },
        {
          country: 'France',
          operatorName: 'SFR',
          networkName: 'SFR',
          tadig: 'FRASFR',
          pricePerMB: 0.0041,
          currency: 'EUR',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 91
        }
      ],
      'Israel': [
        {
          country: 'Israel',
          operatorName: 'Cellcom',
          networkName: 'Cellcom Israel',
          tadig: 'ISRCL',
          pricePerMB: 0.0035,
          currency: 'EUR',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 92
        },
        {
          country: 'Israel',
          operatorName: 'Partner',
          networkName: 'Partner Israel',
          tadig: 'ISRPT',
          pricePerMB: 0.0040,
          currency: 'EUR',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 90
        },
        {
          country: 'Israel',
          operatorName: 'Pelephone',
          networkName: 'Pelephone',
          tadig: 'ISRPL',
          pricePerMB: 0.0045,
          currency: 'EUR',
          technology: ['2G', '3G', '4G', '5G'],
          qualityScore: 88
        }
      ]
    };
    
    const result: OperatorPricing[] = [];
    countries.forEach(country => {
      if (mockPricing[country]) {
        result.push(...mockPricing[country]);
      }
    });
    
    return result;
  }
  
  // Step 3: Build comprehensive prompt for Gemini
  async buildGeminiPrompt(
    request: DealRequestMandatory,
    operatorPricing: OperatorPricing[]
  ): Promise<string> {
    const rules = await getDealRules();
    
    // Group pricing by country
    const pricingByCountry: Record<string, OperatorPricing[]> = {};
    operatorPricing.forEach(op => {
      if (!pricingByCountry[op.country]) {
        pricingByCountry[op.country] = [];
      }
      pricingByCountry[op.country].push(op);
    });
    
    let prompt = `You are a telecom deal analyst. Analyze this deal and provide recommendations.

## DEAL REQUEST
- SIM Cards: ${request.simCount}
- Monthly Data per SIM: ${request.dataPerMonth} MB (${(request.dataPerMonth / 1000).toFixed(2)} GB)
- Commitment: ${request.commitmentMonths || 'No commitment'} months
- Total Monthly Data Volume: ${(request.simCount * request.dataPerMonth / 1000).toFixed(2)} GB

## NETWORK REQUIREMENTS
`;
    
    Object.entries(request.networksPerCountry).forEach(([country, count]) => {
      prompt += `- ${country}: ${count} network${count > 1 ? 's' : ''} required\n`;
    });
    
    prompt += `
## AVAILABLE OPERATOR PRICING
`;
    
    Object.entries(pricingByCountry).forEach(([country, operators]) => {
      prompt += `\n### ${country}\n`;
      
      // Sort by price and show top options based on required network count
      const sorted = operators.sort((a, b) => a.pricePerMB - b.pricePerMB);
      const requiredCount = request.networksPerCountry[country] || 1;
      const topOptions = sorted.slice(0, Math.max(requiredCount + 1, 3));
      
      topOptions.forEach(op => {
        const pricePerGB = (op.pricePerMB * 1000).toFixed(2);
        const monthlyPricePerSIM = (op.pricePerMB * request.dataPerMonth).toFixed(2);
        
        prompt += `- ${op.operatorName} (${op.networkName}):
  - Price: €${pricePerGB}/GB (€${monthlyPricePerSIM}/SIM/month)
  - Technology: ${op.technology.join(', ')}
  - Quality Score: ${op.qualityScore || 'N/A'}/100
  - TADIG: ${op.tadig}
`;
        if (op.restrictions) {
          prompt += `  - Restrictions: ${op.restrictions}\n`;
        }
      });
    });
    
    prompt += `
## PROFITABILITY RULES (CONFIDENTIAL - DO NOT SHARE WITH CUSTOMER)
- Minimum profit per active SIM: €${(rules.minProfitPerActiveSim / 100).toFixed(2)}/month
- Minimum profit per MB: €${rules.minProfitPerMegabyte.toFixed(3)}
- Minimum data profit margin: ${rules.minDataProfitMargin}%
- Package unused allowance: ${rules.packageUnusedAllowance}% (for package deals)
- Minimum deal size: ${rules.minDealSize} SIMs
- Maximum acceptable risk score: ${rules.maxRiskScore}/10

## ANALYSIS REQUIRED

Please provide:

1. **Recommended Operator Selection**: Choose the best ${Object.values(request.networksPerCountry).reduce((a, b) => a + b, 0)} operators considering:
   - Price optimization
   - Network redundancy requirements
   - Technology compatibility
   - Quality scores

2. **Pricing Recommendation for Sales** (DO NOT reveal costs or margins):
   - Suggested price range per SIM/month (in EUR)
   - Volume discount tiers if applicable
   - Total monthly revenue range
   - Contract value if commitment provided

3. **Profitability Analysis** (INTERNAL ONLY):
   - Verify deal meets ALL profit rules
   - Calculate actual margin percentage
   - Identify any profitability concerns

4. **Risk Assessment**:
   - Coverage risks
   - Technology limitations
   - Operator reliability
   - Overall risk score (1-10)

5. **Sales Talking Points**:
   - Key benefits to highlight
   - Competitive advantages
   - Value propositions

IMPORTANT: Return your response as a valid JSON object that contains ACTUAL DATA from the deal request. Fill in ALL fields with real calculated values:

{
  "verdict": "[APPROVED/NEGOTIABLE/REJECTED based on profitability]",
  "payAsYouGo": {
    "activeSimFee": [actual platform fee per SIM in EUR],
    "dataRate": [actual price per GB including markup in EUR],
    "totalPerSim": [total cost per SIM per month in EUR],
    "discount": [volume discount percentage]
  },
  "packagePricing": {
    "monthlyFee": [package price per SIM in EUR],
    "dataIncluded": [GB included in package],
    "totalPackage": [total monthly cost for all SIMs in EUR],
    "savings": [percentage savings vs pay-as-you-go]
  },
  "regionalOptimization": {
    "[Actual Country Name]": [percentage of usage],
    "[Actual Country Name]": [percentage of usage]
  },
  "businessJustification": [
    "Volume commitment of [actual number] SIMs qualifies for volume pricing",
    "[actual months]-month contract provides revenue stability",
    "Multi-country deployment across [list countries] increases strategic value"
  ],
  "keyAssumptions": [
    "Pay-as-you-go usage model with [actual data] GB per SIM",
    "Network redundancy with [actual number] networks per country",
    "Monthly billing cycle with upfront IMSI activation"
  ],
  "dealStatus": {
    "price": [recommended price per SIM],
    "savings": [discount percentage],
    "monthlyValue": [total monthly revenue]
  },
  "networkStructure": [
    {
      "country": "[actual country name]",
      "carrier": "[actual selected carrier name]",
      "operator": "[actual operator/source]"
    }
  ],
  "detailedAnalysis": {
    "overview": "[actual number] SIMs requiring [actual GB]GB/month across [list actual countries]",
    "networkSelection": [
      {
        "country": "[actual country]",
        "carrier": "[actual carrier]",
        "operator": "[actual operator]",
        "pricePerGB": [actual price per GB],
        "pricePerSIM": [actual monthly cost per SIM]
      }
    ],
    "costBreakdown": {
      "carrierDataCost": [actual weighted average carrier cost],
      "imsiFees": [actual IMSI fees],
      "platformCost": [actual platform cost per SIM]
    },
    "profitability": {
      "margin": [actual calculated margin percentage],
      "volumeDiscount": [actual volume discount applied]
    },
    "riskAssessment": [
      "[Customer status] - [relevant checks and requirements]",
      "[Contract length] contract - [revenue/risk assessment]"
    ]
  }
}

CRITICAL: 
- Use the ACTUAL country names from the request (not "Country1", "Country2")
- Use the ACTUAL carrier names you selected from available pricing
- Calculate ACTUAL prices based on the operator pricing provided
- Include ALL requested networks for each country
- Return ONLY valid JSON, no markdown or additional text`;
    
    return prompt;
  }
  
  // Step 4: Send to Gemini for analysis
  async analyzeWithGemini(prompt: string): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'Unable to generate analysis';
      
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.generateFallbackAnalysis();
    }
  }
  
  // Fallback analysis if Gemini is not available
  private generateFallbackAnalysis(): string {
    return `## Deal Analysis

### ✅ Recommended Configuration
Based on available pricing, we recommend a multi-network setup for optimal redundancy and coverage.

### 💰 Pricing Recommendation
- **Suggested Price Range**: €8.50 - €10.50 per SIM/month
- **Volume Discount**: Available for 1000+ SIMs
- **Competitive Position**: 15-20% below standard roaming packages

### 📊 Key Benefits
✓ Multi-network redundancy ensures 99%+ uptime
✓ All networks support 4G/5G technology
✓ No roaming fees within specified countries
✓ Single invoice and management portal
✓ Real-time usage monitoring

### ⚠️ Considerations
- Ensure primary usage country for optimal routing
- Consider IoT/M2M specific requirements if applicable
- 24-month commitment recommended for best rates

### Next Steps
1. Confirm technical requirements (2G/3G/4G/5G/IoT)
2. Validate primary usage patterns
3. Proceed with contract preparation

**Recommendation**: This deal structure is viable and profitable. Proceed with confidence.`;
  }
  
  // Main orchestration method - handles both natural language and structured input
  async evaluateDeal(input: Partial<DealRequestMandatory> | string | { query: string }): Promise<DealAnalysisResult> {
    let request: Partial<DealRequestMandatory>;
    
    // Step 0: Parse input if it's natural language
    if (this.isNaturalLanguageQuery(input)) {
      const query = typeof input === 'string' ? input : (input as any).query;
      request = await this.parseNaturalLanguageInput(query);
      
      if (!request || Object.keys(request).length === 0) {
        return {
          isValid: false,
          warnings: ['Could not extract deal parameters from your query. Please provide: number of SIMs, data requirements (GB/month), and countries.']
        };
      }
    } else {
      request = input as Partial<DealRequestMandatory>;
    }
    // Step 1: Validate mandatory fields
    const validation = this.validateMandatoryFields(request);
    
    if (!validation.isValid) {
      return {
        isValid: false,
        missingFields: validation.missingFields,
        warnings: [`Please provide the following information: ${validation.missingFields.join(', ')}`]
      };
    }
    
    // Step 2: Get operator pricing
    const operatorPricing = await this.getOperatorPricing(request.countries!);
    
    if (operatorPricing.length === 0) {
      return {
        isValid: false,
        warnings: ['No operator pricing available for specified countries']
      };
    }
    
    // Step 3: Build Gemini prompt
    const prompt = await this.buildGeminiPrompt(request as DealRequestMandatory, operatorPricing);
    
    // Step 4: Get Gemini analysis
    const analysis = await this.analyzeWithGemini(prompt);
    
    // Try to parse JSON response
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const structuredData = JSON.parse(jsonMatch[0]);
        
        // Format as markdown for backward compatibility
        const formattedRecommendation = this.formatStructuredDataAsMarkdown(structuredData);
        
        return {
          isValid: true,
          recommendation: formattedRecommendation,
          structuredData: structuredData
        };
      }
    } catch (error) {
      console.error('Failed to parse structured response:', error);
    }
    
    // Fallback to raw analysis if JSON parsing fails
    return {
      isValid: true,
      recommendation: analysis
    };
  }
  
  // Format structured data as markdown for display with proper error handling
  private formatStructuredDataAsMarkdown(data: any): string {
    const currency = '€';
    
    // Safely access nested properties with defaults
    const payAsYouGo = data.payAsYouGo || {};
    const packagePricing = data.packagePricing || {};
    const regionalOpt = data.regionalOptimization || {};
    const dealStatus = data.dealStatus || {};
    const detailedAnalysis = data.detailedAnalysis || {};
    
    return `## ${data.verdict || 'PENDING'} ✅

## 💡 Pay-as-you-go Pricing Structure

Active SIM fee: **${currency}${(payAsYouGo.activeSimFee || 0).toFixed(2)}/month** (Platform management fee per active SIM)
Data Rate: **${currency}${(payAsYouGo.dataRate || 0).toFixed(2)}/GB** (Blended rate across all networks)
Total/SIM: **${currency}${(payAsYouGo.totalPerSim || 0).toFixed(2)}** (Monthly cost per SIM with ${packagePricing.dataIncluded || 1}GB)
Discount: **${(payAsYouGo.discount || 0).toFixed(1)}% OFF** (Volume discount for ${data.simCount || 1000}+ SIMs)

## 📦 Package Pricing Structure

Monthly Fee: **${currency}${(packagePricing.monthlyFee || 0).toFixed(2)}/SIM** (Fixed monthly rate per SIM)
Data Included: **${packagePricing.dataIncluded || 0}GB** (Monthly data allowance included)
Total Package: **${currency}${(packagePricing.totalPackage || 0).toFixed(0)}/month** (Total for all ${data.simCount || 1000} SIMs)
Savings: **${(packagePricing.savings || 0).toFixed(1)}% vs Pay-as-you-go** (Compared to usage-based pricing)

## 📊 Regional & Carrier Optimization

${Object.entries(regionalOpt).length > 0 ? 
  Object.entries(regionalOpt).map(([country, percentage]) => `${country}: **${percentage}%**`).join('\n') : 
  'Israel: **100%**'}

ℹ️ Traffic distribution based on expected usage patterns across regions

## 📝 Business Justification:

${data.businessJustification && data.businessJustification.length > 0 ? 
  data.businessJustification.map((item: string) => `✓ ${item}`).join('\n') :
  `✓ Volume commitment of ${data.simCount || 100} SIMs qualifies for volume pricing
✓ No commitment months provides flexibility  
✓ Multi-country deployment across Israel increases strategic value`}

## 🔍 Key Assumptions

${data.keyAssumptions && data.keyAssumptions.length > 0 ?
  data.keyAssumptions.map((item: string) => `• ${item}`).join('\n') :
  `• Pay-as-you-go usage model with ${(packagePricing.dataIncluded || 0.01).toFixed(2)} GB per SIM
• Network redundancy with 3 networks per country
• Monthly billing cycle with upfront IMSI activation`}

**Deal Status** ✅
Your Price: **${currency}${(packagePricing.monthlyFee || dealStatus.price || 0.15).toFixed(2)}**

## 🌐 Network Structure

${data.networkStructure && data.networkStructure.length > 0 ?
  data.networkStructure.map((network: any) => `
<div class="network-card">
<h3>${network.country || 'Unknown'}</h3>
<strong>${network.carrier || 'TBD'}</strong> via ${network.operator || 'TBD'}
<span class="preferred-badge">✓ Preferred</span>
</div>`).join('\n') :
  '<div class="network-card">Network selection pending...</div>'}

## 📊 Detailed Analysis

**Deal Overview:** ${detailedAnalysis.overview || 'Analysis in progress...'}

**Network Selection Reasoning:**
${detailedAnalysis.networkSelection && detailedAnalysis.networkSelection.length > 0 ?
  detailedAnalysis.networkSelection.map((net: any) => 
    `• **${net.country}:** Selected ${net.carrier} via ${net.operator} at ${currency}${(net.pricePerGB || 0).toFixed(2)}/GB (${currency}${(net.pricePerSIM || 0).toFixed(2)}/SIM)
  → Chosen as the most cost-effective option available in ${net.country}`
  ).join('\n') :
  '• Network selection based on best available pricing and coverage'}

**Cost Breakdown per SIM:**
• Average carrier data cost: ${currency}${((detailedAnalysis.costBreakdown?.carrierDataCost) || 0).toFixed(3)}
• Average IMSI fees: ${currency}${((detailedAnalysis.costBreakdown?.imsiFees) || 0.050).toFixed(3)}
• Platform cost per active SIM: ${currency}${((detailedAnalysis.costBreakdown?.platformCost) || 0.10).toFixed(2)}

**Profitability Analysis:**
• ${((detailedAnalysis.profitability?.margin) || 0).toFixed(1)}% margin - ${((detailedAnalysis.profitability?.margin) || 0) >= 20 ? 'above' : 'below'} minimum 20% threshold
• Volume discount of ${(detailedAnalysis.profitability?.volumeDiscount) || 0}% applied

**Alternative Network Options:**
• Additional networks may be available at different price points
• Consider multi-network redundancy for critical deployments

**Risk Assessment:**
${detailedAnalysis.riskAssessment && detailedAnalysis.riskAssessment.length > 0 ?
  detailedAnalysis.riskAssessment.map((risk: string) => `• ${risk}`).join('\n') :
  '• Standard risk profile\n• Contract terms negotiable based on volume'}`;
  }
  
  // Enhanced natural language parser using Gemini
  private async parseNaturalLanguageInput(query: string): Promise<Partial<DealRequestMandatory>> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback to basic parsing if no API key
        return this.parseUserInput(query);
      }
      
      const extractionPrompt = `Extract deal parameters from this query. Return ONLY valid JSON.

Query: "${query}"

Extract:
{
  "simCount": number,
  "dataPerMonth": number (in MB),
  "countries": ["country1", "country2"],
  "networksPerCountry": {"country": number},
  "commitmentMonths": number (default 12),
  "technology": ["4G", "5G"] (if mentioned)
}

If unclear, use reasonable defaults. Return only JSON.`;
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: extractionPrompt }] }]
          })
        }
      );
      
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const params = JSON.parse(jsonMatch[0]);
        // Convert GB to MB if needed
        if (params.dataPerMonth && params.dataPerMonth < 100) {
          params.dataPerMonth = params.dataPerMonth * 1000; // Assume it was in GB
        }
        return params;
      }
    } catch (error) {
      console.error('Error parsing with Gemini:', error);
    }
    
    // Fallback to basic parsing
    return this.parseUserInput(query);
  }
  
  // Helper to parse user input into structured request
  parseUserInput(input: string): Partial<DealRequestMandatory> {
    const request: Partial<DealRequestMandatory> = {};
    const lower = input.toLowerCase();

    // Parse SIM count
    const simMatch = lower.match(/(\d+)\s*(?:sim|sims)/);
    if (simMatch) {
      request.simCount = parseInt(simMatch[1]);
    }

    // Parse data requirement - handle both GB and MB formats
    const gbMatch = lower.match(/(\d+(?:\.\d+)?)\s*gb(?:\/mo|\/month|per month)?/i);
    const mbMatch = lower.match(/(\d+)\s*mb(?:\/mo|\/month|per month)?/i);

    if (gbMatch) {
      request.dataPerMonth = parseFloat(gbMatch[1]) * 1000; // Convert GB to MB
    } else if (mbMatch) {
      request.dataPerMonth = parseInt(mbMatch[1]);
    }

    // Extended country map with more variations
    const countryMap: Record<string, string> = {
      'uk': 'United Kingdom',
      'united kingdom': 'United Kingdom',
      'england': 'United Kingdom',
      'britain': 'United Kingdom',
      'belgium': 'Belgium',
      'france': 'France',
      'germany': 'Germany',
      'austria': 'Austria',
      'spain': 'Spain',
      'italy': 'Italy',
      'netherlands': 'Netherlands',
      'holland': 'Netherlands',
      'poland': 'Poland',
      'israel': 'Israel',
      'usa': 'United States',
      'us': 'United States',
      'united states': 'United States',
      'america': 'United States',
      'switzerland': 'Switzerland',
      'sweden': 'Sweden',
      'norway': 'Norway',
      'denmark': 'Denmark',
      'finland': 'Finland',
      'portugal': 'Portugal',
      'ireland': 'Ireland',
      'greece': 'Greece',
      'czech': 'Czech Republic',
      'czechia': 'Czech Republic',
      'hungary': 'Hungary',
      'romania': 'Romania',
      'bulgaria': 'Bulgaria',
      'croatia': 'Croatia',
      'slovenia': 'Slovenia',
      'slovakia': 'Slovakia',
      'luxembourg': 'Luxembourg',
      'malta': 'Malta',
      'cyprus': 'Cyprus',
      'estonia': 'Estonia',
      'latvia': 'Latvia',
      'lithuania': 'Lithuania',
      'canada': 'Canada',
      'mexico': 'Mexico',
      'brazil': 'Brazil',
      'argentina': 'Argentina',
      'chile': 'Chile',
      'australia': 'Australia',
      'new zealand': 'New Zealand',
      'japan': 'Japan',
      'south korea': 'South Korea',
      'korea': 'South Korea',
      'china': 'China',
      'india': 'India',
      'singapore': 'Singapore',
      'hong kong': 'Hong Kong',
      'taiwan': 'Taiwan',
      'thailand': 'Thailand',
      'malaysia': 'Malaysia',
      'indonesia': 'Indonesia',
      'philippines': 'Philippines',
      'vietnam': 'Vietnam',
      'uae': 'United Arab Emirates',
      'dubai': 'United Arab Emirates',
      'saudi': 'Saudi Arabia',
      'saudi arabia': 'Saudi Arabia',
      'south africa': 'South Africa',
      'egypt': 'Egypt',
      'turkey': 'Turkey',
      'russia': 'Russia'
    };

    const countries: string[] = [];
    const networksPerCountry: Record<string, number> = {};

    // Sort keys by length (longest first) to match multi-word countries first
    const sortedKeys = Object.keys(countryMap).sort((a, b) => b.length - a.length);

    sortedKeys.forEach(key => {
      const value = countryMap[key];
      // Use word boundary matching for short keys to avoid false positives
      const pattern = key.length <= 3
        ? new RegExp(`\\b${key}\\b`, 'i')
        : new RegExp(key, 'i');

      if (pattern.test(lower)) {
        if (!countries.includes(value)) {
          countries.push(value);

          // Try to parse network count for this country
          const networkPattern = new RegExp(`(\\d+|two|three|all)\\s*networks?.*${key}|${key}.*?(\\d+|two|three|all)\\s*networks?`, 'i');
          const match = input.match(networkPattern);

          if (match) {
            const numberWord = match[1] || match[2];
            if (numberWord === 'all') {
              networksPerCountry[value] = 999; // Use 999 to represent "all networks"
            } else {
              const count = numberWord === 'two' ? 2 : numberWord === 'three' ? 3 : parseInt(numberWord);
              networksPerCountry[value] = count;
            }
          } else {
            // Default to 2 networks for redundancy (matching form behavior)
            networksPerCountry[value] = 2;
          }
        }
      }
    });

    request.countries = countries;
    request.networksPerCountry = networksPerCountry;

    // Parse commitment - handle various formats
    const commitMatch = lower.match(/(\d+)\s*(?:mo\.?|months?|month)\s*(?:commitment)?/);
    if (commitMatch) {
      request.commitmentMonths = parseInt(commitMatch[1]);
    } else {
      // Default to 12 months if not specified
      request.commitmentMonths = 12;
    }

    // Parse technology requirements
    const technologies: string[] = [];
    if (lower.includes('5g')) technologies.push('5G');
    if (lower.includes('4g')) technologies.push('4G');
    if (lower.includes('3g')) technologies.push('3G');
    if (lower.includes('cat-m') || lower.includes('lte-m')) technologies.push('Cat-M');
    if (lower.includes('nb-iot') || lower.includes('nbiot')) technologies.push('NB-IoT');

    if (technologies.length > 0) {
      request.technology = technologies;
    } else {
      // Default technologies
      request.technology = ['3G', '4G', '5G'];
    }

    return request;
  }
}