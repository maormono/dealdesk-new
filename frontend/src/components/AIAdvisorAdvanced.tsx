import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Bot, Brain, TrendingUp, AlertCircle, Globe, Smartphone, DollarSign, Wifi, Network, Plus, X, Maximize2, Minimize2, Maximize } from 'lucide-react';
import { AIAdvisorService } from '../services/aiService';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  data?: any[];
}

interface DealQuery {
  simQuantity: number;
  countries: string[];
  usagePercentages: Record<string, number>;
  monthlyDataPerSim: number;
  monthlySmsPerSim: number;
  duration: number;
  proposedPricePerSim: number;
  currency: 'USD' | 'EUR';
  isNewCustomer: boolean;
  expectedUsagePattern: 'low' | 'medium' | 'high';
  requiresIoT: boolean;
  iotType?: 'CAT-M' | 'NB-IoT' | 'both';
  queryText?: string;
}

type ExpandState = 'normal' | 'half' | 'full';

interface AIAdvisorAdvancedProps {
  expandState?: ExpandState;
  onToggleExpand?: () => void;
}

export const AIAdvisorAdvanced: React.FC<AIAdvisorAdvancedProps> = ({ 
  expandState = 'normal',
  onToggleExpand 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '🤖 Hello! I\'m your AI Pricing Advisor powered by Gemini. I can help you analyze deals and pricing scenarios.\n\nFill in the deal parameters below or ask a specific question to get started.',
      timestamp: new Date(),
      confidence: 1.0
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showStructuredInput, setShowStructuredInput] = useState(true);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  
  // Form state matching DealReview structure
  const [formData, setFormData] = useState<DealQuery>({
    simQuantity: 1000,
    countries: [],
    usagePercentages: {},
    monthlyDataPerSim: 1,
    monthlySmsPerSim: 0,
    duration: 12,
    proposedPricePerSim: 2,
    currency: 'USD',
    isNewCustomer: true,
    expectedUsagePattern: 'low',
    requiresIoT: false,
    queryText: ''
  });
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const aiService = useRef<AIAdvisorService | null>(null);

  useEffect(() => {
    // Check if API key is configured
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    setHasApiKey(!!apiKey);
    
    if (apiKey) {
      aiService.current = new AIAdvisorService();
    }
    
    loadCountries();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !aiService.current) return;
    
    // Build the structured query
    let structuredQuery = '';
    
    if (formData.countries.length > 0) {
      // Build a comprehensive prompt based on the structured input
      structuredQuery = `I need help analyzing a deal with the following parameters:\n\n`;
      structuredQuery += `**Deal Details:**\n`;
      structuredQuery += `- Number of SIMs: ${formData.simQuantity}\n`;
      structuredQuery += `- Countries: ${formData.countries.join(', ')}\n`;
      
      // Add usage distribution if multiple countries
      if (formData.countries.length > 1 && formData.usagePercentages) {
        structuredQuery += `- Usage Distribution:\n`;
        formData.countries.forEach(country => {
          const usage = formData.usagePercentages[country] || Math.round(100 / formData.countries.length);
          structuredQuery += `  - ${country}: ${usage}%\n`;
        });
      }
      
      structuredQuery += `- Monthly Data per SIM: ${formData.monthlyDataPerSim} GB\n`;
      if (formData.monthlySmsPerSim > 0) {
        structuredQuery += `- Monthly SMS per SIM: ${formData.monthlySmsPerSim}\n`;
      }
      structuredQuery += `- Contract Duration: ${formData.duration} months\n`;
      structuredQuery += `- Target Price: ${formData.currency} ${formData.proposedPricePerSim} per SIM/month\n`;
      structuredQuery += `- Customer Type: ${formData.isNewCustomer ? 'New' : 'Existing'}\n`;
      structuredQuery += `- Expected Usage Pattern: ${formData.expectedUsagePattern}\n`;
      
      if (formData.requiresIoT) {
        structuredQuery += `- IoT Requirements: ${formData.iotType || 'CAT-M'}\n`;
      }
      
      if (formData.queryText) {
        structuredQuery += `\n**Additional Question:**\n${formData.queryText}\n`;
      }
      
      structuredQuery += `\nPlease analyze this deal and provide:\n`;
      structuredQuery += `1. Profitability assessment\n`;
      structuredQuery += `2. Best network recommendations for each country\n`;
      structuredQuery += `3. Pricing recommendations\n`;
      structuredQuery += `4. Any risks or considerations\n`;
    } else if (formData.queryText) {
      // If no structured data but there's a text query, use that
      structuredQuery = formData.queryText;
    } else {
      // No input provided
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: structuredQuery,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const result = await aiService.current.processNaturalLanguageQuery(structuredQuery);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        confidence: result.confidence,
        data: result.data
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error processing your query. Please make sure the Gemini API key is configured and try again.',
        timestamp: new Date(),
        confidence: 0
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
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
      countries: prev.countries.filter(c => c !== country)
    }));
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return '';
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.5) return 'Medium confidence';
    return 'Low confidence';
  };

  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-6 h-6 text-yellow-500" />
          <h3 className="font-semibold text-gray-900">Gemini API Key Required</h3>
        </div>
        <p className="text-gray-600 mb-4">
          To use the AI Advisor with Gemini, you need to configure your API key.
        </p>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 mb-2">Add to your .env file:</p>
          <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs">
            VITE_GEMINI_API_KEY=your-api-key-here
          </code>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Get your API key from{' '}
          <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Google AI Studio
          </a>
        </p>
      </div>
    );
  }

  const getHeightClass = () => {
    switch (expandState) {
      case 'normal': return 'h-[85vh] min-h-[700px]';
      case 'half': return 'h-[90vh] min-h-[800px]';
      case 'full': return 'fixed inset-0 z-50';
      default: return 'h-[85vh] min-h-[700px]';
    }
  };

  const getExpandIcon = () => {
    switch (expandState) {
      case 'normal': return <Maximize2 className="w-4 h-4" />;
      case 'half': return <Maximize className="w-4 h-4" />;
      case 'full': return <Minimize2 className="w-4 h-4" />;
      default: return <Maximize2 className="w-4 h-4" />;
    }
  };

  const getExpandTooltip = () => {
    switch (expandState) {
      case 'normal': return 'Expand to larger size';
      case 'half': return 'Expand to full screen';
      case 'full': return 'Return to normal size';
      default: return 'Expand';
    }
  };

  return (
    <div className={`flex flex-col ${getHeightClass()} bg-white rounded-lg shadow-lg border border-gray-200`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Smart Analyzer</h3>
              <p className="text-sm text-white/80">Powered by Gemini 1.5 Flash</p>
            </div>
          </div>
          <button
            onClick={() => setShowStructuredInput(!showStructuredInput)}
            className="px-3 py-1 bg-white/20 text-white text-sm rounded-lg hover:bg-white/30 transition-colors"
          >
            {showStructuredInput ? 'Hide Form' : 'Show Form'}
          </button>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              title={getExpandTooltip()}
            >
              {getExpandIcon()}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left side - Structured Input Form */}
        {showStructuredInput && (
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-4 bg-gray-50">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-gray-900 text-sm">Deal Information</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Number of SIMs
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.simQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, simQuantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Duration (months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Data & Pricing */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <h4 className="font-semibold text-gray-900 text-sm">Data & Pricing</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Data/SIM (GB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.monthlyDataPerSim}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthlyDataPerSim: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      SMS/SIM
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.monthlySmsPerSim}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthlySmsPerSim: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Target Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.proposedPricePerSim}
                      onChange={(e) => setFormData(prev => ({ ...prev, proposedPricePerSim: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'USD' | 'EUR' }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Countries */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <h4 className="font-semibold text-gray-900 text-sm">Countries</h4>
                </div>
                
                <select
                  onChange={(e) => {
                    addCountry(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                >
                  <option value="">Add country...</option>
                  {availableCountries.map(country => (
                    <option key={country} value={country} disabled={formData.countries.includes(country)}>
                      {country}
                    </option>
                  ))}
                </select>
                
                <div className="flex flex-wrap gap-2">
                  {formData.countries.map(country => (
                    <span
                      key={country}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
                    >
                      {country}
                      <button
                        type="button"
                        onClick={() => removeCountry(country)}
                        className="ml-1 hover:text-purple-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                
                {/* Usage Distribution */}
                {formData.countries.length > 1 && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Usage Distribution (%)</p>
                    {formData.countries.map(country => {
                      const usage = formData.usagePercentages[country] || Math.round(100 / formData.countries.length);
                      return (
                        <div key={country} className="flex items-center gap-2 mb-1">
                          <span className="text-xs w-20">{country}</span>
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
                            className="flex-1 h-1"
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
                            className="w-12 px-1 py-0.5 text-xs text-center border border-gray-300 rounded"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer Profile */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Network className="w-4 h-4 text-orange-600" />
                  <h4 className="font-semibold text-gray-900 text-sm">Customer & Technology</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Customer Type
                    </label>
                    <select
                      value={formData.isNewCustomer ? 'new' : 'existing'}
                      onChange={(e) => setFormData(prev => ({ ...prev, isNewCustomer: e.target.value === 'new' }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="new">New</option>
                      <option value="existing">Existing</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Usage Pattern
                    </label>
                    <select
                      value={formData.expectedUsagePattern}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedUsagePattern: e.target.value as 'low' | 'medium' | 'high' }))}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.requiresIoT}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiresIoT: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Requires IoT</span>
                  </label>
                  
                  {formData.requiresIoT && (
                    <select
                      value={formData.iotType || 'CAT-M'}
                      onChange={(e) => setFormData(prev => ({ ...prev, iotType: e.target.value as 'CAT-M' | 'NB-IoT' | 'both' }))}
                      className="mt-2 w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="CAT-M">Cat-M/LTE-M</option>
                      <option value="NB-IoT">NB-IoT</option>
                      <option value="both">Both</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Additional Question */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Additional Question (Optional)
                </label>
                <textarea
                  value={formData.queryText}
                  onChange={(e) => setFormData(prev => ({ ...prev, queryText: e.target.value }))}
                  placeholder="Ask a specific question about this deal..."
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (formData.countries.length === 0 && !formData.queryText)}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Analyze Deal</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Right side - Chat Messages */}
        <div className={`${showStructuredInput ? 'w-1/2' : 'w-full'} flex flex-col`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%]`}>
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.content}
                    </div>
                    {message.confidence !== undefined && message.role === 'assistant' && (
                      <div className={`flex items-center space-x-2 mt-2 text-xs ${getConfidenceColor(message.confidence)}`}>
                        <TrendingUp className="w-3 h-3" />
                        <span>{getConfidenceText(message.confidence)} ({Math.round(message.confidence * 100)}%)</span>
                      </div>
                    )}
                    {message.data && message.data.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        📊 Analyzed {message.data.length} networks
                      </div>
                    )}
                  </div>
                  <div className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-right text-gray-500' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-gray-600">Analyzing with Gemini AI...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};