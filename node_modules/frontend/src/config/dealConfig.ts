// Deal evaluation configuration and cost structure
export const dealConfig = {
  // Platform costs (Monogoto's costs)
  platformCosts: {
    // Fixed monthly cost per active SIM (not profit, but our cost)
    activeSIMCost: 0.10, // €0.10 per active SIM per month
    
    // Operational costs (additional platform overhead)
    supportCost: 0.00, // Included in activeSIMCost
    infrastructureCost: 0.00, // Included in activeSIMCost
    
    // Payment processing (percentage of revenue)
    paymentProcessingRate: 0.029, // 2.9% typical credit card fee
  },
  
  // Target margins (on total deal)
  margins: {
    minimum: 0.20, // 20% minimum profit margin
    target: 0.35, // 35% target profit margin
    optimal: 0.50, // 50% optimal profit margin
  },
  
  // Connectivity markup (applied to carrier costs only)
  connectivityMarkup: 0.50, // 50% markup on connectivity costs
  
  // Volume discounts (for customer pricing)
  volumeTiers: [
    { minQty: 1, maxQty: 999, discount: 0 },
    { minQty: 1000, maxQty: 4999, discount: 0.05 }, // 5% discount
    { minQty: 5000, maxQty: 9999, discount: 0.10 }, // 10% discount
    { minQty: 10000, maxQty: 49999, discount: 0.15 }, // 15% discount
    { minQty: 50000, maxQty: null, discount: 0.20 }, // 20% discount
  ],
  
  // Risk factors
  riskFactors: {
    newCustomer: 1.1, // 10% risk premium for new customers
    highDataUsage: 1.15, // 15% premium for high data usage patterns
    multiCountry: 1.05, // 5% premium for multi-country deals
  },
  
  // Data overage handling
  overage: {
    markupPercentage: 0.50, // 50% markup on overage charges
    bufferPercentage: 0.10, // 10% buffer for unexpected usage
  }
};

// Deal evaluation types
export interface DealRequest {
  // Basic deal info
  simQuantity: number;
  countries: string[];
  usagePercentages?: Record<string, number>; // e.g., { "United Kingdom": 80, "Netherlands": 20 }
  carriers: string[]; // Specific carriers requested
  monthlyDataPerSim: number; // in GB
  monthlySmsPerSim?: number;
  duration: number; // contract duration in months
  
  // Customer pricing
  proposedPricePerSim: number; // What customer wants to pay
  currency: 'USD' | 'EUR';
  
  // Deal characteristics
  isNewCustomer: boolean;
  expectedUsagePattern: 'low' | 'medium' | 'high';
  requiresIoT: boolean;
  iotType?: 'CAT-M' | 'NB-IoT' | 'both';
}

export interface DealEvaluation {
  // Costs breakdown
  carrierDataCost: number;
  carrierImsiCost: number;
  carrierSmsCost: number;
  platformFees: number;
  totalCostPerSim: number;
  totalMonthlyCost: number;
  
  // Revenue
  revenuePerSim: number;
  totalMonthlyRevenue: number;
  
  // Profitability
  grossProfitPerSim: number;
  totalMonthlyProfit: number;
  profitMargin: number;
  
  // Recommendations
  verdict: 'approved' | 'negotiable' | 'rejected';
  recommendedPrice?: number;
  riskScore: number; // 0-100
  notes: string[];
  
  // Carrier breakdown
  carrierOptions: CarrierOption[];
}

export interface CarrierOption {
  carrier: string;
  network: string;
  country: string;
  dataRate: number;
  imsiCost: number;
  smsRate: number;
  hasRequestedCarrier: boolean;
  operator?: string; // A1, Telefonica, Tele2, etc.
  requestedCarrierName?: string; // The specific carrier that was requested
  iotSupport?: {
    catM: boolean;
    nbIot: boolean;
  };
  totalCostPerSim: number;
}