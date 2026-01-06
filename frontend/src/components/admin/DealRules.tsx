import React, { useState, useEffect } from 'react';
import { Save, Info, AlertCircle, DollarSign, Percent, Package, Settings, Calculator } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DealRules {
  costPerActiveSim: number; // in cents (official: 10 cents cost per active SIM)
  minProfitMargin: number; // minimum acceptable profit margin percentage
  connectivityMarkup: number; // official markup percentage on connectivity cost only (50%)
  packageUnusedAllowance: number; // percentage of package expected to be unused (30%)
  minDealSize: number; // minimum SIMs for a deal
  maxRiskScore: number; // maximum acceptable risk score (1-10)
  defaultUsageDistribution: boolean; // enable automatic usage distribution for multi-country
  payAsYouGoPriority: boolean; // prioritize pay-as-you-go over package pricing
  maxDiscountStandard: number; // max discount for standard deals (25%)
  maxDiscountEnterprise: number; // max discount for enterprise deals (40%)
  autoCarrierOptimization: boolean; // automatically select best carrier per country
  geminiModel: string; // AI model to use (gemini-2.5-flash)
}

// Process Flow Diagram Component
const ProcessFlowDiagram: React.FC = () => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Analysis Flow</h3>
    <div className="flex items-center justify-between">
      {/* Input */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-xs mt-2 font-medium">Input</p>
        <p className="text-xs text-gray-500">SIMs, Countries</p>
      </div>
      
      {/* Arrow */}
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      
      {/* Database */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <p className="text-xs mt-2 font-medium">Supabase</p>
        <p className="text-xs text-gray-500">Network Prices</p>
      </div>
      
      {/* Arrow */}
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      
      {/* AI */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-xs mt-2 font-medium">Gemini AI</p>
        <p className="text-xs text-gray-500">Optimization</p>
      </div>
      
      {/* Arrow */}
      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      
      {/* Output */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs mt-2 font-medium">Output</p>
        <p className="text-xs text-gray-500">Pricing & Discount</p>
      </div>
    </div>
  </div>
);

export const DealRules: React.FC = () => {
  const [rules, setRules] = useState<DealRules>({
    costPerActiveSim: 10, // 10 cents cost per active SIM
    minProfitMargin: 20, // 20% minimum profit margin
    connectivityMarkup: 50, // 50% markup on connectivity cost only
    packageUnusedAllowance: 30, // 30% expected unused
    minDealSize: 100, // minimum 100 SIMs
    maxRiskScore: 7, // maximum risk score of 7/10
    defaultUsageDistribution: true, // auto-distribute usage for multi-country
    payAsYouGoPriority: true, // prefer pay-as-you-go model
    maxDiscountStandard: 25, // 25% max for standard deals
    maxDiscountEnterprise: 40, // 40% max for enterprise
    autoCarrierOptimization: true, // auto-select best carriers
    geminiModel: 'gemini-2.5-flash' // latest AI model
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_rules')
        .select('*')
        .single();
      
      if (data && data.rules) {
        // Merge loaded rules with defaults to ensure all fields exist
        // Handle renamed fields for backward compatibility
        setRules({
          ...rules, // default values
          costPerActiveSim: data.rules.costPerActiveSim ?? 10,
          minProfitMargin: data.rules.minProfitMargin ?? 20,
          connectivityMarkup: data.rules.connectivityMarkup ?? data.rules.connectivityMarkup ?? 50,
          packageUnusedAllowance: data.rules.packageUnusedAllowance ?? 30,
          minDealSize: data.rules.minDealSize ?? 100,
          maxRiskScore: data.rules.maxRiskScore ?? 7,
          defaultUsageDistribution: data.rules.defaultUsageDistribution ?? true,
          payAsYouGoPriority: data.rules.payAsYouGoPriority ?? true,
          maxDiscountStandard: data.rules.maxDiscountStandard ?? 25,
          maxDiscountEnterprise: data.rules.maxDiscountEnterprise ?? 40,
          autoCarrierOptimization: data.rules.autoCarrierOptimization ?? true,
          geminiModel: data.rules.geminiModel ?? 'gemini-2.5-flash'
        });
      }
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  };

  const saveRules = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const { error } = await supabase
        .from('deal_rules')
        .upsert({
          id: 1, // Single row for global rules
          rules,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setSaveMessage('Rules saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving rules:', error);
      setSaveMessage('Error saving rules. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof DealRules, value: string) => {
    const numValue = parseFloat(value) || 0;
    setRules(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] rounded-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Deal Evaluation Rules</h2>
                <p className="text-sm text-gray-500 mt-0.5">Configure profit margins and risk thresholds</p>
              </div>
            </div>
          </div>
        </div>

        {/* Process Flow Diagram */}
        <div className="p-8 pb-0">
          <ProcessFlowDiagram />
        </div>

        {/* Rules Form */}
        <div className="p-8 pt-0 space-y-6">
          {/* Profit Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Cost Structure & Margins
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost per Active SIM
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={rules.costPerActiveSim}
                    onChange={(e) => handleInputChange('costPerActiveSim', e.target.value)}
                    className="w-full px-4 py-2.5 pr-16 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    cents/month
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Our platform cost: €0.10 per active SIM per month
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Profit Margin
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={rules.minProfitMargin}
                    onChange={(e) => handleInputChange('minProfitMargin', e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Minimum acceptable profit margin for deals
                </p>
              </div>
            </div>
          </div>

          {/* Official Pricing Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Official List Pricing
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Markup on Connectivity Cost
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={rules.connectivityMarkup}
                    onChange={(e) => handleInputChange('connectivityMarkup', e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Official markup on connectivity costs only (50% = 1.5x cost)
                </p>
              </div>
            </div>
          </div>

          {/* Package Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4" />
              Package Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Unused Package Allowance
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={rules.packageUnusedAllowance}
                    onChange={(e) => handleInputChange('packageUnusedAllowance', e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Buffer for unused data in packages (default: 30%)
                </p>
              </div>
            </div>
          </div>

          {/* Risk Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Risk Management
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Deal Size
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    value={rules.minDealSize}
                    onChange={(e) => handleInputChange('minDealSize', e.target.value)}
                    className="w-full px-4 py-2.5 pr-16 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    SIMs
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Minimum SIMs to qualify as a deal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Risk Score
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={rules.maxRiskScore}
                    onChange={(e) => handleInputChange('maxRiskScore', e.target.value)}
                    className="w-full px-4 py-2.5 pr-16 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    / 10
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Maximum acceptable risk level (1-10)
                </p>
              </div>
            </div>
          </div>

          {/* Discount Limits */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Discount Limits
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Standard Discount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    max="100"
                    value={rules.maxDiscountStandard}
                    onChange={(e) => handleInputChange('maxDiscountStandard', e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Maximum discount for standard deals (typically 25%)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Enterprise Discount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    max="100"
                    value={rules.maxDiscountEnterprise}
                    onChange={(e) => handleInputChange('maxDiscountEnterprise', e.target.value)}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Maximum discount for enterprise/strategic deals (40%)
                </p>
              </div>
            </div>
          </div>

          {/* AI & Automation Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4" />
              AI & Automation
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">Automatic Usage Distribution</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically distribute usage percentages for multi-country deals
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.defaultUsageDistribution}
                    onChange={(e) => setRules(prev => ({ ...prev, defaultUsageDistribution: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">Pay-as-you-go Priority</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Always recommend pay-as-you-go pricing model over packages
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.payAsYouGoPriority}
                    onChange={(e) => setRules(prev => ({ ...prev, payAsYouGoPriority: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">Automatic Carrier Optimization</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically select best carrier per country based on cost and reliability
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rules.autoCarrierOptimization}
                    onChange={(e) => setRules(prev => ({ ...prev, autoCarrierOptimization: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={rules.geminiModel}
                  onChange={(e) => setRules(prev => ({ ...prev, geminiModel: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
                >
                  <optgroup label="Gemini 2.5 (Latest)">
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Best for complex analysis)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & efficient)</option>
                  </optgroup>
                  <optgroup label="Gemini 2.0">
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Cost-effective)</option>
                  </optgroup>
                  <optgroup label="Gemini 1.5">
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </optgroup>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  AI model for deal analysis. Pro models offer deeper reasoning, Flash models are faster.
                </p>
              </div>
            </div>
          </div>

          {/* Comprehensive Process Info Box */}
          <div className="space-y-4">
            {/* How It Works */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800 w-full">
                  <p className="font-semibold mb-3 text-base">📋 Deal Analysis Process</p>
                  
                  {/* Process Flow */}
                  <div className="bg-white/70 rounded-lg p-3 mb-3">
                    <p className="font-medium text-blue-900 mb-2">1️⃣ Input Collection</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 ml-2">
                      <li>Number of SIMs required</li>
                      <li>Countries & usage distribution (e.g., USA 71%, Mexico 16%, Canada 13%)</li>
                      <li>Data requirements (MB/GB per SIM)</li>
                      <li>Contract duration (months)</li>
                      <li>Customer type (new/existing)</li>
                      <li>Pricing model preference (Pay-as-you-go recommended)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white/70 rounded-lg p-3 mb-3">
                    <p className="font-medium text-blue-900 mb-2">2️⃣ Automatic Calculations</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 ml-2">
                      <li>Queries Supabase for real-time network pricing</li>
                      <li>Selects optimal carrier per country (cheapest + reliable)</li>
                      <li>Applies usage weighting (60% USA rate + 40% Mexico rate)</li>
                      <li>Adds official markup: {rules.connectivityMarkup}% on costs</li>
                      <li>Includes platform cost: €{(rules.costPerActiveSim/100).toFixed(2)} per active SIM</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white/70 rounded-lg p-3 mb-3">
                    <p className="font-medium text-blue-900 mb-2">3️⃣ AI Enhancement (Gemini)</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 ml-2">
                      <li>Analyzes deal for volume discounts (0-25% typical)</li>
                      <li>Considers contract length bonuses</li>
                      <li>Evaluates strategic value</li>
                      <li>Generates business justifications</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white/70 rounded-lg p-3">
                    <p className="font-medium text-blue-900 mb-2">4️⃣ Sales Output</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 ml-2">
                      <li>✅ Pay-as-you-go structure (Active SIM fee + Data rate)</li>
                      <li>✅ Discount percentage from list price</li>
                      <li>✅ Carrier optimization details</li>
                      <li>✅ Business justifications</li>
                      <li>❌ Never shows actual costs or margins</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pay-as-you-go Model */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div className="text-sm text-indigo-800 w-full">
                  <p className="font-semibold mb-2">💳 Pay-as-you-go Pricing Model</p>
                  <div className="bg-white/70 rounded-lg p-3 space-y-2 text-xs">
                    <p className="font-medium">Structure:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li><strong>Active SIM Fee:</strong> €{(rules.costPerActiveSim/100).toFixed(2)}/month per active SIM</li>
                      <li><strong>Data Rate:</strong> Usage-based charge per MB consumed</li>
                      <li><strong>No waste:</strong> Customer only pays for actual usage</li>
                    </ul>
                    
                    <div className="border-t pt-2 mt-2">
                      <p className="font-medium">Benefits:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Transparent pricing structure</li>
                        <li>No overpayment for unused data</li>
                        <li>Scales with actual usage</li>
                        <li>Weighted pricing for multi-country deals</li>
                      </ul>
                    </div>
                    
                    <div className="border-t pt-2 mt-2">
                      <p className="font-medium">Multi-Country Weighting:</p>
                      <p className="ml-2">When multiple countries are involved, pricing is weighted by usage percentage.</p>
                      <p className="ml-2 text-indigo-600 font-mono mt-1">
                        Price = (USA% × USA_rate) + (MEX% × MEX_rate) + (CAN% × CAN_rate)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Formula */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="text-sm text-purple-800 w-full">
                  <p className="font-semibold mb-2">💡 Pricing Formula</p>
                  <div className="bg-white/70 rounded-lg p-3 font-mono text-xs">
                    <p className="mb-2">List Price = (Cost × {(1 + rules.connectivityMarkup/100).toFixed(2)}) + €{(rules.costPerActiveSim/100).toFixed(2)}</p>
                    <p className="text-purple-600">Your Price = List Price × (1 - Discount%)</p>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs">• <strong>Cost</strong>: Weighted average from carriers (hidden)</p>
                    <p className="text-xs">• <strong>Markup</strong>: {rules.connectivityMarkup}% on all costs</p>
                    <p className="text-xs">• <strong>Platform Cost</strong>: €{(rules.costPerActiveSim/100).toFixed(2)} per active SIM</p>
                    <p className="text-xs">• <strong>Discount</strong>: 0-{rules.maxDiscountStandard}% standard, max {rules.maxDiscountEnterprise}% enterprise</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Example Calculation */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Calculator className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800 w-full">
                  <p className="font-semibold mb-2">📊 Example Calculation</p>
                  <div className="bg-white/70 rounded-lg p-3 space-y-2 text-xs">
                    <p><strong>Input:</strong> 1000 SIMs, USA/Mexico, 500MB/month, 24-month contract</p>
                    <div className="border-t pt-2">
                      <p className="text-gray-600">Internal (hidden from sales):</p>
                      <p>• Carrier cost: €2.00/SIM (weighted)</p>
                      <p>• With {rules.connectivityMarkup}% markup: €{(2 * (1 + rules.connectivityMarkup/100)).toFixed(2)}</p>
                      <p>• Plus platform cost €{(rules.costPerActiveSim/100).toFixed(2)}: €{(2 * (1 + rules.connectivityMarkup/100) + rules.costPerActiveSim/100).toFixed(2)}</p>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-green-700 font-medium">Sales sees:</p>
                      <p>• List Price: €{(2 * (1 + rules.connectivityMarkup/100) + rules.costPerActiveSim/100).toFixed(2)}/SIM</p>
                      <p>• Your Price: €{((2 * (1 + rules.connectivityMarkup/100) + rules.costPerActiveSim/100) * 0.85).toFixed(2)}/SIM (15% discount)</p>
                      <p>• Total Monthly: €{((2 * (1 + rules.connectivityMarkup/100) + rules.costPerActiveSim/100) * 0.85 * 1000).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Discount Tiers Reference */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Percent className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800 w-full">
                  <p className="font-semibold mb-2">🎯 Discount Tiers (AI Guidelines)</p>
                  <div className="bg-white/70 rounded-lg p-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left pb-2">Volume</th>
                          <th className="text-left pb-2">Base Discount</th>
                          <th className="text-left pb-2">Contract Bonus</th>
                          <th className="text-left pb-2">Max Total</th>
                        </tr>
                      </thead>
                      <tbody className="space-y-1">
                        <tr className="border-b">
                          <td className="py-1">0-100 SIMs</td>
                          <td>0-5%</td>
                          <td>+2% (24m)</td>
                          <td>7%</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">100-500 SIMs</td>
                          <td>5-10%</td>
                          <td>+5% (24m)</td>
                          <td>15%</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">500-1000 SIMs</td>
                          <td>10-15%</td>
                          <td>+5% (24m)</td>
                          <td>20%</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">1000-5000 SIMs</td>
                          <td>15-20%</td>
                          <td>+5% (36m)</td>
                          <td className="font-semibold">{rules.maxDiscountStandard}%</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-medium">5000+ SIMs</td>
                          <td className="font-medium">20-25%</td>
                          <td className="font-medium">+5-15%</td>
                          <td className="font-medium text-amber-700">{rules.maxDiscountEnterprise}% max</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-3 p-2 bg-amber-100 rounded text-xs">
                      <p className="font-semibold mb-1">📌 Key Rules:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                        <li>Standard deals: Max {rules.maxDiscountStandard}% discount</li>
                        <li>Enterprise/Strategic: Max {rules.maxDiscountEnterprise}% discount</li>
                        <li>Strategic accounts get additional 5% bonus</li>
                        <li>Always show discount % to sales, never costs</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Current Settings Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="text-sm text-gray-700 w-full">
                  <p className="font-medium mb-3">Current Active Settings:</p>
                  
                  <div className="space-y-2">
                    {/* Pricing Rules */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">💰 Pricing Rules</p>
                      <div className="grid grid-cols-2 gap-1 text-xs ml-3">
                        <div>• Connectivity markup: {rules.connectivityMarkup}%</div>
                        <div>• Platform cost: €{(rules.costPerActiveSim/100).toFixed(2)}/SIM</div>
                        <div>• Minimum margin: {rules.minProfitMargin}%</div>
                        <div>• Package buffer: {rules.packageUnusedAllowance}%</div>
                      </div>
                    </div>
                    
                    {/* Discount Limits */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🎯 Discount Limits</p>
                      <div className="grid grid-cols-2 gap-1 text-xs ml-3">
                        <div>• Standard max: {rules.maxDiscountStandard}%</div>
                        <div>• Enterprise max: {rules.maxDiscountEnterprise}%</div>
                      </div>
                    </div>
                    
                    {/* Risk & Limits */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">⚠️ Risk & Limits</p>
                      <div className="grid grid-cols-2 gap-1 text-xs ml-3">
                        <div>• Min deal size: {rules.minDealSize} SIMs</div>
                        <div>• Max risk score: {rules.maxRiskScore}/10</div>
                      </div>
                    </div>
                    
                    {/* AI & Automation */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🤖 AI & Automation</p>
                      <div className="grid grid-cols-2 gap-1 text-xs ml-3">
                        <div>• Auto distribution: {rules.defaultUsageDistribution ? '✅' : '❌'}</div>
                        <div>• Pay-as-you-go priority: {rules.payAsYouGoPriority ? '✅' : '❌'}</div>
                        <div>• Carrier optimization: {rules.autoCarrierOptimization ? '✅' : '❌'}</div>
                        <div>• AI model: {rules.geminiModel ? rules.geminiModel.split('-').pop() : 'flash'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4">
            <div>
              {saveMessage && (
                <p className={`text-sm ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMessage}
                </p>
              )}
            </div>
            <button
              onClick={saveRules}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#5B9BD5] to-[#9B7BB6] text-white rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};