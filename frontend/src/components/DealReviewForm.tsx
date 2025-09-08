import React, { useState, useEffect } from 'react';
import { Calculator, Plus, X, Loader2, TrendingUp, AlertCircle, Globe, Smartphone, DollarSign, Wifi, Network, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dealConfig } from '../config/dealConfig';
import type { DealRequest, DealEvaluation } from '../config/dealConfig';
import { DealEvaluationService } from '../services/dealEvaluationService';
import { EnhancedDealService } from '../services/enhancedDealService';
import { formatDealForSales } from '../utils/dealFormatter';
import '../styles/monogoto-theme.css';

interface DealReviewFormProps {
  initialDeal?: Partial<DealRequest>;
  onEvaluation?: (evaluation: DealEvaluation, deal: DealRequest) => void;
}

export const DealReviewForm: React.FC<DealReviewFormProps> = ({ initialDeal, onEvaluation }) => {
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
  const [showResults, setShowResults] = useState(false);
  const evaluationService = new DealEvaluationService();
  const enhancedService = new EnhancedDealService();
  
  useEffect(() => {
    loadCountries();
  }, []);
  
  useEffect(() => {
    // Load carriers when countries change
    if (formData.countries.length > 0) {
      loadCarriersForCountries(formData.countries);
    }
  }, [formData.countries]);
  
  const loadCountries = async () => {
    const { data, error } = await supabase
      .from('networks')
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
        .from('networks')
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
      // Use both services for comprehensive analysis
      const [basicResult, enhancedResult] = await Promise.all([
        evaluationService.evaluateDeal(formData),
        enhancedService.analyzeDeal({
          simCount: formData.simQuantity,
          countries: formData.countries,
          dataPerSim: formData.monthlyDataPerSim * 1024, // Convert GB to MB
          pricingModel: 'payAsYouGo', // Always use pay-as-you-go now
          usagePercentages: formData.usagePercentages, // Pass usage distribution
          contractLength: formData.duration,
          requestedPrice: formData.proposedPricePerSim
        })
      ]);
      
      setEvaluation(basicResult);
      setEnhancedAnalysis(enhancedResult);
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
  
  // Show results screen if evaluation is complete and showResults is true
  if (showResults && evaluation) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        {/* Edit Deal Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Deal Evaluation Results</h2>
          <button
            onClick={handleEditDeal}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Deal</span>
          </button>
        </div>
        
        {/* Evaluation Results - Monogoto Apple Style */}
        <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/50 rounded-2xl shadow-sm border border-green-100/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/80 backdrop-blur rounded-xl shadow-sm border border-green-200/30">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Evaluation Results</h3>
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {evaluation.isViable ? 'APPROVED' : 'NEEDS REVIEW'}
            </div>
          </div>
          
          {/* Evaluation Content */}
          <div className="space-y-6">
            {enhancedAnalysis && (
              <div className="bg-white/60 rounded-xl p-4 border border-green-100/30">
                <h4 className="font-semibold text-gray-900 mb-3">💰 Pay-as-you-go Pricing Structure</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ACTIVE SIM FEE</div>
                    <div className="text-lg font-semibold text-gray-900">${enhancedAnalysis.activeSimFee}/month</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">DATA RATE</div>
                    <div className="text-lg font-semibold text-gray-900">${enhancedAnalysis.dataRate}/GB</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">TOTAL/SIM</div>
                    <div className="text-lg font-semibold text-green-600">${enhancedAnalysis.totalCostPerSim}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">DISCOUNT</div>
                    <div className="text-lg font-semibold text-blue-600">{enhancedAnalysis.volumeDiscount}% OFF</div>
                  </div>
                </div>
              </div>
            )}
            
            {evaluation.businessJustification && (
              <div className="bg-white/60 rounded-xl p-4 border border-green-100/30">
                <h4 className="font-semibold text-gray-900 mb-3">📝 Business Justification:</h4>
                <ul className="space-y-2">
                  {evaluation.businessJustification.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {evaluation.keyAssumptions && (
              <div className="bg-white/60 rounded-xl p-4 border border-green-100/30">
                <h4 className="font-semibold text-gray-900 mb-3">🔑 Key Assumptions:</h4>
                <ul className="space-y-1">
                  {evaluation.keyAssumptions.map((item, index) => (
                    <li key={index} className="text-sm text-gray-600">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information - Monogoto Apple Style */}
        <div className="bg-gradient-to-br from-white via-[#5B9BD5]/[0.02] to-[#5B9BD5]/[0.05] rounded-2xl shadow-sm border border-[#5B9BD5]/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-white/90 backdrop-blur rounded-xl shadow-sm border border-[#5B9BD5]/10">
              <Smartphone className="w-5 h-5 text-[#5B9BD5]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Deal Information</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
        </div>
        
        {/* Data & Pricing - Monogoto Apple Style */}
        <div className="bg-gradient-to-br from-white via-[#F5B342]/[0.02] to-[#F5B342]/[0.05] rounded-2xl shadow-sm border border-[#F5B342]/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-white/90 backdrop-blur rounded-xl shadow-sm border border-[#F5B342]/10">
              <DollarSign className="w-5 h-5 text-[#F5B342]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Data & Pricing</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Data per SIM (GB/month)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.monthlyDataPerSim}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyDataPerSim: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                SMS per SIM (monthly)
              </label>
              <input
                type="number"
                min="0"
                value={formData.monthlySmsPerSim || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlySmsPerSim: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Target Price per SIM/month
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.proposedPricePerSim}
                onChange={(e) => setFormData(prev => ({ ...prev, proposedPricePerSim: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'USD' | 'EUR' }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Countries & Usage Distribution - Monogoto Apple Style */}
        <div className="bg-gradient-to-br from-white via-[#9B7BB6]/[0.02] to-[#9B7BB6]/[0.05] rounded-2xl shadow-sm border border-[#9B7BB6]/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-white/90 backdrop-blur rounded-xl shadow-sm border border-[#9B7BB6]/10">
              <Globe className="w-5 h-5 text-[#9B7BB6]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Countries & Usage Distribution</h3>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <select
              onChange={(e) => {
                addCountry(e.target.value);
                e.target.value = '';
              }}
              className="flex-1 px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
            >
              <option value="">Select a country...</option>
              {availableCountries.map(country => (
                <option key={country} value={country} disabled={formData.countries.includes(country)}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-4">
            {/* Country tags */}
            <div className="flex flex-wrap gap-2">
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
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${colorClass}`}
                >
                  {country}
                  <button
                    type="button"
                    onClick={() => removeCountry(country)}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
                );
              })}
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
          </div>
        </div>
        
        {/* Carriers - Monogoto Apple Style */}
        {formData.countries.length > 0 && (
          <div className="bg-gradient-to-br from-white via-[#EC6B9D]/[0.02] to-[#EC6B9D]/[0.05] rounded-2xl shadow-sm border border-[#EC6B9D]/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-white/90 backdrop-blur rounded-xl shadow-sm border border-[#EC6B9D]/10">
                <Wifi className="w-5 h-5 text-[#EC6B9D]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Preferred Carriers <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>
            </div>
            
            {formData.countries.map(country => {
              const carriers = availableCarriers.get(country) || [];
              return (
                <div key={country} className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">{country}</p>
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
        
        {/* Customer & Risk - Monogoto Apple Style */}
        <div className="bg-gradient-to-br from-white via-[#5B9BD5]/[0.02] to-[#EC6B9D]/[0.03] rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-white/90 backdrop-blur rounded-xl shadow-sm border border-[#EC6B9D]/10">
              <Network className="w-5 h-5 text-[#EC6B9D]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Customer Profile & Technology</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Customer Type
              </label>
              <select
                value={formData.isNewCustomer ? 'new' : 'existing'}
                onChange={(e) => setFormData(prev => ({ ...prev, isNewCustomer: e.target.value === 'new' }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
              >
                <option value="new">New Customer</option>
                <option value="existing">Existing Customer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Expected Usage Pattern
              </label>
              <select
                value={formData.expectedUsagePattern}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedUsagePattern: e.target.value as 'low' | 'medium' | 'high' }))}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          {/* IoT Requirements - Enhanced Section */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">IoT Technology Requirements</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.requiresIoT}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresIoT: e.target.checked }))}
                  className="w-4 h-4 rounded-md border-gray-300 text-[#5B9BD5] focus:ring-[#5B9BD5]/50"
                />
                <span className="text-sm font-medium text-gray-600">This deployment requires IoT connectivity</span>
              </label>
              
              {formData.requiresIoT && (
                <div className="ml-7 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      IoT Technology Type
                    </label>
                    <select
                      value={formData.iotType || 'CAT-M'}
                      onChange={(e) => setFormData(prev => ({ ...prev, iotType: e.target.value as 'CAT-M' | 'NB-IoT' | 'both' }))}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all text-sm"
                      required
                    >
                      <option value="CAT-M">CAT-M/LTE-M (Higher bandwidth)</option>
                      <option value="NB-IoT">NB-IoT (Lower power)</option>
                      <option value="both">Both Technologies</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Network Technology
                    </label>
                    <div className="flex items-center space-x-4 mt-3">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked disabled className="rounded text-gray-400" />
                        <span className="text-sm text-gray-500">4G/LTE</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" checked disabled className="rounded text-gray-400" />
                        <span className="text-sm text-gray-500">5G</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex flex-col items-end gap-3">
          {formData.countries.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              💡 Please select at least one country to evaluate the deal
            </p>
          )}
          <button
            type="submit"
            disabled={loading || formData.countries.length === 0}
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

