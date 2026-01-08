import React, { useState } from 'react';
import { Send, Sparkles, Loader2, Bot, Maximize2, Minimize2, Maximize } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NetworkData {
  network_name: string;
  country: string;
  tadig: string;
  operator: string;
  data_cost: number;
  sms_cost: number;
  imsi_cost: number;
  notes?: string;
  lte_m?: boolean;
  nb_iot?: boolean;
  restrictions?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QueryResult {
  answer: string;
  data?: any[];
  suggestions?: string[];
}

type ExpandState = 'normal' | 'half' | 'full';

interface AIAdvisorProps {
  currency?: 'EUR' | 'USD';
  expandState?: ExpandState;
  onToggleExpand?: () => void;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ currency = 'USD', expandState = 'normal', onToggleExpand }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you analyze pricing data. Try asking questions like:\n• "Show me countries in Europe with data cost less than $1/GB"\n• "Which operators offer IoT services?"\n• "What are the cheapest SMS rates in Asia?"',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Use setTimeout to ensure DOM is updated before scrolling
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Only scroll when user explicitly submits - no automatic scrolling

  const processQuery = async (query: string): Promise<QueryResult> => {
    // Parse the query to extract key information
    const lowerQuery = query.toLowerCase();
    
    // Build and execute the query first to get all available data
    const { data: networksData, error } = await supabase
      .from('networks')
      .select(`
        id,
        network_name,
        country,
        tadig,
        network_pricing (
          data_per_mb,
          sms_mo,
          sms_mt,
          imsi_access_fee,
          lte_m,
          nb_iot,
          notes,
          pricing_sources (
            source_name
          )
        )
      `)
      .order('country', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Transform the data to match our interface
    const transformedData: NetworkData[] = [];
    
    networksData?.forEach(network => {
      network.network_pricing?.forEach((pricing: any) => {
        transformedData.push({
          network_name: network.network_name,
          country: network.country,
          tadig: network.tadig,
          operator: pricing.pricing_sources?.source_name || 'Unknown',
          data_cost: pricing.data_per_mb || 0,
          sms_cost: pricing.sms_mo || pricing.sms_mt || 0,
          imsi_cost: pricing.imsi_access_fee || 0,
          notes: pricing.notes,
          lte_m: pricing.lte_m || false,
          nb_iot: pricing.nb_iot || false,
          restrictions: pricing.notes
        });
      });
    });
    
    const data = transformedData;
    
    // Get unique countries from actual database
    const availableCountries = [...new Set(data.map(n => n.country))].filter(Boolean);
    console.log('Available countries in database:', availableCountries.length, 'countries');
    
    // Dynamic country detection from query
    let detectedCountry: string | null = null;
    
    // Check if any country from the database is mentioned in the query
    for (const country of availableCountries) {
      // Check for exact match or partial match (case-insensitive)
      const countryLower = country.toLowerCase();
      if (lowerQuery.includes(countryLower) || 
          // Also check if country name is at word boundary
          new RegExp(`\\b${countryLower}\\b`).test(lowerQuery)) {
        detectedCountry = country;
        break;
      }
    }
    
    // Also check for common country codes (2-letter ISO codes)
    const countryCodeMatch = lowerQuery.match(/\b([a-z]{2})\b/);
    if (!detectedCountry && countryCodeMatch) {
      const code = countryCodeMatch[1].toUpperCase();
      // Try to find a country that starts with or contains this code
      detectedCountry = availableCountries.find(c => 
        c.toUpperCase().startsWith(code) || 
        c.toUpperCase().includes(code)
      ) || null;
    }

    // Extract price filters
    const priceMatch = lowerQuery.match(/less than \$?(\d+(?:\.\d+)?)|under \$?(\d+(?:\.\d+)?)|below \$?(\d+(?:\.\d+)?)/);
    const maxPrice = priceMatch ? parseFloat(priceMatch[1] || priceMatch[2] || priceMatch[3]) : null;

    // Extract service type
    const isDataQuery = lowerQuery.includes('data') || lowerQuery.includes('gb') || lowerQuery.includes('gigabyte');
    const isSmsQuery = lowerQuery.includes('sms');
    const isIoTQuery = lowerQuery.includes('iot') || lowerQuery.includes('cat-m') || lowerQuery.includes('nb-iot') || lowerQuery.includes('lte-m');
    const isImsiQuery = lowerQuery.includes('imsi');
    const isBestPriceQuery = lowerQuery.includes('best') || lowerQuery.includes('cheapest') || lowerQuery.includes('lowest') || lowerQuery.includes('deal');
    
    // Technology detection
    const technologies = {
      '2g': lowerQuery.includes('2g') || lowerQuery.includes('gsm') || lowerQuery.includes('gprs'),
      '3g': lowerQuery.includes('3g') || lowerQuery.includes('umts'),
      '4g': lowerQuery.includes('4g') || lowerQuery.includes('lte'),
      '5g': lowerQuery.includes('5g'),
      'catm': lowerQuery.includes('cat-m') || lowerQuery.includes('lte-m'),
      'nbiot': lowerQuery.includes('nb-iot') || lowerQuery.includes('nbiot')
    };
    
    console.log('Query analysis:', {
      query: lowerQuery,
      detectedCountry,
      isBestPriceQuery,
      isDataQuery,
      technologies
    });

    // Filter and process results based on price criteria
    let filteredData = data || [];
    let answer = '';

    // Handle "best price" queries for specific countries
    if (isBestPriceQuery && detectedCountry) {
      console.log('Looking for best price in:', detectedCountry);
      
      // Filter networks for the detected country
      const countryNetworks = filteredData.filter(n => 
        n.country?.toLowerCase() === detectedCountry.toLowerCase()
      );
      console.log('Found networks:', countryNetworks.length);
      
      const displayCountry = detectedCountry;
      
      if (countryNetworks.length === 0) {
        answer = `No networks found for ${displayCountry}. Available data shows ${filteredData.length} total networks. Try searching without country filter to see all available networks.`;
      } else {
        // Sort by data cost to find the best prices
        const sortedByData = [...countryNetworks]
          .filter(n => n.data_cost && n.data_cost > 0)
          .sort((a, b) => (a.data_cost || 0) - (b.data_cost || 0));
        
        if (sortedByData.length > 0) {
          const best = sortedByData[0];
          const currencySymbol = currency === 'EUR' ? '€' : '$';
          // Convert EUR to USD if needed (assuming 1.1 exchange rate)
          const exchangeRate = currency === 'USD' ? 1.1 : 1;
          const convertedDataCost = (best.data_cost || 0) * exchangeRate;
          const convertedPriceGB = convertedDataCost * 1024;
          
          answer = `📍 **Best prices in ${displayCountry}:**\n\n`;
          answer += `🏆 **Cheapest data**: ${best.network_name} (${best.operator})\n`;
          answer += `   • ${currencySymbol}${convertedDataCost.toFixed(4)}/MB (${currencySymbol}${convertedPriceGB.toFixed(2)}/GB)\n`;
          answer += `   • TADIG: ${best.tadig}\n\n`;
          
          // Show top 3 for comparison
          if (sortedByData.length > 1) {
            answer += `**Other competitive options:**\n`;
            sortedByData.slice(1, 4).forEach((network, idx) => {
              const exchangeRate = currency === 'USD' ? 1.1 : 1;
              const convertedDataCost = (network.data_cost || 0) * exchangeRate;
              const priceGB = convertedDataCost * 1024;
              const currencySymbol = currency === 'EUR' ? '€' : '$';
              answer += `${idx + 2}. ${network.network_name} (${network.operator}): ${currencySymbol}${priceGB.toFixed(2)}/GB\n`;
            });
          }
          
          // Add SMS and IMSI info if available
          const bestSMS = [...countryNetworks]
            .filter(n => n.sms_cost && n.sms_cost > 0)
            .sort((a, b) => (a.sms_cost || 0) - (b.sms_cost || 0))[0];
          
          const bestIMSI = [...countryNetworks]
            .filter(n => n.imsi_cost && n.imsi_cost > 0)
            .sort((a, b) => (a.imsi_cost || 0) - (b.imsi_cost || 0))[0];
          
          if (bestSMS) {
            const exchangeRate = currency === 'USD' ? 1.1 : 1;
            const convertedSMS = (bestSMS.sms_cost || 0) * exchangeRate;
            const currencySymbol = currency === 'EUR' ? '€' : '$';
            answer += `\n📱 **Cheapest SMS**: ${bestSMS.network_name} (${bestSMS.operator}) - ${currencySymbol}${convertedSMS.toFixed(3)}\n`;
          }
          
          if (bestIMSI) {
            const exchangeRate = currency === 'USD' ? 1.1 : 1;
            const convertedIMSI = (bestIMSI.imsi_cost || 0) * exchangeRate;
            const currencySymbol = currency === 'EUR' ? '€' : '$';
            answer += `💳 **Lowest IMSI fee**: ${bestIMSI.network_name} (${bestIMSI.operator}) - ${currencySymbol}${convertedIMSI.toFixed(2)}\n`;
          }
          
          answer += `\n📊 Total networks analyzed in ${displayCountry}: ${countryNetworks.length}`;
        } else {
          answer = `Found ${countryNetworks.length} networks in ${displayCountry}, but no data pricing available.`;
        }
      }
    } else if (isIoTQuery) {
      const catMNetworks = filteredData.filter(n => n.lte_m);
      const nbIotNetworks = filteredData.filter(n => n.nb_iot);
      answer = `IoT Network Coverage:\n\n`;
      answer += `**Cat-M/LTE-M**: ${catMNetworks.length} networks across ${[...new Set(catMNetworks.map(n => n.country))].length} countries\n`;
      answer += `**NB-IoT**: ${nbIotNetworks.length} networks across ${[...new Set(nbIotNetworks.map(n => n.country))].length} countries\n\n`;
      
      if (detectedCountry) {
        const countryIoT = filteredData.filter(n => 
          n.country?.toLowerCase() === detectedCountry.toLowerCase() && 
          (n.lte_m || n.nb_iot)
        );
        if (countryIoT.length > 0) {
          answer += `\n**IoT in ${detectedCountry}**:\n`;
          countryIoT.forEach(n => {
            const techs = [];
            if (n.lte_m) techs.push('LTE-M');
            if (n.nb_iot) techs.push('NB-IoT');
            answer += `• ${n.network_name}: ${techs.join(', ')}\n`;
          });
        }
      } else {
        const topCountries = [...new Set([...catMNetworks, ...nbIotNetworks].map(n => n.country))].slice(0, 5);
        answer += `Top IoT countries: ${topCountries.join(', ')}`;
      }
    } else if (isDataQuery && maxPrice !== null) {
      // Convert price per MB to price per GB (multiply by 1024)
      const maxPricePerMB = maxPrice / 1024;
      filteredData = filteredData.filter(n => n.data_cost && n.data_cost <= maxPricePerMB);
      
      const uniqueCountries = [...new Set(filteredData.map(n => n.country))];
      const currencySymbol = currency === 'EUR' ? '€' : '$';
      const exchangeRate = currency === 'USD' ? 1.1 : 1;
      answer = `Found ${uniqueCountries.length} countries with data costs under ${currencySymbol}${maxPrice}/GB:\n\n`;
      
      uniqueCountries.slice(0, 10).forEach(country => {
        const networks = filteredData.filter(n => n.country === country);
        const avgPrice = networks.reduce((sum, n) => sum + (n.data_cost || 0) * 1024 * exchangeRate, 0) / networks.length;
        answer += `• **${country}**: Average ${currencySymbol}${avgPrice.toFixed(2)}/GB (${networks.length} networks)\n`;
      });
      
      if (uniqueCountries.length > 10) {
        answer += `\n... and ${uniqueCountries.length - 10} more countries`;
      }
    } else if (isSmsQuery) {
      filteredData = filteredData.filter(n => n.sms_cost !== null && n.sms_cost !== undefined)
        .sort((a, b) => (a.sms_cost || 0) - (b.sms_cost || 0)).slice(0, 10);
      const currencySymbol = currency === 'EUR' ? '€' : '$';
      const exchangeRate = currency === 'USD' ? 1.1 : 1;
      answer = `Top 10 cheapest SMS rates:\n\n`;
      filteredData.forEach(n => {
        const convertedSMS = (n.sms_cost || 0) * exchangeRate;
        answer += `• **${n.network_name}** (${n.country}): ${currencySymbol}${convertedSMS.toFixed(3)} per SMS\n`;
      });
    } else if (isImsiQuery) {
      filteredData = filteredData.filter(n => n.imsi_cost !== null && n.imsi_cost !== undefined)
        .sort((a, b) => (a.imsi_cost || 0) - (b.imsi_cost || 0)).slice(0, 10);
      const currencySymbol = currency === 'EUR' ? '€' : '$';
      const exchangeRate = currency === 'USD' ? 1.1 : 1;
      answer = `Top 10 lowest IMSI fees:\n\n`;
      filteredData.forEach(n => {
        const convertedIMSI = (n.imsi_cost || 0) * exchangeRate;
        answer += `• **${n.network_name}** (${n.country}): ${currencySymbol}${convertedIMSI.toFixed(2)}\n`;
      });
    } else if (detectedCountry && !isBestPriceQuery) {
      // Handle general country queries
      const countryNetworks = filteredData.filter(n => 
        n.country?.toLowerCase() === detectedCountry.toLowerCase()
      );
      
      if (countryNetworks.length > 0) {
        answer = `📍 **${detectedCountry} Network Information:**\n\n`;
        answer += `• Total networks: ${countryNetworks.length}\n`;
        
        const avgDataCost = countryNetworks
          .filter(n => n.data_cost > 0)
          .reduce((sum, n) => sum + n.data_cost, 0) / countryNetworks.filter(n => n.data_cost > 0).length;
        
        if (avgDataCost) {
          const exchangeRate = currency === 'USD' ? 1.1 : 1;
          const convertedDataCost = avgDataCost * exchangeRate;
          const currencySymbol = currency === 'EUR' ? '€' : '$';
          answer += `• Average data cost: ${currencySymbol}${convertedDataCost.toFixed(4)}/MB (${currencySymbol}${(convertedDataCost * 1024).toFixed(2)}/GB)\n`;
        }
        
        const iotNetworks = countryNetworks.filter(n => n.lte_m || n.nb_iot);
        if (iotNetworks.length > 0) {
          answer += `• IoT-enabled networks: ${iotNetworks.length}\n`;
        }
        
        const operators = [...new Set(countryNetworks.map(n => n.operator))];
        answer += `• Operators: ${operators.slice(0, 5).join(', ')}${operators.length > 5 ? '...' : ''}`;
      } else {
        answer = `No networks found for ${detectedCountry} in the database.`;
      }
    } else {
      // General query response
      const uniqueCountries = [...new Set(filteredData.map(n => n.country))].sort();
      answer = `I can help you analyze pricing data across ${filteredData.length} networks in ${uniqueCountries.length} countries.\n\n`;
      
      answer += `**Try asking about:**\n`;
      answer += `• Specific countries (e.g., "What's the best price in Germany?")\n`;
      answer += `• Technologies (e.g., "Which networks support NB-IoT?")\n`;
      answer += `• Price comparisons (e.g., "Show data costs under $1/GB")\n`;
      answer += `• Service types (SMS, IMSI, data rates)\n\n`;
      
      answer += `**Available countries include:** ${uniqueCountries.slice(0, 15).join(', ')}${uniqueCountries.length > 15 ? '...' : ''}`;
    }

    const suggestions = [
      'Compare prices between operators',
      'Find networks with specific technologies',
      'Analyze regional pricing trends'
    ];

    return { answer, data: filteredData, suggestions };
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
      const result = await processQuery(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      // Only scroll after the full conversation is complete
      setTimeout(() => scrollToBottom(), 200);
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setTimeout(() => scrollToBottom(), 200);
    } finally {
      setLoading(false);
    }
  };

  const getHeightClass = () => {
    switch (expandState) {
      case 'normal': return 'h-[600px]';
      case 'half': return 'h-[85vh] min-h-[700px]';
      case 'full': return 'fixed inset-0 z-50';
      default: return 'h-[600px]';
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
      case 'normal': return 'Expand to half width';
      case 'half': return 'Expand to full screen';
      case 'full': return 'Return to normal size';
      default: return 'Expand';
    }
  };

  return (
    <div className={`flex flex-col ${getHeightClass()} bg-white rounded-lg shadow-sm border border-gray-200`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Pricing Advisor</h3>
              <p className="text-xs text-gray-500">Powered by Natural Language Analysis</p>
            </div>
          </div>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={getExpandTooltip()}
            >
              {getExpandIcon()}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap break-words text-sm">
                {message.content}
              </div>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-pink-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about pricing, networks, or operators..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
          <Sparkles className="w-3 h-3" />
          <span>AI analyzes your pricing database in real-time</span>
        </div>
      </form>
    </div>
  );
};