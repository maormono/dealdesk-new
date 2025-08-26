# Product Requirements Document (PRD)
# DealDesk - Operator Pricing Analysis Platform

**Version:** 2.0  
**Date:** February 2025  
**Status:** Final Draft  
**Author:** Product Team  
**Company:** Monogoto

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [Functional Requirements](#4-functional-requirements)
5. [User Stories](#5-user-stories)
6. [Advanced Features](#6-advanced-features)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [API Specifications](#8-api-specifications)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Testing Strategy](#10-testing-strategy)
11. [Success Metrics](#11-success-metrics)
12. [Risks and Mitigation](#12-risks-and-mitigation)
13. [Appendix](#13-appendix)

---

## 1. Executive Summary

### 1.1 Product Overview
DealDesk is an internal tool designed for Monogoto's sales team to analyze operator costs and determine deal profitability. The platform will ingest pricing data from multiple operators (A1, Telefonica, Tele2), normalize it into a standardized database, and provide AI-powered recommendations on deal viability with advanced risk analysis using game theory models.

### 1.2 Business Objectives
- **Primary Goal**: Enable data-driven decision making for sales deals by analyzing operator costs
- **Key Outcomes**: 
  - Reduce time to quote from hours to minutes
  - Prevent unprofitable deals through automated risk analysis
  - Optimize margin across all deals using volume discounts
  - Standardize pricing analysis across the sales team
  - Predict competitive responses using game theory

### 1.3 Success Metrics
- Deal analysis time reduction by 80%
- Margin improvement of 15% across all deals
- 100% adoption by sales team within Q2 2025
- Zero unprofitable deals approved through the system
- Risk prediction accuracy >85%

### 1.4 Stakeholders
- **Primary Users**: Sales Representatives, Sales Managers
- **Secondary Users**: Operations Team, Finance Team, Executive Leadership
- **Technical Team**: Development, DevOps, Data Science

---

## 2. Problem Statement

### 2.1 Current Challenges
- **Manual Analysis**: Sales team manually compares pricing across multiple Excel files with different formats
- **Format Inconsistency**: Each operator (A1, Telefonica, Tele2) provides pricing in different structures
- **Hidden Costs**: IMSI fees and other charges are buried in remarks columns
- **Error-Prone**: Manual calculations lead to pricing errors and missed costs
- **Time-Consuming**: Each deal requires hours of cross-referencing and calculation
- **No Risk Assessment**: Deals approved without considering market dynamics or customer risk
- **Missing Volume Discounts**: Unable to leverage volume for better pricing

### 2.2 Impact
- Lost deals due to slow response times
- Unprofitable deals due to missed costs or risks
- Inconsistent pricing strategies across the sales team
- Inability to quickly respond to competitive situations
- Missed opportunities for volume-based negotiations

### 2.3 Opportunity
By automating pricing analysis and adding intelligent risk assessment, Monogoto can:
- Increase win rate by 25%
- Improve margins by 15-20%
- Reduce sales cycle time by 40%
- Enable proactive competitive positioning

---

## 3. Solution Architecture

### 3.1 Technology Stack
- **Frontend**: 
  - Netlify (Static hosting, serverless functions)
  - React 18+ with TypeScript
  - Tailwind CSS for styling
  - Recharts/D3.js for visualizations
  
- **Backend**: 
  - Supabase (PostgreSQL database, authentication, real-time subscriptions)
  - Node.js serverless functions
  - Python microservices for ML models
  
- **AI/ML**: 
  - OpenAI API or Claude API for intelligent analysis
  - Scikit-learn for risk prediction models
  - TensorFlow for advanced pattern recognition
  
- **Data Processing**: 
  - xlsx, csv-parser libraries
  - Pandas for data manipulation
  - Apache Kafka for event streaming (future)

### 3.2 System Components

#### 3.2.1 Data Ingestion Layer
- Excel/CSV file upload interface
- Operator format detection using pattern matching
- Data validation and error handling
- Batch processing capabilities
- Automatic deduplication

#### 3.2.2 Data Normalization Engine
- Format-specific parsers for each operator
- TADIG code standardization
- Currency conversion using real-time rates
- Unit normalization (MB/GB/TB pricing)
- Technology capability mapping

#### 3.2.3 Database Schema

```sql
-- Core Tables

-- Operators
CREATE TABLE operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    reliability_score DECIMAL(3,2) DEFAULT 0.95,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Networks
CREATE TABLE networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(100) NOT NULL,
    operator_name VARCHAR(200) NOT NULL,
    tadig VARCHAR(10) UNIQUE NOT NULL, -- Primary identifier
    mcc_mnc VARCHAR(10),
    network_name VARCHAR(200),
    region VARCHAR(100),
    timezone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_tadig (tadig),
    INDEX idx_country (country)
);

-- Pricing Records
CREATE TABLE pricing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID REFERENCES operators(id),
    network_id UUID REFERENCES networks(id),
    price_per_mb DECIMAL(10, 6) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    imsi_fee_monthly DECIMAL(10, 2) DEFAULT 0,
    increment_kb INTEGER DEFAULT 1,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    
    -- Network capabilities
    gsm BOOLEAN DEFAULT false,
    gprs_2g BOOLEAN DEFAULT false,
    umts_3g BOOLEAN DEFAULT false,
    lte_4g BOOLEAN DEFAULT false,
    nsa_5g BOOLEAN DEFAULT false,
    lte_m BOOLEAN DEFAULT false,
    lte_m_psm BOOLEAN DEFAULT false,
    lte_m_edrx BOOLEAN DEFAULT false,
    nb_iot BOOLEAN DEFAULT false,
    nb_iot_psm BOOLEAN DEFAULT false,
    nb_iot_edrx BOOLEAN DEFAULT false,
    
    -- Voice pricing (if available)
    voice_moc_local DECIMAL(10, 4),
    voice_moc_international DECIMAL(10, 4),
    voice_mtc DECIMAL(10, 4),
    voice_setup_charge DECIMAL(10, 4),
    voice_increment_seconds INTEGER DEFAULT 60,
    
    -- SMS pricing
    sms_mo DECIMAL(10, 4),
    sms_mt DECIMAL(10, 4),
    
    -- Restrictions and remarks
    restrictions TEXT,
    remarks TEXT,
    roaming_allowed BOOLEAN DEFAULT true,
    
    -- Metadata
    source_file VARCHAR(500),
    imported_at TIMESTAMP DEFAULT NOW(),
    imported_by UUID,
    is_active BOOLEAN DEFAULT true,
    
    INDEX idx_operator_network (operator_id, network_id),
    INDEX idx_effective_date (effective_date),
    INDEX idx_technologies (lte_m, nb_iot)
);

-- Volume Discount Tiers
CREATE TABLE volume_discount_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID REFERENCES operators(id),
    network_id UUID REFERENCES networks(id),
    tier_name VARCHAR(50),
    min_volume_mb BIGINT NOT NULL,
    max_volume_mb BIGINT,
    min_sim_count INTEGER,
    discount_type VARCHAR(20), -- 'PERCENTAGE' or 'FIXED_RATE'
    discount_value DECIMAL(10, 4),
    commitment_months INTEGER DEFAULT 12,
    requires_exclusivity BOOLEAN DEFAULT false,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_volume_thresholds (min_volume_mb, min_sim_count)
);

-- Deals Analysis
CREATE TABLE deal_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(200),
    customer_id UUID,
    
    -- Deal parameters
    sim_count INTEGER NOT NULL,
    price_per_sim DECIMAL(10, 4),
    data_cap_mb DECIMAL(12, 2),
    expected_monthly_usage_mb DECIMAL(12, 2),
    target_countries JSON,
    target_networks JSON,
    technology_requirements JSON,
    contract_duration_months INTEGER,
    
    -- Cost Analysis
    avg_operator_cost_per_mb DECIMAL(10, 6),
    max_operator_cost_per_mb DECIMAL(10, 6),
    min_operator_cost_per_mb DECIMAL(10, 6),
    total_monthly_imsi_fees DECIMAL(10, 2),
    total_monthly_cost DECIMAL(12, 2),
    
    -- Revenue & Profitability
    monthly_revenue DECIMAL(12, 2),
    gross_margin_percentage DECIMAL(5, 2),
    gross_margin_amount DECIMAL(12, 2),
    is_profitable BOOLEAN,
    margin_category VARCHAR(20), -- 'HIGH', 'MEDIUM', 'LOW', 'NEGATIVE'
    
    -- Risk Analysis
    risk_score DECIMAL(5, 2), -- 0-100
    risk_level VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    operator_risk DECIMAL(3, 2),
    market_risk DECIMAL(3, 2),
    customer_risk DECIMAL(3, 2),
    operational_risk DECIMAL(3, 2),
    
    -- Game Theory Analysis
    nash_equilibrium_price DECIMAL(10, 6),
    competitor_response_probability JSON,
    optimal_strategy TEXT,
    
    -- Monte Carlo Results
    monte_carlo_iterations INTEGER,
    expected_value DECIMAL(12, 2),
    value_at_risk_95 DECIMAL(12, 2),
    probability_of_loss DECIMAL(5, 4),
    best_case_scenario DECIMAL(12, 2),
    worst_case_scenario DECIMAL(12, 2),
    
    -- AI Recommendations
    ai_recommendation TEXT,
    ai_confidence_score DECIMAL(3, 2),
    suggested_price_per_mb DECIMAL(10, 6),
    suggested_adjustments JSON,
    
    -- Metadata
    analyzed_at TIMESTAMP DEFAULT NOW(),
    analyzed_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, REVIEW
    rejection_reason TEXT,
    
    INDEX idx_deal_status (status),
    INDEX idx_analyzed_at (analyzed_at),
    INDEX idx_customer (customer_id),
    INDEX idx_margin (gross_margin_percentage)
);

-- Risk History
CREATE TABLE risk_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deal_analyses(id),
    risk_type VARCHAR(50),
    risk_value DECIMAL(5, 2),
    factors JSON,
    recorded_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_deal_time (deal_id, recorded_at)
);

-- Import Logs
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID REFERENCES operators(id),
    filename VARCHAR(500),
    file_hash VARCHAR(64),
    file_size_bytes BIGINT,
    rows_processed INTEGER,
    rows_imported INTEGER,
    rows_updated INTEGER,
    rows_failed INTEGER,
    errors JSON,
    warnings JSON,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    imported_by UUID,
    status VARCHAR(50), -- PROCESSING, COMPLETED, FAILED, PARTIAL
    INDEX idx_status_time (status, started_at)
);
```

---

## 4. Functional Requirements

### 4.1 Data Import Module

#### 4.1.1 File Upload
- **Supported Formats**: .xlsx, .xls, .csv
- **Multi-file Upload**: Support batch upload of multiple files
- **Drag & Drop Interface**: Intuitive file upload experience
- **Format Detection**: Automatically identify operator based on file structure
- **File Size Limit**: 50MB per file
- **Progress Tracking**: Real-time upload and processing progress

#### 4.1.2 Parser Requirements

**A1 Parser Specifications**
- Primary sheet: "prices A1 WS"
- Key columns mapping:
  ```javascript
  {
    country: "Country",
    network: "Network", 
    tadig: "TADIG",
    mcc_mnc: "MCC+MNC",
    price_per_mb: "price/MB",
    currency: "currency",
    restrictions: "Restrictions",
    technologies: {
      gsm: "GSM",
      gprs_2g: "2G GPRS",
      umts_3g: "3G UMTS",
      lte_4g: "4G LTE",
      nsa_5g: "5G NSA",
      lte_m: "LTE-M",
      nb_iot: "nb-IoT"
    },
    voice: {
      moc_local: "Voice_MOC local price/min",
      moc_international: "Voice_MOC International price/min",
      mtc: "Voice_MT price/min"
    },
    sms: {
      mo: "SMS_MO",
      mt: "SMS_MT"
    }
  }
  ```

**Telefonica Parser Specifications**
- Key columns mapping:
  ```javascript
  {
    country: "Country",
    operator: "Operator",
    tadig: "Tadig",
    data_price: "Data",
    moc: "MOC",
    mtc: "MTC",
    sms: "SMS",
    technologies: {
      gsm: "GSM",
      "2g": "2G",
      "3g": "3G",
      "4g": "4G",
      "5g": "5G",
      volte: "VoLTE",
      lte_m: "LTE-M",
      nb_iot: "NB-IoT"
    }
  }
  ```

**Tele2 Parser Specifications**
- Similar structure with special attention to:
  - IMSI fees in remarks column
  - Monthly recurring charges
  - Format: "0.15/month" or "€0.15 monthly"

#### 4.1.3 Data Validation Rules
- **TADIG Validation**: 
  - Format: 5-6 uppercase letters
  - Pattern: `^[A-Z]{5,6}$`
  - Uniqueness check
  
- **Price Validation**:
  - Range: 0.0001 - 10.00 per MB
  - Flag anomalies outside 3 standard deviations
  
- **Currency Validation**:
  - ISO 4217 compliance
  - Supported: EUR, USD, GBP, CHF
  
- **Duplicate Handling**:
  - Check: operator_id + network_id + effective_date
  - Action: Update if newer, log if duplicate

### 4.2 Pricing Analysis Module

#### 4.2.1 Quick Pricing Lookup
- Natural language input processing
- Multi-country comparison
- Technology filtering (LTE-M, NB-IoT)
- Real-time cost calculation
- Export to Excel/PDF

#### 4.2.2 Deal Evaluation
- Bulk SIM deal analysis
- Margin calculation with thresholds
- Traffic light system for approval
- Risk-adjusted pricing
- Volume discount application

#### 4.2.3 Calculation Engine

```javascript
class PricingCalculator {
  calculateDealProfitability(params) {
    const {
      simCount,
      pricePerSim,
      dataCapMB,
      countryDistribution,
      technologyRequirements
    } = params;
    
    // Step 1: Calculate Revenue
    const monthlyRevenue = simCount * pricePerSim;
    
    // Step 2: Calculate Costs
    let totalCost = 0;
    const costBreakdown = [];
    
    for (const [country, percentage] of Object.entries(countryDistribution)) {
      const simAllocation = simCount * percentage;
      const dataVolume = simAllocation * dataCapMB;
      
      // Get best operator price
      const operators = this.getOperatorPrices(country, technologyRequirements);
      const bestOperator = this.selectBestOperator(operators);
      
      // Calculate costs
      const dataCost = dataVolume * bestOperator.pricePerMB;
      const imsiCost = simAllocation * bestOperator.imsiFeeMonthly;
      const subtotal = dataCost + imsiCost;
      
      totalCost += subtotal;
      costBreakdown.push({
        country,
        operator: bestOperator.name,
        tadig: bestOperator.tadig,
        simCount: simAllocation,
        dataCost,
        imsiCost,
        total: subtotal
      });
    }
    
    // Step 3: Apply Volume Discounts
    const volumeDiscount = this.calculateVolumeDiscount(totalCost, simCount);
    const discountedCost = totalCost * (1 - volumeDiscount.percentage);
    
    // Step 4: Calculate Margins
    const grossProfit = monthlyRevenue - discountedCost;
    const grossMargin = (grossProfit / monthlyRevenue) * 100;
    
    // Step 5: Determine Status
    const status = this.determineStatus(grossMargin);
    
    return {
      revenue: monthlyRevenue,
      costs: {
        base: totalCost,
        discounted: discountedCost,
        breakdown: costBreakdown
      },
      volumeDiscount,
      profitability: {
        grossProfit,
        grossMargin,
        netMargin: grossMargin - 10 // Operational costs estimate
      },
      status,
      recommendation: this.generateRecommendation(grossMargin, params)
    };
  }
  
  determineStatus(margin) {
    if (margin < 0) return { code: 'REJECTED', color: 'red', icon: '⛔' };
    if (margin < 30) return { code: 'NOT_RECOMMENDED', color: 'orange', icon: '🔴' };
    if (margin < 50) return { code: 'REVIEW_REQUIRED', color: 'yellow', icon: '🟡' };
    return { code: 'APPROVED', color: 'green', icon: '🟢' };
  }
}
```

---

## 5. User Stories

### 5.1 User Story 1: Quick Pricing Analysis

**Title**: Multi-Country Pricing Comparison

**As a** Monogoto sales representative  
**I want to** quickly check operator pricing across multiple countries and technologies  
**So that** I can provide accurate pricing estimates to customers during sales calls

#### Acceptance Criteria

1. **Natural Language Input**
   - Support queries like "100 MB USA Mexico Canada"
   - Understand variations in format and units
   - Auto-complete country names

2. **Technology Filtering**
   - Optional: "100 MB USA LTE-M"
   - Show all technologies by default
   - Clear indicators for IoT technologies

3. **Results Display**
   - Tabular format with sorting
   - Color-coded pricing tiers
   - Total monthly cost calculation
   - Export functionality

4. **Performance**
   - Response time < 2 seconds
   - Support concurrent queries
   - Cache frequent searches

#### Example Interaction

**Input**: "100 MB USA Mexico Canada LTE-M"

**Output**:
```markdown
## Pricing Analysis for 100 MB/month with LTE-M

### 🇺🇸 United States
| Operator | TADIG | LTE-M | Price/MB | IMSI Fee | Total | Status |
|----------|-------|-------|----------|----------|-------|---------|
| AT&T | USAAT | ✅ | $0.0058 | $0.00 | $0.58 | ✅ Best |
| T-Mobile | USATM | ✅ | $0.0062 | $0.15 | $0.77 | ⚠️ IMSI |

### 🇲🇽 Mexico
| Operator | TADIG | LTE-M | Price/MB | IMSI Fee | Total | Status |
|----------|-------|-------|----------|----------|-------|---------|
| Telcel | MEXTC | ✅ | $0.0089 | $0.00 | $0.89 | ✅ Best |

### 🇨🇦 Canada  
| Operator | TADIG | LTE-M | Price/MB | IMSI Fee | Total | Status |
|----------|-------|-------|----------|----------|-------|---------|
| Bell | CANBL | ✅ | $0.0098 | $0.00 | $0.98 | ✅ Best |

💡 Total cost across all countries: $2.45/month
```

### 5.2 User Story 2: Deal Profitability Analysis

**Title**: Bulk SIM Deal Evaluation

**As a** Monogoto sales manager  
**I want to** evaluate the profitability of bulk SIM deals  
**So that** I can quickly approve or reject deals based on margin requirements

#### Acceptance Criteria

1. **Deal Input**
   - Number of SIMs
   - Price per SIM
   - Data cap
   - Target countries
   - Contract duration

2. **Profitability Calculation**
   - Revenue calculation
   - Cost breakdown by country
   - IMSI fees inclusion
   - Volume discount application

3. **Visual Indicators**
   - 🟢 Green: >50% margin (auto-approved)
   - 🟡 Yellow: 30-50% margin (review required)
   - 🔴 Red: <30% margin (not recommended)
   - ⛔ Stop: Negative margin (auto-rejected)

4. **AI Recommendations**
   - Optimal pricing suggestion
   - Risk assessment
   - Alternative scenarios

#### Example Interaction

**Input**:
- 1000 SIMs
- $2/SIM/month  
- 500 MB cap
- USA (60%), Mexico (30%), Canada (10%)

**Output**:
```markdown
# Deal Analysis Report
## Deal ID: DEAL-2025-0847

### ⛔ Status: AUTO-REJECTED

### 💰 Financial Analysis
| Metric | Value |
|--------|-------|
| Monthly Revenue | $2,000 |
| Monthly Cost | $3,565 |
| Gross Margin | -78.25% |
| Status | LOSS |

### 💡 Recommendations
1. Minimum viable price: $5.35/SIM (33% margin)
2. Recommended price: $7.13/SIM (50% margin)
3. Alternative: Reduce data to 140 MB at $2/SIM

### 📊 Scenario Analysis
| Price | Data Cap | Margin | Status |
|-------|----------|--------|---------|
| $2.00 | 500 MB | -78% | ⛔ |
| $5.35 | 500 MB | 33% | 🟡 |
| $7.13 | 500 MB | 50% | 🟢 |
| $2.00 | 140 MB | 50% | 🟢 |
```

---

## 6. Advanced Features

### 6.1 Volume Discount Management

#### 6.1.1 Tier Structure
```javascript
const volumeTiers = {
  bronze: {
    minVolume: 100, // GB
    minSims: 100,
    discount: 10, // percentage
    commitment: 12 // months
  },
  silver: {
    minVolume: 500,
    minSims: 500,
    discount: 20,
    commitment: 12
  },
  gold: {
    minVolume: 1000,
    minSims: 5000,
    discount: 35,
    commitment: 24
  },
  enterprise: {
    minVolume: 5000,
    minSims: 10000,
    discount: 'custom',
    commitment: 36
  }
};
```

#### 6.1.2 Discount Calculator
```javascript
class VolumeDiscountEngine {
  calculateOptimalTier(monthlyVolume, simCount, commitment) {
    const eligibleTiers = this.getEligibleTiers(monthlyVolume, simCount, commitment);
    const recommendations = [];
    
    for (const tier of eligibleTiers) {
      const savings = this.calculateSavings(tier, monthlyVolume);
      recommendations.push({
        tier: tier.name,
        discount: tier.discount,
        monthlySavings: savings.monthly,
        annualSavings: savings.annual,
        requirements: tier.requirements,
        gap: this.calculateGapToNextTier(tier, monthlyVolume, simCount)
      });
    }
    
    return {
      currentTier: this.getCurrentTier(monthlyVolume, simCount),
      recommendations: recommendations.sort((a, b) => b.annualSavings - a.annualSavings),
      optimizationTips: this.generateOptimizationTips(monthlyVolume, simCount)
    };
  }
}
```

### 6.2 Game Theory Risk Analysis

#### 6.2.1 Risk Framework
```javascript
class RiskAnalyzer {
  analyzeRisk(dealParams) {
    const risks = {
      operator: this.analyzeOperatorRisk(dealParams),
      market: this.analyzeMarketRisk(dealParams),
      customer: this.analyzeCustomerRisk(dealParams),
      operational: this.analyzeOperationalRisk(dealParams)
    };
    
    const aggregateRisk = this.aggregateRisks(risks);
    const gameTheory = this.runGameTheoryAnalysis(dealParams);
    const monteCarlo = this.runMonteCarloSimulation(dealParams, 10000);
    
    return {
      overallScore: aggregateRisk.score,
      category: aggregateRisk.category,
      breakdown: risks,
      gameTheory: {
        nashEquilibrium: gameTheory.equilibriumPrice,
        competitorResponse: gameTheory.likelyResponse,
        optimalStrategy: gameTheory.strategy
      },
      simulation: {
        expectedValue: monteCarlo.expectedValue,
        valueAtRisk95: monteCarlo.var95,
        probabilityOfLoss: monteCarlo.lossProb,
        confidenceInterval: monteCarlo.ci95
      },
      recommendation: this.generateRiskRecommendation(aggregateRisk, gameTheory, monteCarlo)
    };
  }
}
```

#### 6.2.2 Nash Equilibrium Pricing
```javascript
class GameTheoryEngine {
  findNashEquilibrium(ourPrice, marketData) {
    const competitors = marketData.competitors;
    let equilibrium = { price: ourPrice, stable: false };
    let iterations = 0;
    
    while (!equilibrium.stable && iterations < 100) {
      const responses = this.calculateBestResponses(equilibrium.price, competitors);
      const newEquilibrium = this.findStablePoint(responses);
      
      if (Math.abs(newEquilibrium.price - equilibrium.price) < 0.001) {
        equilibrium.stable = true;
      }
      
      equilibrium = newEquilibrium;
      iterations++;
    }
    
    return {
      equilibriumPrice: equilibrium.price,
      iterations: iterations,
      competitorPrices: equilibrium.competitorPrices,
      marketShare: this.calculateMarketShare(equilibrium)
    };
  }
}
```

#### 6.2.3 Monte Carlo Simulation
```javascript
class MonteCarloSimulator {
  simulate(dealParams, iterations = 10000) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const scenario = {
        volume: this.sampleNormal(dealParams.expectedVolume, dealParams.volumeStdDev),
        priceChange: this.sampleUniform(-0.1, 0.1),
        operatorReliability: this.sampleBeta(0.95, 0.05),
        competitorAction: this.sampleCategorical(['NONE', 'MATCH', 'UNDERCUT']),
        currencyFluctuation: this.sampleNormal(1.0, 0.05)
      };
      
      const outcome = this.calculateScenarioOutcome(scenario, dealParams);
      results.push(outcome);
    }
    
    return {
      expectedValue: this.mean(results),
      standardDeviation: this.stdDev(results),
      var95: this.percentile(results, 5),
      cvar95: this.conditionalVaR(results, 5),
      probabilityOfLoss: results.filter(r => r < 0).length / iterations,
      bestCase: Math.max(...results),
      worstCase: Math.min(...results),
      histogram: this.createHistogram(results, 20)
    };
  }
}
```

---

## 7. Design System & User Interface

### 7.1 Design Philosophy

#### Core Principles
- **Apple-Inspired Aesthetics**: Clean, minimal, with purposeful use of space
- **Depth and Dimension**: Subtle shadows, glassmorphism, and layered elements
- **Vibrant Gradients**: Dynamic color transitions that feel alive
- **Micro-interactions**: Every click, hover, and transition should feel premium
- **Data Visualization**: Complex data presented in beautiful, intuitive ways

#### Visual Language
```css
/* Design Tokens */
:root {
  /* Primary Gradients */
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-success: linear-gradient(135deg, #23d5ab 0%, #23a455 100%);
  --gradient-danger: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --gradient-warning: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(255, 255, 255, 0.18);
  --backdrop-blur: blur(10px);
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
  --shadow-glow: 0 0 40px rgba(102, 126, 234, 0.3);
  
  /* Spacing */
  --space-unit: 8px;
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  
  /* Typography */
  --font-display: 'SF Pro Display', -apple-system, BlinkMacSystemFont;
  --font-text: 'SF Pro Text', -apple-system, BlinkMacSystemFont;
}
```

### 7.2 Component Library

#### 7.2.1 Navigation & Layout

**Top Navigation Bar**
```jsx
<NavBar>
  {/* Frosted glass effect with subtle gradient */}
  <div className="backdrop-blur-xl bg-white/70 border-b border-white/20">
    <Logo animated={true} />
    <NavItems>
      <NavItem icon={<HomeIcon />} gradient active>Dashboard</NavItem>
      <NavItem icon={<AnalyticsIcon />}>Pricing</NavItem>
      <NavItem icon={<DealIcon />}>Deals</NavItem>
      <NavItem icon={<AIIcon />} pulse>AI Assistant</NavItem>
    </NavItems>
    <UserProfile showStatus avatarGlow />
  </div>
</NavBar>
```

**Sidebar Design**
- Floating panels with glassmorphism
- Icon animations on hover
- Gradient accents for active states
- Smooth transitions between sections

#### 7.2.2 File Upload Experience

**Magical Upload Component**
```jsx
const FileUploadZone = () => {
  return (
    <div className="upload-zone">
      {/* Animated gradient border */}
      <div className="gradient-border-animated">
        <div className="upload-content">
          {/* 3D animated icon */}
          <div className="icon-container">
            <CloudUploadIcon className="animate-float" />
            <div className="particle-effects" />
          </div>
          
          {/* Dynamic text */}
          <h3 className="gradient-text">
            Drop your pricing files here
          </h3>
          <p className="text-subtle">
            Excel, CSV files up to 50MB • Supports A1, Telefonica, Tele2 formats
          </p>
          
          {/* AI Enhancement Badge */}
          <div className="ai-badge pulse">
            <AIIcon /> AI-Powered Format Detection
          </div>
        </div>
      </div>
      
      {/* Progress Visualization */}
      <UploadProgress 
        show={uploading}
        particles={true}
        gradientFill={true}
        successAnimation="confetti"
      />
    </div>
  );
};
```

**Upload States & Animations**
1. **Idle State**: Subtle floating animation with gradient border pulse
2. **Hover State**: Border intensifies, icon scales up, particles activate
3. **Dragging**: Entire zone glows, magnetic pull effect
4. **Processing**: Liquid progress bar with particle effects
5. **Success**: Confetti burst, checkmark morph animation
6. **Error**: Gentle shake, red glow, helpful error message

#### 7.2.3 Cards & Panels

**Pricing Card Design**
```jsx
<PricingCard>
  {/* Glassmorphic container */}
  <div className="glass-card hover:shadow-glow transition-all">
    {/* Country flag with gradient background */}
    <div className="country-header gradient-mesh">
      <FlagIcon country="USA" size="large" />
      <h3>United States</h3>
    </div>
    
    {/* Operator pricing with status indicators */}
    <div className="pricing-grid">
      <OperatorRow>
        <NetworkIcon type="5G" glowing />
        <span>AT&T</span>
        <PriceBadge value="$0.0058" trend="down" />
        <StatusDot color="green" pulse />
      </OperatorRow>
    </div>
    
    {/* Interactive footer */}
    <CardFooter>
      <Button variant="ghost" icon={<AnalyzeIcon />}>
        Quick Analysis
      </Button>
      <Button variant="gradient" icon={<AIIcon />}>
        AI Optimize
      </Button>
    </CardFooter>
  </div>
</PricingCard>
```

#### 7.2.4 Data Visualization

**Interactive Charts**
```jsx
// Margin Analysis Chart
<MarginChart>
  <GradientAreaChart 
    data={marginData}
    gradient={['#667eea', '#764ba2']}
    interactive={true}
    tooltipGlass={true}
    animateOnLoad={true}
  />
  <ChartControls>
    <TimeRangeSelector animated />
    <ViewToggle options={['Daily', 'Weekly', 'Monthly']} />
  </ChartControls>
</MarginChart>

// Risk Heatmap
<RiskHeatmap>
  <HeatmapGrid 
    data={riskData}
    colorScale="viridis"
    cellAnimation="wave"
    interactive={true}
  />
  <RiskLegend gradient animated />
</RiskHeatmap>
```

#### 7.2.5 Form Elements

**Modern Input Fields**
```jsx
<InputGroup>
  <FloatingLabel>Deal Value</FloatingLabel>
  <Input 
    type="currency"
    icon={<DollarIcon />}
    focusGlow={true}
    validation="realtime"
  />
  <HelperText animated>
    AI suggestion: $7.13 for optimal margin
  </HelperText>
</InputGroup>

// Toggle Switches with Labels
<Switch 
  gradient={true}
  size="large"
  label="Enable AI Optimization"
  sublabel="Let AI automatically adjust pricing"
/>

// Multi-select with Tags
<MultiSelect
  options={countries}
  chips={true}
  searchable={true}
  aiSuggestions={true}
  placeholder="Select target countries..."
/>
```

### 7.3 AI Features Integration

#### 7.3.1 AI-Powered Excel Parser

**Smart Parser Interface**
```jsx
const AIParserPanel = () => {
  return (
    <div className="ai-parser-panel">
      {/* AI Status Indicator */}
      <div className="ai-status-bar">
        <div className="ai-avatar-animated">
          <AIBrain animated={true} thinking={parsing} />
        </div>
        <div className="status-text">
          {parsing ? 'AI is analyzing your file...' : 'AI Parser Ready'}
        </div>
      </div>
      
      {/* File Analysis Results */}
      <div className="analysis-results glass-panel">
        <h4>AI Detection Results</h4>
        <div className="detection-grid">
          <DetectionItem 
            confidence={0.95}
            format="A1"
            icon={<CheckCircle />}
            status="success"
          />
          <DetectionItem 
            confidence={0.62}
            format="Custom"
            icon={<AlertCircle />}
            status="warning"
          />
        </div>
        
        {/* AI Enhancement Options */}
        <div className="ai-actions">
          <Button variant="ai-gradient" size="large">
            <AIIcon spinning={processing} />
            AI Enhanced Parse
          </Button>
          <Button variant="outline">
            Manual Mapping
          </Button>
        </div>
      </div>
      
      {/* Column Mapping Suggestions */}
      {showMapping && (
        <ColumnMappingUI 
          suggestions={aiSuggestions}
          confidence={confidenceScores}
          animated={true}
        />
      )}
    </div>
  );
};
```

**AI Parser Features**
1. **Intelligent Column Detection**: Uses NLP to identify column purposes
2. **Format Learning**: Learns from corrections to improve future parsing
3. **Anomaly Detection**: Identifies unusual patterns or potential errors
4. **Auto-correction**: Suggests fixes for common formatting issues
5. **Confidence Scoring**: Shows reliability of AI decisions

#### 7.3.2 AI Deal Assistant

**Conversational AI Interface**
```jsx
const AIDealAssistant = () => {
  return (
    <div className="ai-assistant-panel">
      {/* Floating AI Avatar */}
      <div className="ai-avatar-container">
        <AIAvatar 
          mood="helpful"
          animated={true}
          particleEffect={true}
        />
      </div>
      
      {/* Chat Interface */}
      <div className="chat-interface glass-morphism">
        <ChatHistory 
          messages={conversation}
          typingIndicator={aiTyping}
          glassBubbles={true}
        />
        
        {/* Smart Input */}
        <div className="ai-input-container">
          <AutocompleteInput 
            placeholder="Ask about deal profitability..."
            suggestions={aiSuggestions}
            voiceInput={true}
          />
          <Button variant="ai-send" pulse={true}>
            <SendIcon />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <QuickActions>
          <ActionChip onClick={() => askAI('analyze current deal')}>
            📊 Analyze This Deal
          </ActionChip>
          <ActionChip onClick={() => askAI('optimize pricing')}>
            💰 Optimize Pricing
          </ActionChip>
          <ActionChip onClick={() => askAI('risk assessment')}>
            ⚠️ Assess Risks
          </ActionChip>
        </QuickActions>
      </div>
    </div>
  );
};
```

**AI Assistant Capabilities**
```javascript
const AIAssistantFeatures = {
  dealAnalysis: {
    naturalLanguage: true,
    examples: [
      "Is this deal profitable?",
      "What margin should I aim for?",
      "Compare this to similar deals"
    ],
    visualResponse: true, // Shows charts and graphs
    confidence: true // Shows AI confidence in recommendations
  },
  
  pricingOptimization: {
    realTime: true,
    scenarios: true, // What-if analysis
    competitiveIntelligence: true,
    explanation: true // Explains reasoning
  },
  
  approvalWorkflow: {
    autoApproval: true, // For high-confidence, profitable deals
    riskFlags: true, // Highlights concerns
    suggestions: true, // Improvement recommendations
    escalation: true // Routes to appropriate approver
  }
};
```

### 7.4 Page Layouts

#### 7.4.1 Dashboard Design

```jsx
const Dashboard = () => {
  return (
    <div className="dashboard-container">
      {/* Hero Metrics Section */}
      <section className="metrics-hero">
        <MetricCard 
          gradient="purple-pink"
          icon={<TrendingUpIcon />}
          value="$2.4M"
          label="Monthly Revenue"
          trend="+15%"
          sparkline={true}
        />
        <MetricCard 
          gradient="blue-teal"
          icon={<MarginIcon />}
          value="42%"
          label="Average Margin"
          trend="+5%"
          progressRing={true}
        />
        <MetricCard 
          gradient="orange-red"
          icon={<DealIcon />}
          value="156"
          label="Active Deals"
          trend="+23"
          animated={true}
        />
      </section>
      
      {/* AI Insights Panel */}
      <section className="ai-insights glass-panel">
        <h2 className="gradient-text">AI Insights</h2>
        <InsightCard 
          type="opportunity"
          message="3 deals could increase margin by 15% with volume discounts"
          action="View Deals"
          pulse={true}
        />
        <InsightCard 
          type="risk"
          message="Competitor pricing dropped 10% in Mexico region"
          action="Adjust Strategy"
          urgent={true}
        />
      </section>
      
      {/* Interactive Deal Pipeline */}
      <section className="deal-pipeline">
        <PipelineView 
          stages={['Analysis', 'Review', 'Approved', 'Active']}
          deals={deals}
          draggable={true}
          animations="smooth"
        />
      </section>
    </div>
  );
};
```

#### 7.4.2 Deal Analysis Page

```jsx
const DealAnalysisPage = () => {
  return (
    <div className="deal-analysis-layout">
      {/* Floating AI Assistant */}
      <AIAssistantFloat 
        position="bottom-right"
        expandable={true}
        glowEffect={true}
      />
      
      {/* Main Analysis Panel */}
      <div className="analysis-panel">
        {/* Deal Input Form */}
        <section className="deal-input-section glass-card">
          <h2>Deal Parameters</h2>
          <DealForm 
            autoSave={true}
            validation="realtime"
            aiSuggestions={true}
          />
        </section>
        
        {/* Live Profitability Gauge */}
        <section className="profitability-gauge">
          <CircularGauge 
            value={marginPercentage}
            gradient={true}
            animated={true}
            thresholds={{
              danger: 0,
              warning: 30,
              success: 50
            }}
          />
          <StatusMessage 
            type={marginStatus}
            animated={true}
          />
        </section>
        
        {/* Risk Analysis Visualization */}
        <section className="risk-visualization">
          <RiskRadar 
            data={riskFactors}
            interactive={true}
            tooltips="glass"
          />
          <MonteCarloChart 
            simulations={10000}
            animated={true}
            gradient={true}
          />
        </section>
      </div>
      
      {/* Action Bar */}
      <ActionBar floating={true}>
        <Button variant="ai-primary" size="large">
          <AIIcon /> Ask AI for Approval
        </Button>
        <Button variant="success" disabled={!profitable}>
          Approve Deal
        </Button>
        <Button variant="ghost">
          Save Draft
        </Button>
      </ActionBar>
    </div>
  );
};
```

### 7.5 Animations & Interactions

#### 7.5.1 Micro-interactions
```css
/* Hover Effects */
.card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--shadow-glow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Click Ripple Effect */
.button::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%);
  animation: ripple 0.6s ease-out;
}

/* Loading States */
.skeleton {
  background: linear-gradient(90deg, 
    rgba(255,255,255,0) 0%, 
    rgba(255,255,255,0.2) 50%, 
    rgba(255,255,255,0) 100%);
  animation: shimmer 2s infinite;
}

/* Success Animation */
@keyframes success-burst {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```

#### 7.5.2 Page Transitions
```javascript
const pageTransitions = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: { type: "spring", stiffness: 300 }
  },
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.05, opacity: 0 },
    transition: { duration: 0.2 }
  }
};
```

### 7.6 Responsive Behavior (Desktop-First)

```css
/* Desktop (Primary) */
.container {
  max-width: 1440px;
  padding: 32px;
}

/* Large Desktop (4K) */
@media (min-width: 2560px) {
  .container {
    max-width: 2000px;
    padding: 48px;
  }
  
  .card {
    padding: 32px;
  }
}

/* Tablet (Future) */
@media (max-width: 1024px) {
  /* Placeholder for future responsive design */
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
  }
}
```

### 7.7 Accessibility & Performance

#### 7.7.1 Accessibility Features
- High contrast mode support
- Keyboard navigation for all interactions
- Screen reader optimized
- Focus indicators with gradient glow
- ARIA labels and live regions
- Reduced motion options

#### 7.7.2 Performance Optimizations
- Lazy loading for heavy components
- Virtual scrolling for large lists
- Image optimization with WebP
- Code splitting by route
- CSS containment for complex layouts
- Web Workers for heavy calculations

### 7.8 Design System Documentation

#### Component States
```javascript
const componentStates = {
  default: 'Base state with subtle shadows',
  hover: 'Elevated with glow effect',
  active: 'Pressed state with scale',
  focus: 'Gradient border with glow',
  disabled: 'Reduced opacity, no interactions',
  loading: 'Skeleton or spinner with animation',
  error: 'Red glow with shake animation',
  success: 'Green glow with check animation'
};
```

#### Color Psychology
- **Purple Gradients**: Innovation, premium, AI-powered
- **Blue Gradients**: Trust, stability, data
- **Green Gradients**: Success, profit, positive
- **Orange/Red Gradients**: Urgency, attention, risk
- **Glass Effects**: Transparency, modernity, depth

## 8. Non-Functional Requirements

### 7.1 Performance
- **File Upload**: < 10 seconds for 10MB file
- **Deal Analysis**: < 3 seconds response time
- **Risk Calculation**: < 5 seconds including Monte Carlo
- **Dashboard Load**: < 2 seconds
- **Concurrent Users**: Support 100+ simultaneous users
- **API Response**: < 500ms for simple queries
- **Database Queries**: < 100ms for indexed searches

### 7.2 Security
- **Authentication**: Multi-factor authentication required
- **Authorization**: Role-based access control (RBAC)
  - Admin: Full system access
  - Sales Manager: Approve/reject deals, view all deals
  - Sales Rep: Create/view own deals
  - Operations: Import pricing, view reports
- **Encryption**: AES-256 for data at rest, TLS 1.3 for transit
- **Audit Logging**: All actions logged with timestamp and user
- **Data Privacy**: GDPR compliant, PII encryption
- **API Security**: Rate limiting, API key authentication
- **File Validation**: Virus scanning, format validation

### 7.3 Scalability
- **Horizontal Scaling**: Microservices architecture
- **Database**: Support 1M+ pricing records
- **File Processing**: Queue-based for large files
- **Caching**: Redis for frequent queries
- **CDN**: Global distribution for static assets
- **Load Balancing**: Auto-scaling based on CPU/memory

### 7.4 Reliability
- **Uptime**: 99.9% SLA
- **Backup**: Every 6 hours, 30-day retention
- **Disaster Recovery**: RTO < 4 hours, RPO < 1 hour
- **Error Handling**: Graceful degradation
- **Monitoring**: Real-time alerts for failures
- **Redundancy**: Multi-region deployment

### 7.5 Usability
- **Response Time**: User-perceived < 1 second
- **Mobile Responsive**: Full functionality on tablets
- **Accessibility**: WCAG 2.1 AA compliance
- **Browser Support**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Internationalization**: Support for multiple currencies and languages

---

## 8. API Specifications

### 8.1 RESTful Endpoints

#### Pricing Endpoints
```typescript
// Import pricing data
POST /api/pricing/import
Headers: 
  Content-Type: multipart/form-data
  Authorization: Bearer {token}
Body: 
  file: File
  operator: string
Response: {
  importId: string,
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
  recordsProcessed: number,
  recordsImported: number,
  errors: Array<{row: number, error: string}>
}

// Query pricing
GET /api/pricing/search
Query Parameters:
  usage_mb: number
  countries: string[] // comma-separated
  technologies?: string[] // LTE-M, NB-IoT
  operator?: string
Response: {
  results: Array<{
    country: string,
    operator: string,
    tadig: string,
    pricePerMB: number,
    imsiFee: number,
    totalMonthlyCost: number,
    technologies: object
  }>,
  summary: {
    bestOption: object,
    averageCost: number,
    recommendations: string[]
  }
}
```

#### Deal Analysis Endpoints
```typescript
// Analyze deal
POST /api/deals/analyze
Body: {
  simCount: number,
  pricePerSim: number,
  dataCapMB: number,
  countryDistribution: object, // {USA: 0.6, Mexico: 0.3}
  technologyRequirements?: string[],
  contractMonths: number,
  includeRiskAnalysis?: boolean,
  runMonteCarlo?: boolean
}
Response: {
  dealId: string,
  status: 'APPROVED' | 'REVIEW' | 'REJECTED',
  profitability: {
    revenue: number,
    cost: number,
    grossMargin: number,
    netMargin: number
  },
  risk?: {
    score: number,
    category: string,
    factors: object
  },
  simulation?: {
    expectedValue: number,
    valueAtRisk: number,
    probabilityOfLoss: number
  },
  recommendations: string[]
}

// Get deal history
GET /api/deals
Query Parameters:
  status?: string
  customerId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
Response: {
  deals: Array<Deal>,
  total: number,
  hasMore: boolean
}
```

#### Volume Discount Endpoints
```typescript
// Calculate volume discount
POST /api/discounts/calculate
Body: {
  operatorId: string,
  monthlyVolumeGB: number,
  simCount: number,
  commitmentMonths: number
}
Response: {
  currentTier: object,
  applicableDiscount: number,
  nextTier: object,
  savingsAnalysis: object
}
```

#### Risk Analysis Endpoints
```typescript
// Run risk analysis
POST /api/risk/analyze
Body: {
  dealId: string,
  includeGameTheory?: boolean,
  monteCarloIterations?: number
}
Response: {
  riskScore: number,
  riskCategory: string,
  breakdown: object,
  gameTheory?: object,
  simulation?: object,
  recommendations: string[]
}
```

### 8.2 WebSocket Events

```javascript
// Real-time notifications
ws.on('connect', () => {
  ws.emit('subscribe', { channels: ['imports', 'deals', 'pricing'] });
});

// Import progress
ws.on('import:progress', (data) => {
  // { importId, progress: 0-100, currentRow, totalRows }
});

// Deal updates
ws.on('deal:updated', (data) => {
  // { dealId, status, updatedBy, timestamp }
});

// Price changes
ws.on('pricing:changed', (data) => {
  // { operator, networks: [], oldPrice, newPrice }
});
```

### 8.3 GraphQL Schema (Future)

```graphql
type Query {
  pricing(filter: PricingFilter!): PricingResult!
  deal(id: ID!): Deal
  deals(filter: DealFilter, pagination: Pagination): DealConnection!
  riskAnalysis(dealId: ID!): RiskAnalysis!
}

type Mutation {
  importPricing(file: Upload!, operator: String!): ImportResult!
  analyzeDeal(input: DealInput!): DealAnalysis!
  approveDeal(id: ID!, comment: String): Deal!
  rejectDeal(id: ID!, reason: String!): Deal!
}

type Subscription {
  importProgress(importId: ID!): ImportProgress!
  dealUpdates(customerId: ID): Deal!
}
```

---

## 9. Implementation Roadmap

### Phase 1: MVP (Weeks 1-4)
**Goal**: Basic functionality for pricing analysis

- [ ] Database schema setup in Supabase
- [ ] File upload interface
- [ ] Parser for A1 format
- [ ] Parser for Telefonica format
- [ ] Parser for Tele2 format
- [ ] Basic pricing search API
- [ ] Simple web interface
- [ ] TADIG validation

**Deliverables**: 
- Working prototype with file import
- Basic pricing lookup functionality

### Phase 2: Core Features (Weeks 5-8)
**Goal**: Deal analysis and profitability calculation

- [ ] Deal analysis engine
- [ ] Margin calculation
- [ ] Traffic light approval system
- [ ] User authentication
- [ ] Role-based access
- [ ] Export functionality (PDF/Excel)
- [ ] Dashboard creation
- [ ] Email notifications

**Deliverables**:
- Full deal evaluation workflow
- User management system

### Phase 3: AI Integration (Weeks 9-12)
**Goal**: Intelligent recommendations

- [ ] OpenAI/Claude API integration
- [ ] Recommendation engine
- [ ] Pricing optimization
- [ ] Natural language query processing
- [ ] Historical analysis
- [ ] Trend detection
- [ ] Automated alerts

**Deliverables**:
- AI-powered pricing suggestions
- Smart deal recommendations

### Phase 4: Advanced Analytics (Weeks 13-16)
**Goal**: Reporting and insights

- [ ] Advanced reporting module
- [ ] Custom report builder
- [ ] Data visualization
- [ ] Performance metrics
- [ ] API documentation
- [ ] Integration guides
- [ ] Mobile responsive design

**Deliverables**:
- Complete analytics dashboard
- API for external integrations

### Phase 5: Volume & Risk (Weeks 17-20)
**Goal**: Advanced pricing intelligence

- [ ] Volume discount engine
- [ ] Tier management
- [ ] Risk scoring framework
- [ ] Bayesian risk calculator
- [ ] Basic game theory models
- [ ] Monte Carlo simulation
- [ ] Risk dashboard

**Deliverables**:
- Volume discount automation
- Risk-adjusted pricing

### Phase 6: Game Theory (Weeks 21-24)
**Goal**: Competitive intelligence

- [ ] Nash Equilibrium calculator
- [ ] Competitor response prediction
- [ ] Market share modeling
- [ ] Strategic recommendations
- [ ] ML model training
- [ ] Anomaly detection
- [ ] Performance optimization

**Deliverables**:
- Full game theory analysis
- Production-ready system

---

## 10. Testing Strategy

### 10.1 Unit Testing
- **Coverage Target**: 80%
- **Framework**: Jest for JavaScript, Pytest for Python
- **Focus Areas**:
  - Parser accuracy for each operator
  - Calculation precision
  - Data validation rules
  - API endpoint logic

### 10.2 Integration Testing
- **End-to-end workflows**:
  - File upload → Parse → Store → Query
  - Deal creation → Analysis → Approval
- **API testing**: Postman collections
- **Database integrity**: Transaction testing
- **External services**: Mock AI responses

### 10.3 Performance Testing
- **Load Testing**: JMeter
  - 100 concurrent users
  - 1000 deals per hour
  - 10GB file processing
- **Stress Testing**: Identify breaking points
- **Optimization**: Query optimization, caching

### 10.4 User Acceptance Testing
- **Participants**: 5 sales reps, 2 managers, 2 operations
- **Duration**: 2 weeks
- **Scenarios**:
  - Real deal evaluation
  - Historical data import
  - Report generation
  - Mobile usage

### 10.5 Security Testing
- **Penetration Testing**: External vendor
- **Vulnerability Scanning**: OWASP Top 10
- **Data Privacy**: GDPR compliance check
- **Access Control**: Role permission verification

---

## 11. Success Metrics

### 11.1 Business Metrics
- **Deal Velocity**: 40% reduction in time-to-quote
- **Margin Improvement**: 15% increase in average deal margin
- **Win Rate**: 25% improvement in competitive deals
- **Cost Savings**: $500K annual savings from automation

### 11.2 Operational Metrics
- **Adoption Rate**: 100% of sales team within 30 days
- **Data Accuracy**: 99.5% pricing accuracy
- **System Uptime**: 99.9% availability
- **User Satisfaction**: NPS score > 40

### 11.3 Technical Metrics
- **Response Time**: p95 < 3 seconds
- **Error Rate**: < 0.1% of requests
- **Data Freshness**: Pricing updates within 1 hour
- **API Usage**: 10,000+ calls per day

### 11.4 Risk Metrics
- **Risk Prediction Accuracy**: > 85%
- **False Positive Rate**: < 10%
- **Monte Carlo Convergence**: < 10,000 iterations
- **Game Theory Accuracy**: > 70% competitor prediction

---

## 12. Risks and Mitigation

### 12.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|---------|------------|
| Operator format changes | High | High | Versioned parsers, change detection |
| Data quality issues | Medium | High | Validation rules, anomaly detection |
| Performance degradation | Medium | Medium | Caching, query optimization |
| Integration failures | Low | High | Circuit breakers, fallback options |

### 12.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|---------|------------|
| User adoption resistance | Medium | High | Training program, phased rollout |
| Incorrect pricing decisions | Low | Critical | Manual override, audit trails |
| Competitor access | Low | High | Security measures, access controls |
| Regulatory changes | Low | Medium | Flexible rule engine |

### 12.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|---------|------------|
| Data loss | Low | Critical | Backup strategy, disaster recovery |
| Knowledge transfer | Medium | Medium | Documentation, training materials |
| Vendor dependency | Medium | Medium | Multi-vendor strategy |
| Scaling issues | Low | Medium | Cloud architecture, auto-scaling |

---

## 13. Appendix

### 13.1 Glossary

- **TADIG**: Transferred Account Data Interchange Group code - unique network identifier
- **IMSI**: International Mobile Subscriber Identity - SIM card identifier
- **MCC**: Mobile Country Code
- **MNC**: Mobile Network Code
- **LTE-M**: LTE for Machines - IoT connectivity technology
- **NB-IoT**: Narrowband IoT - Low-power wide-area network technology
- **Nash Equilibrium**: Game theory concept where no player benefits from changing strategy
- **VaR**: Value at Risk - Risk measure for potential loss
- **PSM**: Power Saving Mode - IoT device power optimization
- **eDRX**: Extended Discontinuous Reception - Power saving feature

### 13.2 Sample Data Formats

#### A1 Format
```csv
Country,Network,TADIG,price/MB,currency,IMSI Fee,LTE-M,NB-IoT
USA,AT&T,USAAT,0.0058,EUR,0,yes,no
USA,T-Mobile,USATM,0.0062,EUR,0.15,yes,yes
```

#### Telefonica Format
```csv
Country,Operator,Tadig,Data,LTE-M,NB-IoT
USA,AT&T,USAAT,0.0134,Live,Unavailable
USA,T-Mobile,USATM,0.0142,Live,Live
```

#### Tele2 Format
```csv
Country,Operator,TADIG,Price/MB,Remarks
USA,AT&T,USAAT,0.0075,-
USA,T-Mobile,USATM,0.0082,IMSI fee 0.15/month
```

### 13.3 Technology Requirements

#### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "recharts": "^2.5.0",
  "react-query": "^3.39.0",
  "axios": "^1.4.0",
  "react-hook-form": "^7.43.0",
  "xlsx": "^0.18.5"
}
```

#### Backend Dependencies
```json
{
  "@supabase/supabase-js": "^2.21.0",
  "express": "^4.18.0",
  "multer": "^1.4.5",
  "xlsx": "^0.18.5",
  "csv-parser": "^3.0.0",
  "openai": "^3.2.0",
  "joi": "^17.9.0",
  "winston": "^3.8.0"
}
```

#### Python Dependencies (ML Services)
```python
pandas==2.0.0
numpy==1.24.0
scikit-learn==1.2.0
scipy==1.10.0
fastapi==0.95.0
uvicorn==0.21.0
joblib==1.2.0
```

### 13.4 Database Indexes

```sql
-- Performance optimization indexes
CREATE INDEX idx_pricing_search ON pricing_records(network_id, operator_id, effective_date DESC);
CREATE INDEX idx_pricing_technology ON pricing_records(lte_m, nb_iot) WHERE is_active = true;
CREATE INDEX idx_deals_customer ON deal_analyses(customer_id, analyzed_at DESC);
CREATE INDEX idx_deals_margin ON deal_analyses(gross_margin_percentage) WHERE status = 'PENDING';
CREATE INDEX idx_volume_lookup ON volume_discount_tiers(operator_id, min_volume_mb, min_sim_count);
CREATE INDEX idx_risk_history ON risk_history(deal_id, recorded_at DESC);
```

### 13.5 Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Application
NODE_ENV=production
PORT=3000
API_RATE_LIMIT=100
SESSION_SECRET=your-secret-key

# File Storage
MAX_FILE_SIZE=52428800
UPLOAD_DIR=/var/uploads

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG...
```

### 13.6 Deployment Configuration

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
      
  worker:
    build: .
    command: npm run worker
    depends_on:
      - redis
      
  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
```

### 13.7 Monitoring and Alerts

```javascript
// Alert Configurations
const alerts = {
  highErrorRate: {
    threshold: 0.05, // 5% error rate
    window: '5m',
    action: 'page'
  },
  lowMarginDeal: {
    threshold: 0.20, // 20% margin
    action: 'email'
  },
  largeFileImport: {
    threshold: 100, // MB
    action: 'log'
  },
  suspiciousPricing: {
    threshold: 3, // standard deviations
    action: 'block'
  }
};
```

### 13.8 Support and Contacts

- **Product Owner**: product@monogoto.com
- **Technical Support**: techsupport@monogoto.com
- **24/7 Operations**: ops@monogoto.com
- **Documentation**: https://dealdesk.docs.monogoto.com
- **API Status**: https://status.dealdesk.monogoto.com

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-15 | Product Team | Initial draft |
| 1.1 | 2025-01-20 | Product Team | Added user stories |
| 2.0 | 2025-02-01 | Product Team | Added advanced features (volume discounts, risk analysis) |

**Next Review Date**: 2025-03-01  
**Document Owner**: Product Management  
**Distribution**: Sales, Operations, Development, Executive Team

---

*End of Document*