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
  currency: 'USD' | 'EUR' | 'GBP';
  
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

// Deal status for audit system
export type DealStatus = 'draft' | 'evaluated' | 'finalized' | 'archived';

// Saved deal interface for persistence
export interface SavedDeal {
  id: string;
  user_id: string;
  user_email: string;
  deal_name?: string;
  status: DealStatus;
  deal_request: DealRequest;
  basic_evaluation?: DealEvaluation;
  enhanced_analysis?: any;
  comprehensive_analysis?: any;
  sim_quantity: number;
  countries: string[];
  monthly_data_per_sim?: number;
  proposed_price_per_sim?: number;
  currency: string;
  duration_months?: number;
  verdict?: 'approved' | 'negotiable' | 'rejected';
  profit_margin?: number;
  risk_score?: number;
  total_contract_value?: number;
  created_at: string;
  updated_at: string;
  evaluated_at?: string;
  finalized_at?: string;
}

// Filters for querying deals (admin audit)
export interface DealFilters {
  userId?: string;
  userEmail?: string;
  status?: DealStatus;
  verdict?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

// Helper to format deal ID for display
export const formatDealId = (uuid: string): string => {
  return `DEAL-${uuid.slice(0, 8).toUpperCase()}`;
};