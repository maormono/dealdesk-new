import React, { useState, useRef, useEffect } from 'react';
import { Calculator, Send, TrendingUp, AlertCircle, CheckCircle, XCircle, Loader2, DollarSign } from 'lucide-react';
import { dealConfig } from '../config/dealConfig';
import type { DealRequest, DealEvaluation } from '../config/dealConfig';
import { DealEvaluationService } from '../services/dealEvaluationService';
import { AIAdvisorService } from '../services/aiService';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  dealData?: Partial<DealRequest>;
  evaluation?: DealEvaluation;
}

interface DealReviewProps {
  initialDeal?: Partial<DealRequest>;
}

export const DealReview: React.FC<DealReviewProps> = ({ initialDeal }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `I'm your deal companion. Let's work together to make your deal profitable! 🤝

Tell me about your opportunity:
• How many SIMs do you need?
• Which countries will they operate in?
• What's your target price point?

I'll help optimize the deal - suggesting network choices, usage limits, and pricing adjustments until we find a winning combination.`,
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<Partial<DealRequest>>(initialDeal || {});
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableNetworks, setAvailableNetworks] = useState<string[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const evaluationService = useRef(new DealEvaluationService());
  const aiService = useRef<AIAdvisorService | null>(null);
  
  // Load available countries and networks from database
  useEffect(() => {
    const loadDatabaseData = async () => {
      // Load all countries
      const { data: networks, error } = await supabase
        .from('networks')
        .select('country, network_name')
        .order('country');
      
      if (!error && networks) {
        const uniqueCountries = [...new Set(networks.map(n => n.country))].filter(c => c && c !== 'Unknown');
        const uniqueNetworks = [...new Set(networks.map(n => n.network_name))].filter(n => n);
        setAvailableCountries(uniqueCountries);
        setAvailableNetworks(uniqueNetworks);
      }
    };
    
    loadDatabaseData();
    
    // Initialize AI service
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      aiService.current = new AIAdvisorService();
    }
  }, []);

  // Update current deal when initialDeal changes
  useEffect(() => {
    if (initialDeal) {
      setCurrentDeal(initialDeal);
      // Add a message showing the loaded deal
      const loadedMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `📋 Loaded deal from form: ${initialDeal.simQuantity} SIMs in ${initialDeal.countries?.join(', ')} with ${initialDeal.monthlyDataPerSim}GB/month at ${initialDeal.currency === 'USD' ? '$' : '€'}${initialDeal.proposedPricePerSim}/SIM. You can modify or evaluate this deal.`,
        timestamp: new Date(),
        dealData: initialDeal
      };
      setMessages(prev => [...prev, loadedMessage]);
    }
  }, [initialDeal]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const parseDealFromText = (text: string): Partial<DealRequest> => {
    const deal: Partial<DealRequest> = {};
    const lowerText = text.toLowerCase();
    
    // Extract SIM quantity
    const simMatch = lowerText.match(/(\d+)\s*(?:sim|device|unit)/i);
    if (simMatch) {
      deal.simQuantity = parseInt(simMatch[1]);
    }
    
    // Extract data amount
    const dataMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:gb|gigabyte|mb|megabyte)/i);
    if (dataMatch) {
      const amount = parseFloat(dataMatch[1]);
      if (lowerText.includes('mb') || lowerText.includes('megabyte')) {
        deal.monthlyDataPerSim = amount / 1024; // Convert MB to GB
      } else {
        deal.monthlyDataPerSim = amount;
      }
    }
    
    // Extract price
    const priceMatch = text.match(/\$(\d+(?:\.\d+)?)|€(\d+(?:\.\d+)?)/);
    if (priceMatch) {
      deal.proposedPricePerSim = parseFloat(priceMatch[1] || priceMatch[2]);
      deal.currency = priceMatch[1] ? 'USD' : 'EUR';
    }
    
    // Extract usage percentages (e.g., "80% UK usage", "70% netherlands")
    const usageMatch = text.match(/(\d+)%\s+(\w+)\s+(?:usage|time)/gi);
    if (usageMatch) {
      deal.usagePercentages = {};
      usageMatch.forEach(match => {
        const parts = match.match(/(\d+)%\s+(\w+)/i);
        if (parts) {
          const percentage = parseInt(parts[1]);
          const country = parts[2];
          // Map to proper country name
          availableCountries.forEach(c => {
            if (c.toLowerCase().includes(country.toLowerCase()) || 
                (country.toLowerCase() === 'uk' && c === 'United Kingdom') ||
                (country.toLowerCase() === 'us' && c === 'United States')) {
              deal.usagePercentages![c] = percentage;
            }
          });
        }
      });
    }
    
    // Extract countries dynamically from available countries
    const countries: string[] = [];
    availableCountries.forEach(country => {
      const countryLower = country.toLowerCase();
      // Check for country name in text
      if (lowerText.includes(countryLower)) {
        countries.push(country);
      }
      // Special cases and aliases
      else if (country === 'United States' && (lowerText.includes(' us ') || lowerText.includes('america') || lowerText.includes('usa'))) {
        countries.push(country);
      }
      else if (country === 'United Kingdom' && (lowerText.includes(' uk ') || lowerText.includes('britain') || lowerText.includes('england'))) {
        countries.push(country);
      }
      else if (country === 'Netherlands' && lowerText.includes('holland')) {
        countries.push(country);
      }
      else if (country === 'United Arab Emirates' && (lowerText.includes('uae') || lowerText.includes('dubai'))) {
        countries.push(country);
      }
    });
    if (countries.length > 0) deal.countries = countries;
    
    // Extract carriers dynamically from available networks
    const carriers: string[] = [];
    availableNetworks.forEach(network => {
      const networkLower = network.toLowerCase();
      // Direct match
      if (lowerText.includes(networkLower)) {
        carriers.push(network);
      }
      // Special cases
      else if (network.toLowerCase().includes('at&t') && (lowerText.includes('at&t') || lowerText.includes('att'))) {
        carriers.push(network);
      }
      else if (network.toLowerCase().includes('t-mobile') && (lowerText.includes('t-mobile') || lowerText.includes('tmobile'))) {
        carriers.push(network);
      }
      else if (network.toLowerCase().includes('telefonica') && (lowerText.includes('telefonica') || lowerText.includes('o2'))) {
        carriers.push(network);
      }
    });
    if (carriers.length > 0) deal.carriers = carriers;
    
    // Check for IoT technologies
    if (lowerText.includes('iot') || lowerText.includes('cat-m') || lowerText.includes('lte-m') || 
        lowerText.includes('nb-iot') || lowerText.includes('narrowband')) {
      deal.requiresIoT = true;
      if (lowerText.includes('cat-m') || lowerText.includes('lte-m') || lowerText.includes('cat m')) {
        deal.iotType = 'CAT-M';
      } else if (lowerText.includes('nb-iot') || lowerText.includes('narrowband') || lowerText.includes('nb iot')) {
        deal.iotType = 'NB-IoT';
      } else if (lowerText.includes('both') || (lowerText.includes('cat-m') && lowerText.includes('nb-iot'))) {
        deal.iotType = 'both';
      } else {
        deal.iotType = 'CAT-M'; // Default to CAT-M if just "IoT" is mentioned
      }
    }
    
    // Default values
    deal.duration = 12; // Default 12 month contract
    deal.isNewCustomer = true;
    deal.expectedUsagePattern = 'medium';
    
    return deal;
  };

  const askClarifyingQuestions = (deal: Partial<DealRequest>): string[] => {
    const questions = [];
    
    if (!deal.simQuantity) {
      questions.push("How many SIMs do you need?");
    }
    if (!deal.countries || deal.countries.length === 0) {
      questions.push("Which countries will the SIMs be used in?");
    }
    if (!deal.monthlyDataPerSim) {
      questions.push("How much data per SIM per month (in GB)?");
    }
    if (!deal.proposedPricePerSim) {
      questions.push("What's your target price per SIM per month?");
    }
    if (!deal.carriers || deal.carriers.length === 0) {
      questions.push("Do you have any specific carrier requirements?");
    }
    
    return questions;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Parse deal information from the message
      const parsedDeal = parseDealFromText(input);
      
      // Check if user is modifying existing deal
      const isModifying = messages.some(m => m.evaluation) && 
                         (input.toLowerCase().includes('change') || 
                          input.toLowerCase().includes('modify') || 
                          input.toLowerCase().includes('update') ||
                          input.toLowerCase().includes('what if'));
      
      // If modifying, merge with current deal, otherwise use parsed deal
      const updatedDeal = isModifying 
        ? { ...currentDeal, ...parsedDeal }
        : { ...currentDeal, ...parsedDeal };
      
      setCurrentDeal(updatedDeal);

      // Check if we need more information
      const questions = askClarifyingQuestions(updatedDeal);
      
      if (questions.length > 0) {
        // Ask clarifying questions
        const questionMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I need a few more details to evaluate this deal:\n\n${questions.map(q => `• ${q}`).join('\n')}`,
          timestamp: new Date(),
          dealData: updatedDeal
        };
        setMessages(prev => [...prev, questionMessage]);
      } else {
        // We have enough info, evaluate the deal
        const evaluation = await evaluationService.current.evaluateDeal(updatedDeal as DealRequest);
        
        // Create evaluation response
        let responseContent = formatEvaluationResponse(evaluation, updatedDeal as DealRequest);
        
        const evaluationMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          evaluation,
          dealData: updatedDeal
        };
        setMessages(prev => [...prev, evaluationMessage]);
        
        // Don't reset currentDeal to maintain context
        // setCurrentDeal({});
      }
    } catch (error) {
      console.error('Error processing deal:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error evaluating your deal. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatEvaluationResponse = (evaluation: DealEvaluation, deal: DealRequest): string => {
    const currencySymbol = deal.currency === 'USD' ? '$' : '€';
    const exchangeRate = deal.currency === 'USD' ? 1.1 : 1;
    
    if (evaluation.verdict === 'approved') {
      // APPROVED DEAL
      let response = `✅ **GREAT NEWS! This deal is profitable!**\n\n`;
      response += `**Margin:** ${(evaluation.profitMargin * 100).toFixed(1)}% (${currencySymbol}${evaluation.totalMonthlyProfit.toLocaleString()}/month profit)\n\n`;
      
      response += `**Winning formula:**\n`;
      response += `• ${deal.simQuantity.toLocaleString()} SIMs @ ${currencySymbol}${deal.proposedPricePerSim}/SIM\n`;
      response += `• Cost: ${currencySymbol}${(evaluation.totalCostPerSim * exchangeRate).toFixed(2)}/SIM\n`;
      response += `• Profit: ${currencySymbol}${(evaluation.grossProfitPerSim * exchangeRate).toFixed(2)}/SIM\n\n`;
      
      if (evaluation.carrierOptions && evaluation.carrierOptions.length > 0) {
        response += `**Recommended networks:**\n`;
        const byCountry = new Map<string, typeof evaluation.carrierOptions>();
        evaluation.carrierOptions.forEach(c => {
          if (!byCountry.has(c.country)) byCountry.set(c.country, []);
          byCountry.get(c.country)!.push(c);
        });
        byCountry.forEach((carriers, country) => {
          const best = carriers[0];
          response += `• ${country}: ${best.carrier} (€${(best.dataRate * 1024).toFixed(2)}/GB)\n`;
        });
      }
      
      response += `\n🎯 **Ready to close this deal!**`;
      
      return response;
    }
    
    // NOT PROFITABLE - Provide specific suggestions
    let response = evaluation.verdict === 'negotiable' 
      ? `⚠️ **Close, but needs optimization** (Current margin: ${(evaluation.profitMargin * 100).toFixed(1)}%)\n\n`
      : `❌ **Not profitable yet** (Current margin: ${(evaluation.profitMargin * 100).toFixed(1)}%)\n\n`;
    
    response += `**Current setup:** ${deal.simQuantity} SIMs × ${deal.monthlyDataPerSim}GB @ ${currencySymbol}${deal.proposedPricePerSim}/SIM\n`;
    response += `**Problem:** Cost (${currencySymbol}${(evaluation.totalCostPerSim * exchangeRate).toFixed(2)}) > Revenue (${currencySymbol}${evaluation.revenuePerSim.toFixed(2)})\n\n`;
    
    response += `**Let's fix this! Try one of these:**\n\n`;
    
    // Price adjustment suggestion
    if (evaluation.recommendedPrice) {
      const priceIncrease = ((evaluation.recommendedPrice - deal.proposedPricePerSim) / deal.proposedPricePerSim * 100).toFixed(0);
      response += `💰 **Option 1: Adjust pricing**\n`;
      response += `   Increase to ${currencySymbol}${evaluation.recommendedPrice.toFixed(2)}/SIM (+${priceIncrease}%)\n`;
      response += `   Say: "Change price to ${currencySymbol}${evaluation.recommendedPrice.toFixed(2)}"\n\n`;
    }
    
    // Network optimization suggestion
    if (evaluation.carrierOptions && evaluation.carrierOptions.length > 0) {
      const expensiveCountries = [...new Set(evaluation.carrierOptions
        .filter(c => c.dataRate * 1024 > 5)
        .map(c => c.country))];
      
      if (expensiveCountries.length > 0) {
        response += `🌍 **Option 2: Optimize coverage**\n`;
        response += `   Remove expensive countries: ${expensiveCountries.join(', ')}\n`;
        response += `   Say: "Remove ${expensiveCountries[0]}"\n\n`;
      }
      
      // Usage percentage suggestion
      const cheapestCountry = evaluation.carrierOptions.reduce((min, c) => 
        c.dataRate < min.dataRate ? c : min
      ).country;
      
      response += `📊 **Option 3: Add usage limits**\n`;
      response += `   Limit roaming - e.g., "80% usage in ${cheapestCountry}, 20% roaming"\n`;
      response += `   Say: "Add 80% ${cheapestCountry} usage limit"\n\n`;
    }
    
    // Volume suggestion
    response += `📈 **Option 4: Increase volume**\n`;
    const newVolume = deal.simQuantity >= 1000 ? deal.simQuantity * 2 : 1000;
    response += `   More SIMs = better rates. Try ${newVolume.toLocaleString()} SIMs\n`;
    response += `   Say: "Change to ${newVolume} SIMs"\n\n`;
    
    response += `💡 **Quick actions:** Type any of the suggestions above, or combine them!`;
    
    return response;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Messages - Clean Apple Style */}

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white shadow-md'
                    : message.role === 'system'
                    ? 'bg-amber-50 border border-amber-100 text-amber-900'
                    : 'bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-900 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </div>
                
                {message.evaluation && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      {message.evaluation.verdict === 'approved' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {message.evaluation.verdict === 'negotiable' && (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      {message.evaluation.verdict === 'rejected' && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="text-xs font-medium">
                        Risk Score: {message.evaluation.riskScore}/100
                      </span>
                    </div>
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
            <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">Analyzing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Apple Style */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-gray-100 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your deal (e.g., '1000 SIMs in US, AT&T, 1GB at $2/month')..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-3 h-3 text-gray-400" />
            <span>Platform: €{dealConfig.platformCosts.activeSIMCost}/SIM • Target: {(dealConfig.margins.minimum * 100)}% margin</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-3 h-3 text-gray-400" />
            <span>Live pricing data</span>
          </div>
        </div>
      </div>
    </div>
  );
};