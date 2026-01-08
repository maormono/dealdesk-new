import { supabase } from '../lib/supabase';
import { dealConfig } from '../config/dealConfig';
import type { DealRequest, DealEvaluation, CarrierOption } from '../config/dealConfig';

// Threshold for expensive networks - networks with data cost > $1/MB are excluded from pricing
// These networks are blocked in roaming policy and customers won't use them
const EXPENSIVE_NETWORK_THRESHOLD = 1.0; // $1.00 per MB

export class DealEvaluationService {
  async evaluateDeal(request: DealRequest): Promise<DealEvaluation> {
    console.log('Evaluating deal:', request);
    
    // Fetch carrier pricing for requested countries and carriers
    const carrierOptions = await this.fetchCarrierPricing(request);
    console.log('Found carrier options:', carrierOptions);
    
    // Calculate the best carrier combination
    const selectedCarriers = this.selectOptimalCarriers(carrierOptions, request);
    
    // Calculate connectivity costs (carrier costs)
    const carrierDataCost = this.calculateDataCost(selectedCarriers, request.monthlyDataPerSim, request);
    const carrierImsiCost = this.calculateImsiCost(selectedCarriers);
    const carrierSmsCost = this.calculateSmsCost(selectedCarriers, request.monthlySmsPerSim || 0);
    
    // Total connectivity cost (before markup)
    const connectivityCost = carrierDataCost + carrierImsiCost + carrierSmsCost;

    // Apply markup to connectivity costs (50% markup = 1.5x)
    const markedUpConnectivityCost = connectivityCost * (1 + dealConfig.connectivityMarkup);

    // Add platform cost (fixed cost per active SIM)
    const platformFees = this.calculatePlatformFees(request);

    // Total costs (marked up connectivity + platform cost) - for internal pricing reference
    const totalCostPerSim = markedUpConnectivityCost + platformFees;
    const totalMonthlyCost = totalCostPerSim * request.simQuantity;

    // Raw costs (what Monogoto actually pays) - for true profitability calculation
    const rawCostPerSim = connectivityCost + platformFees;
    const rawMonthlyCost = rawCostPerSim * request.simQuantity;

    // Revenue calculation (apply volume discounts)
    const discount = this.getVolumeDiscount(request.simQuantity);
    const revenuePerSim = request.proposedPricePerSim * (1 - discount);
    const totalMonthlyRevenue = revenuePerSim * request.simQuantity;

    // Profitability - based on RAW costs (what we actually pay carriers)
    const grossProfitPerSim = revenuePerSim - rawCostPerSim;
    const totalMonthlyProfit = totalMonthlyRevenue - rawMonthlyCost;
    const profitMargin = totalMonthlyRevenue > 0 ? totalMonthlyProfit / totalMonthlyRevenue : 0;

    // DEBUG: Log profitability calculation details
    console.log('========== PROFITABILITY CALCULATION DEBUG ==========');
    console.log('Carrier Costs (raw):');
    console.log(`  - Data cost: $${carrierDataCost.toFixed(6)}`);
    console.log(`  - IMSI cost: $${carrierImsiCost.toFixed(6)}`);
    console.log(`  - SMS cost: $${carrierSmsCost.toFixed(6)}`);
    console.log(`  - Total connectivity (raw): $${connectivityCost.toFixed(6)}`);
    console.log(`  - Connectivity with 50% markup: $${markedUpConnectivityCost.toFixed(6)}`);
    console.log('');
    console.log('Platform Fees:');
    console.log(`  - Platform fee per SIM: $${platformFees.toFixed(6)}`);
    console.log('');
    console.log('Cost per SIM:');
    console.log(`  - Raw cost per SIM (connectivity + platform): $${rawCostPerSim.toFixed(6)}`);
    console.log(`  - Marked up cost per SIM: $${totalCostPerSim.toFixed(6)}`);
    console.log('');
    console.log('Revenue:');
    console.log(`  - Proposed price per SIM: $${request.proposedPricePerSim.toFixed(6)}`);
    console.log(`  - Volume discount: ${(discount * 100).toFixed(1)}%`);
    console.log(`  - Revenue per SIM (after discount): $${revenuePerSim.toFixed(6)}`);
    console.log(`  - Total monthly revenue (${request.simQuantity} SIMs): $${totalMonthlyRevenue.toFixed(2)}`);
    console.log('');
    console.log('Profitability:');
    console.log(`  - Gross profit per SIM: $${grossProfitPerSim.toFixed(6)}`);
    console.log(`  - Total monthly profit: $${totalMonthlyProfit.toFixed(2)}`);
    console.log(`  - Raw monthly cost: $${rawMonthlyCost.toFixed(2)}`);
    console.log(`  - Profit margin: ${(profitMargin * 100).toFixed(2)}%`);
    console.log('');
    console.log('Formula: profitMargin = totalMonthlyProfit / totalMonthlyRevenue');
    console.log(`         = ${totalMonthlyProfit.toFixed(2)} / ${totalMonthlyRevenue.toFixed(2)} = ${(profitMargin * 100).toFixed(2)}%`);
    console.log('======================================================');
    
    // Risk assessment
    const riskScore = this.calculateRiskScore(request, profitMargin);
    
    // Determine verdict
    let verdict: 'approved' | 'negotiable' | 'rejected';
    if (profitMargin >= dealConfig.margins.target) {
      verdict = 'approved';
    } else if (profitMargin >= dealConfig.margins.minimum) {
      verdict = 'negotiable';
    } else {
      verdict = 'rejected';
    }
    
    // Calculate recommended price if not profitable
    let recommendedPrice;
    if (verdict !== 'approved') {
      // Recommended price should cover marked up connectivity cost + platform cost + margin
      recommendedPrice = this.calculateRecommendedPrice(
        connectivityCost, 
        platformFees, 
        dealConfig.margins.minimum
      );
    }
    
    // Generate notes
    const notes = this.generateNotes(request, profitMargin, selectedCarriers);
    
    return {
      carrierDataCost,
      carrierImsiCost,
      carrierSmsCost,
      platformFees,
      totalCostPerSim,
      totalMonthlyCost,
      revenuePerSim,
      totalMonthlyRevenue,
      grossProfitPerSim,
      totalMonthlyProfit,
      profitMargin,
      verdict,
      recommendedPrice,
      riskScore,
      notes,
      carrierOptions: selectedCarriers
    };
  }
  
  private async fetchCarrierPricing(request: DealRequest): Promise<CarrierOption[]> {
    const options: CarrierOption[] = [];
    
    for (const country of request.countries) {
      // Country is already "United States" in database, no mapping needed
      const dbCountry = country;
      
      // Fetch networks for this country from network_pricing table
      const { data: networks, error } = await supabase
        .from('network_pricing')
        .select('*')
        .eq('country', dbCountry);

      if (error) {
        console.error('Error fetching networks:', error);
        continue;
      }

      // Process each network
      networks?.forEach((pricing: any) => {
        const network = {
          network_name: pricing.network_name,
          country: pricing.country,
          tadig: pricing.tadig
        };
        const operator = pricing.identity || 'Unknown';
          
          // Check if this matches requested carriers (if any)
          let matchesRequestedCarrier = false;
          let requestedCarrierName = '';
          
          if (request.carriers.length > 0) {
            for (const requestedCarrier of request.carriers) {
              // More specific carrier matching
              if (requestedCarrier.toLowerCase() === 'at&t' || requestedCarrier.toLowerCase() === 'att') {
                if (network.network_name.toLowerCase().includes('at&t') || 
                    network.network_name.toLowerCase().includes('at & t') ||
                    network.network_name.toLowerCase().includes('att')) {
                  matchesRequestedCarrier = true;
                  requestedCarrierName = 'AT&T';
                }
              } else if (requestedCarrier.toLowerCase() === 't-mobile' || requestedCarrier.toLowerCase() === 'tmobile') {
                if (network.network_name.toLowerCase().includes('t-mobile') || 
                    network.network_name.toLowerCase().includes('tmobile') ||
                    network.network_name.toLowerCase().includes('t - mobile')) {
                  matchesRequestedCarrier = true;
                  requestedCarrierName = 'T-Mobile';
                }
              } else if (network.network_name.toLowerCase().includes(requestedCarrier.toLowerCase())) {
                matchesRequestedCarrier = true;
                requestedCarrierName = requestedCarrier;
              }
            }
          } else {
            matchesRequestedCarrier = true; // Accept all if no specific carriers requested
          }
          
          const hasRequestedCarrier = matchesRequestedCarrier;
          
          // Skip if IoT is required but not supported
          if (request.requiresIoT) {
            const hasIoT = (request.iotType === 'CAT-M' && pricing.lte_m) ||
                          (request.iotType === 'NB-IoT' && pricing.nb_iot) ||
                          (request.iotType === 'both' && (pricing.lte_m || pricing.nb_iot));
            if (!hasIoT) return;
          }
          
          // Skip entries with invalid pricing data (null or 0 data rates are not valid)
          if (!pricing.data_per_mb || pricing.data_per_mb <= 0) {
            console.log(`Skipping invalid pricing: ${network.network_name} via ${operator} - data_per_mb: ${pricing.data_per_mb}`);
            return;
          }

          // Skip expensive networks (>$1/MB) - these are blocked in roaming policy
          if (pricing.data_per_mb > EXPENSIVE_NETWORK_THRESHOLD) {
            console.log(`Skipping expensive network: ${network.network_name} via ${operator} - $${pricing.data_per_mb}/MB exceeds threshold of $${EXPENSIVE_NETWORK_THRESHOLD}/MB`);
            return;
          }

          // Calculate total cost for this option
          const dataRate = pricing.data_per_mb;
          const imsiCost = pricing.imsi_cost || 0;
          const smsRate = pricing.sms_cost || 0;
          
          const totalCostPerSim = (dataRate * request.monthlyDataPerSim * 1024) + imsiCost + 
                                  (smsRate * (request.monthlySmsPerSim || 0));
          
          options.push({
            carrier: network.network_name,
            network: network.tadig,
            country: network.country,
            dataRate,
            imsiCost,
            smsRate,
            hasRequestedCarrier,
            operator, // Add operator info
            requestedCarrierName, // Add specific carrier matched
            iotSupport: {
              catM: pricing.lte_m || false,
              nbIot: pricing.nb_iot || false
            },
            totalCostPerSim
          });
      });
    }
    
    return options;
  }
  
  private selectOptimalCarriers(options: CarrierOption[], request: DealRequest): CarrierOption[] {
    const selected: CarrierOption[] = [];
    
    // Filter out any invalid options that might have slipped through
    const validOptions = options.filter(opt => opt.dataRate > 0);
    
    // Group options by country
    const byCountry = new Map<string, CarrierOption[]>();
    validOptions.forEach(opt => {
      const country = opt.country;
      if (!byCountry.has(country)) {
        byCountry.set(country, []);
      }
      byCountry.get(country)!.push(opt);
    });
    
    // For each country, select the best carriers
    byCountry.forEach((countryOptions, country) => {
      // If specific carriers are requested, try to find them
      if (request.carriers.length > 0) {
        const requestedFound: CarrierOption[] = [];
        
        // First, try to find all requested carriers
        for (const requestedCarrier of request.carriers) {
          const matchingOptions = countryOptions.filter(opt => 
            opt.hasRequestedCarrier && 
            opt.requestedCarrierName?.toLowerCase() === requestedCarrier.toLowerCase()
          );
          
          if (matchingOptions.length > 0) {
            // Get the cheapest option for this carrier
            const cheapest = matchingOptions.sort((a, b) => a.totalCostPerSim - b.totalCostPerSim)[0];
            requestedFound.push(cheapest);
          }
        }
        
        if (requestedFound.length > 0) {
          // Use the requested carriers that were found
          selected.push(...requestedFound);
        } else {
          // No requested carriers found, use the cheapest alternative
          const cheapest = countryOptions.sort((a, b) => a.totalCostPerSim - b.totalCostPerSim)[0];
          if (cheapest) selected.push(cheapest);
        }
      } else {
        // No specific carriers requested, just get the cheapest
        const cheapest = countryOptions.sort((a, b) => a.totalCostPerSim - b.totalCostPerSim)[0];
        if (cheapest) selected.push(cheapest);
      }
    });
    
    console.log('Selected carriers:', selected.map(c => ({
      carrier: c.carrier,
      operator: c.operator,
      cost: c.totalCostPerSim,
      requested: c.hasRequestedCarrier
    })));
    
    return selected;
  }
  
  private calculateDataCost(carriers: CarrierOption[], dataGB: number, request?: DealRequest): number {
    if (carriers.length === 0) return 0;

    const dataMB = dataGB * 1024; // Convert GB to MB

    // If usage percentages are specified, calculate weighted average
    if (request?.usagePercentages && Object.keys(request.usagePercentages).length > 0) {
      let weightedCost = 0;
      let totalPercentage = 0;

      console.log('DEBUG Data Cost - Using weighted percentages:', request.usagePercentages);

      Object.entries(request.usagePercentages).forEach(([country, percentage]) => {
        const countryCarriers = carriers.filter(c => c.country === country);
        if (countryCarriers.length > 0) {
          // Use the cheapest carrier rate in that country
          const minRate = Math.min(...countryCarriers.map(c => c.dataRate));
          const countryCost = minRate * dataMB * (percentage / 100);
          weightedCost += countryCost;
          totalPercentage += percentage;
          console.log(`  ${country}: ${percentage}% @ $${minRate.toFixed(6)}/MB = $${countryCost.toFixed(6)}`);
        }
      });

      // If percentages don't add up to 100%, use average for remaining
      if (totalPercentage < 100) {
        const remainingPercentage = (100 - totalPercentage) / 100;
        const avgRate = carriers.reduce((sum, c) => sum + c.dataRate, 0) / carriers.length;
        weightedCost += avgRate * dataMB * remainingPercentage;
        console.log(`  Remaining ${100 - totalPercentage}%: avg rate $${avgRate.toFixed(6)}/MB`);
      }

      console.log(`  Total weighted data cost: $${weightedCost.toFixed(6)}`);
      return weightedCost;
    }

    // Default: average data cost across selected carriers
    const totalDataCost = carriers.reduce((sum, carrier) => {
      return sum + (carrier.dataRate * dataMB);
    }, 0);

    const avgCost = totalDataCost / carriers.length;
    console.log(`DEBUG Data Cost - Average across ${carriers.length} carriers: $${avgCost.toFixed(6)}`);

    return avgCost;
  }
  
  private calculateImsiCost(carriers: CarrierOption[]): number {
    if (carriers.length === 0) return 0;

    // Average IMSI cost across selected carriers
    const totalImsiCost = carriers.reduce((sum, carrier) => {
      return sum + carrier.imsiCost;
    }, 0);

    const avgImsiCost = totalImsiCost / carriers.length;
    console.log(`DEBUG IMSI Cost - Carriers: ${carriers.map(c => `${c.carrier}=$${c.imsiCost}`).join(', ')} → avg: $${avgImsiCost.toFixed(6)}`);

    return avgImsiCost;
  }
  
  private calculateSmsCost(carriers: CarrierOption[], smsCount: number): number {
    if (carriers.length === 0 || smsCount === 0) return 0;
    
    // Average SMS cost across selected carriers
    const totalSmsCost = carriers.reduce((sum, carrier) => {
      return sum + (carrier.smsRate * smsCount);
    }, 0);
    
    return totalSmsCost / carriers.length;
  }
  
  private calculatePlatformFees(request: DealRequest): number {
    // Platform cost is a fixed cost per active SIM - keep it simple
    // Risk factors should affect risk score, not actual cost calculation
    const { activeSIMCost } = dealConfig.platformCosts;

    // Return the base platform cost without adjustments
    // This gives accurate profitability calculations
    return activeSIMCost;
  }
  
  private getVolumeDiscount(quantity: number): number {
    const tier = dealConfig.volumeTiers.find(t => 
      quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty)
    );
    
    return tier?.discount || 0;
  }
  
  private calculateRiskScore(request: DealRequest, profitMargin: number): number {
    let score = 50; // Base score
    
    // Adjust based on profit margin
    if (profitMargin >= dealConfig.margins.optimal) {
      score -= 20;
    } else if (profitMargin >= dealConfig.margins.target) {
      score -= 10;
    } else if (profitMargin < dealConfig.margins.minimum) {
      score += 20;
    }
    
    // Adjust based on customer type
    if (request.isNewCustomer) {
      score += 15;
    }
    
    // Adjust based on usage pattern
    if (request.expectedUsagePattern === 'high') {
      score += 10;
    }
    
    // Adjust based on contract duration
    if (request.duration < 12) {
      score += 10;
    } else if (request.duration >= 24) {
      score -= 10;
    }
    
    // Multi-country deals are riskier
    if (request.countries.length > 2) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  private calculateRecommendedPrice(connectivityCost: number, platformCost: number, targetMargin: number): number {
    // Apply markup to connectivity cost only
    const markedUpConnectivity = connectivityCost * (1 + dealConfig.connectivityMarkup);
    // Add platform cost
    const totalCost = markedUpConnectivity + platformCost;
    // Price = Cost / (1 - Margin)
    return totalCost / (1 - targetMargin);
  }
  
  private generateNotes(request: DealRequest, profitMargin: number, carriers: CarrierOption[]): string[] {
    const notes: string[] = [];
    
    // Start with deal overview
    notes.push(`**Deal Overview:** ${request.simQuantity} SIMs requiring ${request.monthlyDataPerSim}GB/month across ${request.countries.length} countries`);
    
    // Network selection reasoning
    notes.push('**Network Selection Reasoning:**');
    
    // Group by country for analysis
    const byCountry = new Map<string, CarrierOption[]>();
    carriers.forEach(c => {
      if (!byCountry.has(c.country)) {
        byCountry.set(c.country, []);
      }
      byCountry.get(c.country)!.push(c);
    });
    
    // Analyze each country
    byCountry.forEach((countryCarriers, country) => {
      const selected = countryCarriers[0]; // Assuming first is selected
      if (selected) {
        const pricePerGB = (selected.dataRate * 1024).toFixed(2);
        const monthlyDataCost = (selected.dataRate * request.monthlyDataPerSim * 1024).toFixed(3);
        notes.push(`• **${country}**: Selected ${selected.carrier} via ${selected.operator} at €${pricePerGB}/GB (€${monthlyDataCost}/SIM for ${request.monthlyDataPerSim}GB)`);
        
        // Explain why this was chosen
        if (request.carriers.length > 0 && selected.hasRequestedCarrier) {
          notes.push(`  → Chosen because it matches your requested carrier requirement`);
        } else {
          notes.push(`  → Chosen as the most cost-effective option available in ${country}`);
        }
      }
    });
    
    notes.push(''); // Add spacing
    
    // Cost breakdown
    notes.push('**Cost Breakdown per SIM:**');
    const avgDataCost = carriers.reduce((sum, c) => sum + (c.dataRate * request.monthlyDataPerSim * 1024), 0) / carriers.length;
    const avgImsiCost = carriers.reduce((sum, c) => sum + c.imsiCost, 0) / carriers.length;
    notes.push(`• Average carrier data cost: €${avgDataCost.toFixed(3)}`);
    if (avgImsiCost > 0) {
      notes.push(`• Average IMSI fees: €${avgImsiCost.toFixed(3)}`);
    }
    notes.push(`• Platform cost per active SIM: €${dealConfig.platformCosts.activeSIMCost.toFixed(2)}`);
    
    notes.push(''); // Add spacing
    
    // Margin analysis
    notes.push('**Profitability Analysis:**');
    if (profitMargin >= dealConfig.margins.optimal) {
      notes.push(`• Excellent ${(profitMargin * 100).toFixed(1)}% margin - well above our ${(dealConfig.margins.optimal * 100)}% optimal target`);
    } else if (profitMargin >= dealConfig.margins.target) {
      notes.push(`• Good ${(profitMargin * 100).toFixed(1)}% margin - meets our ${(dealConfig.margins.target * 100)}% target`);
    } else if (profitMargin >= dealConfig.margins.minimum) {
      notes.push(`• Acceptable ${(profitMargin * 100).toFixed(1)}% margin - above minimum ${(dealConfig.margins.minimum * 100)}% threshold`);
    } else {
      notes.push(`• Poor ${(profitMargin * 100).toFixed(1)}% margin - below minimum ${(dealConfig.margins.minimum * 100)}% requirement`);
    }
    
    // Volume discount
    const discount = this.getVolumeDiscount(request.simQuantity);
    if (discount > 0) {
      notes.push(`• Volume discount of ${(discount * 100).toFixed(0)}% applied for ${request.simQuantity} SIMs`);
    }
    
    notes.push(''); // Add spacing
    
    // Alternative options analysis
    if (carriers.length > 0) {
      notes.push('**Alternative Network Options:**');
      const byCountryAlts = new Map<string, CarrierOption[]>();
      
      // This would need the full list of options, not just selected
      // For now, mention that alternatives exist
      notes.push('• Additional networks may be available at different price points');
      notes.push('• Consider multi-network redundancy for critical deployments');
    }
    
    notes.push(''); // Add spacing
    
    // Risk Assessment
    notes.push('**Risk Assessment:**');
    
    if (request.isNewCustomer) {
      notes.push('• New customer - additional onboarding and credit checks required');
    } else {
      notes.push('• Existing customer - streamlined onboarding process');
    }
    
    if (request.countries.length > 2) {
      notes.push(`• Multi-country deployment (${request.countries.length} countries) - increased complexity but good coverage`);
    }
    
    if (request.expectedUsagePattern === 'high') {
      notes.push('• High usage pattern - monitor for potential overages');
    }
    
    if (request.duration < 12) {
      notes.push(`• Short contract (${request.duration} months) - consider minimum commitment requirements`);
    } else if (request.duration >= 24) {
      notes.push(`• Long contract (${request.duration} months) - stable revenue stream`);
    }
    
    // IoT support detailed analysis
    if (request.requiresIoT) {
      notes.push(''); // Add spacing
      notes.push('**IoT Technology Support:**');
      
      const iotCarriers = carriers.filter(c => {
        if (request.iotType === 'CAT-M') return c.iotSupport?.catM;
        if (request.iotType === 'NB-IoT') return c.iotSupport?.nbIot;
        if (request.iotType === 'both') return c.iotSupport?.catM || c.iotSupport?.nbIot;
        return false;
      });
      
      if (iotCarriers.length > 0) {
        notes.push(`• ${iotCarriers.length} networks support ${request.iotType} technology`);
        iotCarriers.forEach(c => {
          const techs = [];
          if (c.iotSupport?.catM) techs.push('CAT-M/LTE-M');
          if (c.iotSupport?.nbIot) techs.push('NB-IoT');
          notes.push(`  → ${c.carrier} in ${c.country} supports: ${techs.join(', ')}`);
        });
      } else {
        notes.push(`• ⚠️ No networks found with ${request.iotType} support in selected countries`);
        notes.push('• Consider expanding to additional operators or regions');
      }
    }
    
    return notes;
  }
}