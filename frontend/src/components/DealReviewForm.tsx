import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Plus, X, Loader2, TrendingUp, AlertCircle, Globe, Smartphone, DollarSign, Wifi, Network, Edit, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dealConfig } from '../config/dealConfig';
import type { DealRequest, DealEvaluation } from '../config/dealConfig';
import { DealEvaluationService } from '../services/dealEvaluationService';
import { EnhancedDealService } from '../services/enhancedDealService';
import { ComprehensiveDealService } from '../services/comprehensiveDealService';
import type { DealRequestMandatory } from '../services/comprehensiveDealService';
import { formatDealForSales } from '../utils/dealFormatter';
import { DealProposalView } from './DealProposalView';
import '../styles/monogoto-theme.css';

interface DealReviewFormProps {
  initialDeal?: Partial<DealRequest>;
  onEvaluation?: (evaluation: DealEvaluation, deal: DealRequest) => void;
  onExpandToggle?: () => void;
  isExpanded?: boolean;
}

export const DealReviewForm: React.FC<DealReviewFormProps> = ({ initialDeal, onEvaluation, onExpandToggle, isExpanded = false }) => {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCarriers, setAvailableCarriers] = useState<Map<string, string[]>>(new Map());
  
  // Form state
  const [formData, setFormData] = useState<DealRequest>({
    simQuantity: initialDeal?.simQuantity || 1000,
    countries: initialDeal?.countries || [],
    usagePercentages: initialDeal?.usagePercentages || {}, // New: usage distribution
    carriers: initialDeal?.carriers || [],
    monthlyDataPerSim: initialDeal?.monthlyDataPerSim || 1,
    monthlySmsPerSim: initialDeal?.monthlySmsPerSim || 0,
    duration: initialDeal?.duration || 12,
    proposedPricePerSim: initialDeal?.proposedPricePerSim || 2,
    currency: initialDeal?.currency || 'USD',
    isNewCustomer: initialDeal?.isNewCustomer ?? true,
    expectedUsagePattern: initialDeal?.expectedUsagePattern || 'medium',
    requiresIoT: initialDeal?.requiresIoT || false,
    iotType: initialDeal?.iotType
  });
  
  const [evaluation, setEvaluation] = useState<DealEvaluation | null>(null);
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<any>(null);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [isResultsExpanded, setIsResultsExpanded] = useState(false);
  const [dataAmount, setDataAmount] = useState<number>(1024);
  const [dataUnit, setDataUnit] = useState<'KB' | 'MB' | 'GB'>('MB');
  const [priceAmount, setPriceAmount] = useState<number>(2);
  const [cellularTechnologies, setCellularTechnologies] = useState<string[]>(['2G', '3G', '4G', '5G']);
  const [lpwanTechnologies, setLpwanTechnologies] = useState<string[]>([]);
  const [showCellularDropdown, setShowCellularDropdown] = useState(false);
  const [showLpwanDropdown, setShowLpwanDropdown] = useState(false);
  const cellularDropdownRef = useRef<HTMLDivElement>(null);
  const lpwanDropdownRef = useRef<HTMLDivElement>(null);
  const evaluationService = new DealEvaluationService();
  const enhancedService = new EnhancedDealService();
  const comprehensiveService = new ComprehensiveDealService();
  
  // Format usage function (MB input → smart display)
  const formatUsage = (mb: number | string): string => {
    if (!mb) return "—";
    const mbValue = Number(mb);
    if (mbValue < 1024) {
      return mbValue + " MB";
    } else {
      let gb = mbValue / 1024;
      let s = gb.toFixed(1); // 1 decimal
      if (s.endsWith(".0")) s = s.slice(0, -2); // remove .0 if clean
      return s + " GB";
    }
  };
  
  useEffect(() => {
    loadCountries();
    // Initialize data amount from existing monthlyDataPerSim (convert GB to MB)
    setDataAmount(formData.monthlyDataPerSim * 1024);
    setPriceAmount(formData.proposedPricePerSim);
  }, []);
  
  useEffect(() => {
    // Load carriers when countries change
    if (formData.countries.length > 0) {
      loadCarriersForCountries(formData.countries);
    }
  }, [formData.countries]);

  useEffect(() => {
    // Sync data amount with formData (always convert to GB for backend)
    let gbValue: number;
    switch (dataUnit) {
      case 'KB':
        gbValue = dataAmount / (1024 * 1024);
        break;
      case 'MB':
        gbValue = dataAmount / 1024;
        break;
      case 'GB':
        gbValue = dataAmount;
        break;
      default:
        gbValue = dataAmount / 1024;
    }
    setFormData(prev => ({ ...prev, monthlyDataPerSim: gbValue }));
  }, [dataAmount, dataUnit]);

  useEffect(() => {
    // Sync price amount with formData
    setFormData(prev => ({ ...prev, proposedPricePerSim: priceAmount }));
  }, [priceAmount]);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (cellularDropdownRef.current && !cellularDropdownRef.current.contains(event.target as Node)) {
        setShowCellularDropdown(false);
      }
      if (lpwanDropdownRef.current && !lpwanDropdownRef.current.contains(event.target as Node)) {
        setShowLpwanDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const loadCountries = async () => {
    const { data, error } = await supabase
      .from('network_pricing')
      .select('country')
      .order('country');

    if (!error && data) {
      const uniqueCountries = [...new Set(data.map(d => d.country))].filter(c => c && c !== 'Unknown');
      setAvailableCountries(uniqueCountries);
    }
  };

  const loadCarriersForCountries = async (selectedCountries: string[]) => {
    const carrierMap = new Map<string, string[]>();

    for (const country of selectedCountries) {
      const { data, error } = await supabase
        .from('network_pricing')
        .select('network_name')
        .eq('country', country)
        .order('network_name');
      
      if (!error && data) {
        const uniqueCarriers = [...new Set(data.map(d => d.network_name))];
        carrierMap.set(country, uniqueCarriers);
      }
    }
    
    setAvailableCarriers(carrierMap);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Prepare comprehensive deal request
      const comprehensiveDeal: DealRequestMandatory = {
        simCount: formData.simQuantity,
        dataPerMonth: formData.monthlyDataPerSim * 1024, // Convert GB to MB
        countries: formData.countries,
        networksPerCountry: formData.countries.reduce((acc, country) => {
          acc[country] = 2; // Default to 2 networks per country for redundancy
          return acc;
        }, {} as Record<string, number>),
        commitmentMonths: formData.duration,
        technology: formData.requiresIoT ? ['4G', '5G', 'Cat-M', 'NB-IoT'] : ['3G', '4G', '5G']
      };

      // Use all three services for comprehensive analysis
      const [basicResult, enhancedResult, comprehensiveResult] = await Promise.all([
        evaluationService.evaluateDeal(formData),
        enhancedService.analyzeDeal({
          simCount: formData.simQuantity,
          countries: formData.countries,
          dataPerSim: formData.monthlyDataPerSim * 1024, // Convert GB to MB
          pricingModel: 'payAsYouGo', // Always use pay-as-you-go now
          usagePercentages: formData.usagePercentages, // Pass usage distribution
          contractLength: formData.duration,
          requestedPrice: formData.proposedPricePerSim
        }),
        comprehensiveService.evaluateDeal(comprehensiveDeal)
      ]);
      
      console.log('=== DEBUGGING DEAL EVALUATION DATA ===');
      console.log('Basic evaluation result:', basicResult);
      console.log('Enhanced analysis result:', enhancedResult);
      console.log('Comprehensive analysis result:', comprehensiveResult);
      console.log('Comprehensive recommendation:', comprehensiveResult?.recommendation);
      console.log('Enhanced analysis fields:');
      console.log('- reasoning:', enhancedResult?.reasoning);
      console.log('- assumptions:', enhancedResult?.assumptions);
      console.log('- warnings:', enhancedResult?.warnings);
      console.log('- usageDistribution:', enhancedResult?.usageDistribution);
      console.log('- payAsYouGo:', enhancedResult?.payAsYouGo);
      console.log('Basic evaluation fields:');
      console.log('- verdict:', basicResult?.verdict);
      console.log('- notes:', basicResult?.notes);
      console.log('=========================================');
      
      setEvaluation(basicResult);
      setEnhancedAnalysis(enhancedResult);
      setComprehensiveAnalysis(comprehensiveResult);
      setShowResults(true);
      
      if (onEvaluation) {
        onEvaluation(basicResult, formData);
      }
    } catch (error) {
      console.error('Error evaluating deal:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditDeal = () => {
    setShowResults(false);
  };

  const addCountry = (country: string) => {
    if (country && !formData.countries.includes(country)) {
      setFormData(prev => ({
        ...prev,
        countries: [...prev.countries, country]
      }));
    }
  };
  
  const removeCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.filter(c => c !== country),
      // Also remove carriers from this country
      carriers: prev.carriers.filter(carrier => {
        const carriersInCountry = availableCarriers.get(country) || [];
        return !carriersInCountry.includes(carrier);
      })
    }));
  };
  
  const toggleCarrier = (carrier: string) => {
    setFormData(prev => ({
      ...prev,
      carriers: prev.carriers.includes(carrier)
        ? prev.carriers.filter(c => c !== carrier)
        : [...prev.carriers, carrier]
    }));
  };

  const toggleCellularTech = (tech: string) => {
    setCellularTechnologies(prev => 
      prev.includes(tech)
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  const toggleLpwanTech = (tech: string) => {
    setLpwanTechnologies(prev => 
      prev.includes(tech)
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  const cycleDataUnit = () => {
    // Convert current value to maintain the same data amount when switching units
    let newAmount = dataAmount;
    let newUnit: 'KB' | 'MB' | 'GB';
    
    switch (dataUnit) {
      case 'KB':
        newUnit = 'MB';
        newAmount = dataAmount / 1024; // Convert KB to MB
        break;
      case 'MB':
        newUnit = 'GB';
        newAmount = dataAmount / 1024; // Convert MB to GB
        break;
      case 'GB':
        newUnit = 'KB';
        newAmount = dataAmount * 1024 * 1024; // Convert GB to KB
        break;
      default:
        newUnit = 'MB';
    }
    
    setDataUnit(newUnit);
    setDataAmount(Math.round(newAmount * 100) / 100); // Round to 2 decimal places
  };

  const isFormValid = () => {
    // Check all required fields
    return (
      formData.simQuantity > 0 &&
      dataAmount > 0 &&
      priceAmount > 0 &&
      formData.duration > 0 &&
      formData.countries.length > 0
    );
  };
  
  // Show results screen if evaluation is complete and showResults is true
  if (showResults && evaluation) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-end mb-4 gap-2">
          <button
            onClick={handleEditDeal}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Deal</span>
          </button>
          {onExpandToggle && (
            <button
              onClick={() => {setIsResultsExpanded(!isResultsExpanded); onExpandToggle();}}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title={isResultsExpanded ? "Collapse to sidebar" : "Expand to 50% width"}
            >
              {isResultsExpanded ? (
                <Minimize2 className="w-5 h-5 text-gray-600" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {/* New Professional Deal Proposal View */}
        <DealProposalView
          formData={formData}
          evaluation={evaluation}
          enhancedAnalysis={enhancedAnalysis}
          comprehensiveAnalysis={comprehensiveAnalysis}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Reorganized Deal Form */}
        <div className="bg-gradient-to-br from-white via-[#5B9BD5]/[0.02] to-[#5B9BD5]/[0.05] rounded-2xl shadow-sm border border-[#5B9BD5]/10 p-6">
          
          {/* First Row: Number of SIM, Monthly data usage, Monthly SMS */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Number of SIMs */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Number of SIMs
              </label>
              <input
                type="number"
                min="1"
                value={formData.simQuantity}
                onChange={(e) => setFormData(prev => ({ ...prev, simQuantity: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                required
              />
            </div>
            
            {/* Monthly Data Usage */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Monthly Data Usage
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={cycleDataUnit}
                  className="absolute left-0 top-0 h-full px-4 flex items-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-l-xl transition-colors z-10 cursor-pointer"
                  title="Click to cycle through KB → MB → GB"
                >
                  <span className="font-semibold text-sm">
                    {dataUnit}
                  </span>
                </button>
                <input
                  type="number"
                  min="0"
                  step={dataUnit === 'GB' ? '0.1' : '1'}
                  value={dataAmount || ''}
                  onChange={(e) => setDataAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-16 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click {dataUnit} to cycle units (KB → MB → GB)
              </p>
            </div>
            
            {/* Monthly SMS */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Monthly SMS
              </label>
              <input
                type="number"
                min="0"
                value={formData.monthlySmsPerSim || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlySmsPerSim: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
              />
            </div>
          </div>

          {/* Second Row: Customer type, Target price per SIM, Contract duration */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Customer Type */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Customer Type
              </label>
              <select
                value={formData.isNewCustomer ? 'new' : 'existing'}
                onChange={(e) => setFormData(prev => ({ ...prev, isNewCustomer: e.target.value === 'new' }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all"
              >
                <option value="new">New Customer</option>
                <option value="existing">Existing Customer</option>
              </select>
            </div>
            
            {/* Target Price per SIM (monthly) */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Target Price per SIM (monthly)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceAmount}
                onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                placeholder="Enter price"
                required
              />
            </div>
            
            {/* Contract Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Contract Duration (months)
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                required
              />
            </div>
          </div>

          {/* Third Row: Cellular technology, LPWAN, Expected usage pattern */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Cellular Technologies */}
            <div className="relative" ref={cellularDropdownRef}>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Cellular Technologies
              </label>
              <button
                type="button"
                onClick={() => setShowCellularDropdown(!showCellularDropdown)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all text-sm flex items-center justify-between"
              >
                <span className="text-left">
                  {cellularTechnologies.length === 0 
                    ? 'Select technologies...' 
                    : cellularTechnologies.length === 4
                    ? 'All selected (2G, 3G, 4G, 5G)'
                    : `${cellularTechnologies.length} selected: ${cellularTechnologies.join(', ')}`
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showCellularDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showCellularDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                  <div className="p-2">
                    {['2G', '3G', '4G', '5G'].map((tech) => (
                      <label key={tech} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cellularTechnologies.includes(tech)}
                          onChange={() => toggleCellularTech(tech)}
                          className="w-4 h-4 rounded border-gray-300 text-[#5B9BD5] focus:ring-[#5B9BD5]/50"
                        />
                        <span className="text-sm font-medium text-gray-700">{tech}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* LPWAN Technologies */}
            <div className="relative" ref={lpwanDropdownRef}>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                LPWAN Technologies
              </label>
              <button
                type="button"
                onClick={() => setShowLpwanDropdown(!showLpwanDropdown)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all text-sm flex items-center justify-between"
              >
                <span className="text-left">
                  {lpwanTechnologies.length === 0 
                    ? 'Select technologies...' 
                    : lpwanTechnologies.length === 2
                    ? 'All selected (LTE-M, NB-IoT)'
                    : `${lpwanTechnologies.length} selected: ${lpwanTechnologies.join(', ')}`
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showLpwanDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showLpwanDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                  <div className="p-2">
                    {[
                      { value: 'LTE-M', label: 'LTE-M (CAT-M/LTE-M, Higher bandwidth)' },
                      { value: 'NB-IoT', label: 'NB-IoT (Lower power)' }
                    ].map((tech) => (
                      <label key={tech.value} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lpwanTechnologies.includes(tech.value)}
                          onChange={() => toggleLpwanTech(tech.value)}
                          className="w-4 h-4 rounded border-gray-300 text-[#5B9BD5] focus:ring-[#5B9BD5]/50"
                        />
                        <span className="text-sm font-medium text-gray-700">{tech.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Expected Usage Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Expected Usage Pattern
              </label>
              <select
                value={formData.expectedUsagePattern}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedUsagePattern: e.target.value as 'low' | 'medium' | 'high' }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Fourth Row: Countries */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Countries */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Countries
              </label>
              <select
                onChange={(e) => {
                  addCountry(e.target.value);
                  e.target.value = '';
                }}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
              >
                <option value="">Select countries...</option>
                {availableCountries.map(country => (
                  <option key={country} value={country} disabled={formData.countries.includes(country)}>
                    {country}
                  </option>
                ))}
              </select>
              {/* Selected Countries - shown right below dropdown */}
              {formData.countries.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.countries.map((country, index) => {
                    const colors = [
                      'bg-[#5B9BD5]/10 text-[#5B9BD5] border-[#5B9BD5]/20',
                      'bg-[#9B7BB6]/10 text-[#9B7BB6] border-[#9B7BB6]/20',
                      'bg-[#EC6B9D]/10 text-[#EC6B9D] border-[#EC6B9D]/20',
                      'bg-[#F5B342]/10 text-[#F5B342] border-[#F5B342]/20'
                    ];
                    const colorClass = colors[index % colors.length];
                    return (
                      <span
                        key={country}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}
                      >
                        {country}
                        <button
                          type="button"
                          onClick={() => removeCountry(country)}
                          className="ml-1.5 hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Usage Distribution for Multiple Countries */}
          {formData.countries.length > 1 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-xl border border-blue-100/50">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Usage Distribution (% of total traffic)
              </h4>
              <div className="space-y-3">
                {formData.countries.map((country, idx) => {
                  const usage = formData.usagePercentages?.[country] || Math.round(100 / formData.countries.length);
                  return (
                    <div key={country} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-24">{country}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={usage}
                        onChange={(e) => {
                          const newPercentages = {
                            ...formData.usagePercentages,
                            [country]: parseInt(e.target.value)
                          };
                          setFormData(prev => ({ ...prev, usagePercentages: newPercentages }));
                        }}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #5B9BD5 0%, #5B9BD5 ${usage}%, #e5e7eb ${usage}%, #e5e7eb 100%)`
                        }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={usage}
                        onChange={(e) => {
                          const newPercentages = {
                            ...formData.usagePercentages,
                            [country]: parseInt(e.target.value) || 0
                          };
                          setFormData(prev => ({ ...prev, usagePercentages: newPercentages }));
                        }}
                        className="w-16 px-2 py-1 text-sm text-center bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#5B9BD5]/50"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  );
                })}
                
                {/* Total validation */}
                {(() => {
                  const total = formData.countries.reduce((sum, country) => 
                    sum + (formData.usagePercentages?.[country] || Math.round(100 / formData.countries.length)), 0
                  );
                  return total !== 100 && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-amber-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>Total: {total}% (should equal 100% - will auto-adjust)</span>
                    </div>
                  );
                })()}
                
                <button
                  type="button"
                  onClick={() => {
                    const evenPercentage = Math.round(100 / formData.countries.length);
                    const newPercentages: Record<string, number> = {};
                    formData.countries.forEach((country, idx) => {
                      // Give remaining percentage to last country to ensure 100%
                      if (idx === formData.countries.length - 1) {
                        newPercentages[country] = 100 - (evenPercentage * (formData.countries.length - 1));
                      } else {
                        newPercentages[country] = evenPercentage;
                      }
                    });
                    setFormData(prev => ({ ...prev, usagePercentages: newPercentages }));
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Distribute Evenly
                </button>
              </div>
            </div>
          )}
          
          {/* Preferred Carriers - Optional */}
          {formData.countries.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-500 mb-3">
                Preferred Carriers <span className="text-xs text-gray-400">(Optional - Select multiple for redundancy)</span>
              </label>
              {formData.countries.map(country => {
                const carriers = availableCarriers.get(country) || [];
                const selectedInCountry = carriers.filter(c => formData.carriers.includes(c)).length;
                return (
                  <div key={country} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">{country}</p>
                      {selectedInCountry > 0 && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {selectedInCountry} network{selectedInCountry > 1 ? 's' : ''} selected
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {carriers.map(carrier => (
                        <label key={carrier} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.carriers.includes(carrier)}
                            onChange={() => toggleCarrier(carrier)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700 truncate">{carrier}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Submit Button */}
        <div className="flex flex-col items-end gap-3">
          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="px-8 py-3.5 bg-gradient-to-r from-[#5B9BD5] to-[#9B7BB6] text-white rounded-xl font-semibold hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                <span>Evaluate Deal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function to format message content with organized styling
function formatDealContent(content: string): string {
  return content
    // Headers - smaller font, better spacing
    .replace(/### (.*?)$/gm, '<h3 class="text-sm font-semibold mt-2 mb-1 text-gray-800">$1</h3>')
    .replace(/## (.*?)$/gm, '<h2 class="text-sm font-bold mt-3 mb-1 text-gray-900">$1</h2>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-sm">$1</strong>')
    // Replace grid with compact list format
    .replace(/<div class="pricing-grid">/g, '<div class="space-y-1 mb-2">')
    .replace(/<div class="pricing-card">/g, '<div class="text-sm">')
    .replace(/<span class="label">/g, '<span class="font-semibold text-gray-800 uppercase text-sm">')
    .replace(/<span class="value">/g, '<span class="font-semibold text-gray-900 text-sm">')
    .replace(/<span class="value success">/g, '<span class="font-semibold text-green-600 text-sm">')
    .replace(/<span class="value accent">/g, '<span class="font-semibold text-blue-600 text-sm">')
    .replace(/<span class="description">/g, '<span class="text-sm text-gray-500 ml-2">(')
    // Optimization section - compact
    .replace(/<div class="optimization-section">/g, '<div class="mb-1">')
    .replace(/<div class="optimization-grid">/g, '<div class="text-sm space-y-1">')
    .replace(/<div class="region-card">/g, '<div class="flex justify-between items-center text-sm">')
    .replace(/<div class="region-name">/g, '<div class="font-medium text-gray-700 text-sm">')
    .replace(/<div class="region-percentage">/g, '<div class="font-semibold text-gray-900 text-sm">')
    .replace(/<div class="optimization-note">/g, '<div class="text-sm text-gray-600">')
    .replace(/<span class="note-icon">/g, '<span class="text-blue-500">')
    .replace(/<span class="note-text">/g, '<span>')
    // Lists - compact
    .replace(/• (.*?)$/gm, '<li class="ml-1 text-sm">• $1</li>')
    .replace(/✓ (.*?)$/gm, '<li class="ml-1 text-sm text-green-600">✓ $1</li>')
    .replace(/→ (.*?)$/gm, '<div class="ml-1 text-sm text-gray-600">→ $1</div>')
    // Status icons
    .replace(/✅/g, '<span class="text-green-600">✅</span>')
    .replace(/❌/g, '<span class="text-red-600">❌</span>')
    .replace(/⚠️/g, '<span class="text-yellow-600">⚠️</span>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

