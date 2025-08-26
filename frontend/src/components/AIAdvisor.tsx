import React, { useState } from 'react';
import { Send, Sparkles, Loader2, Bot } from 'lucide-react';
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

export const AIAdvisor: React.FC = () => {
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

  const processQuery = async (query: string): Promise<QueryResult> => {
    // Parse the query to extract key information
    const lowerQuery = query.toLowerCase();
    
    // Country abbreviations and common names - comprehensive list
    const countryMappings: Record<string, string[]> = {
      // United Kingdom variations
      'uk': ['United Kingdom', 'UK', 'Great Britain', 'Britain', 'England'],
      'gb': ['United Kingdom', 'UK', 'Great Britain', 'Britain'],
      'england': ['United Kingdom', 'UK', 'England'],
      'britain': ['United Kingdom', 'UK', 'Great Britain', 'Britain'],
      
      // USA variations
      'us': ['USA', 'United States', 'United States of America', 'US'],
      'usa': ['USA', 'United States', 'United States of America', 'US'],
      'states': ['USA', 'United States', 'United States of America'],
      'america': ['USA', 'United States', 'United States of America'],
      'united states': ['USA', 'United States', 'United States of America', 'US'],
      
      // Germany variations
      'de': ['Germany', 'Deutschland', 'DE'],
      'germany': ['Germany', 'Deutschland', 'DE'],
      'deutschland': ['Germany', 'Deutschland', 'DE'],
      
      // France variations
      'fr': ['France', 'FR'],
      'france': ['France', 'FR'],
      
      // Spain variations
      'es': ['Spain', 'España', 'ES'],
      'spain': ['Spain', 'España', 'ES'],
      'españa': ['Spain', 'España', 'ES'],
      
      // Italy variations
      'it': ['Italy', 'Italia', 'IT'],
      'italy': ['Italy', 'Italia', 'IT'],
      'italia': ['Italy', 'Italia', 'IT'],
      
      // Netherlands variations
      'nl': ['Netherlands', 'Holland', 'NL'],
      'netherlands': ['Netherlands', 'Holland', 'NL'],
      'holland': ['Netherlands', 'Holland', 'NL'],
      
      // Belgium variations
      'be': ['Belgium', 'België', 'Belgique', 'BE'],
      'belgium': ['Belgium', 'België', 'Belgique', 'BE'],
      
      // Switzerland variations
      'ch': ['Switzerland', 'Swiss', 'Schweiz', 'Suisse', 'CH'],
      'switzerland': ['Switzerland', 'Swiss', 'Schweiz', 'Suisse', 'CH'],
      'swiss': ['Switzerland', 'Swiss', 'Schweiz', 'Suisse', 'CH'],
      
      // Japan variations
      'jp': ['Japan', 'JP', '日本'],
      'japan': ['Japan', 'JP', '日本'],
      
      // China variations
      'cn': ['China', 'CN', '中国'],
      'china': ['China', 'CN', '中国'],
      
      // Singapore variations
      'sg': ['Singapore', 'SG'],
      'singapore': ['Singapore', 'SG'],
      
      // South Korea variations
      'kr': ['South Korea', 'Korea', 'KR', '한국'],
      'korea': ['South Korea', 'Korea', 'KR', '한국'],
      'south korea': ['South Korea', 'Korea', 'KR'],
      
      // Canada variations
      'ca': ['Canada', 'CA'],
      'canada': ['Canada', 'CA'],
      
      // Australia variations
      'au': ['Australia', 'AU', 'Oz'],
      'australia': ['Australia', 'AU', 'Oz'],
      'oz': ['Australia', 'AU', 'Oz'],
      
      // India variations
      'in': ['India', 'IN', 'Bharat'],
      'india': ['India', 'IN', 'Bharat'],
      
      // Brazil variations
      'br': ['Brazil', 'Brasil', 'BR'],
      'brazil': ['Brazil', 'Brasil', 'BR'],
      'brasil': ['Brazil', 'Brasil', 'BR'],
      
      // Mexico variations
      'mx': ['Mexico', 'México', 'MX'],
      'mexico': ['Mexico', 'México', 'MX'],
      'méxico': ['Mexico', 'México', 'MX'],
      
      // Russia variations
      'ru': ['Russia', 'Russian Federation', 'RU', 'Россия'],
      'russia': ['Russia', 'Russian Federation', 'RU', 'Россия'],
      
      // UAE variations
      'ae': ['UAE', 'United Arab Emirates', 'AE', 'Emirates'],
      'uae': ['UAE', 'United Arab Emirates', 'AE', 'Emirates'],
      'emirates': ['UAE', 'United Arab Emirates', 'AE', 'Emirates'],
      
      // Saudi Arabia variations
      'sa': ['Saudi Arabia', 'SA', 'KSA'],
      'saudi': ['Saudi Arabia', 'SA', 'KSA'],
      'ksa': ['Saudi Arabia', 'SA', 'KSA']
    };
    
    // Extract region/country filters
    const regions: Record<string, string[]> = {
      'europe': ['Germany', 'France', 'Italy', 'Spain', 'United Kingdom', 'Netherlands', 'Belgium', 'Poland', 'Austria', 'Switzerland'],
      'asia': ['Japan', 'China', 'India', 'Singapore', 'South Korea', 'Thailand', 'Indonesia', 'Malaysia'],
      'americas': ['USA', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile'],
      'africa': ['South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Morocco']
    };

    let countryFilter: string[] = [];
    
    // Check for specific country mentions first
    for (const [key, countryNames] of Object.entries(countryMappings)) {
      // More precise matching for abbreviations
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(query)) {
        countryFilter = countryNames;
        break;
      }
      // Also check if query contains any of the country name variations
      for (const name of countryNames) {
        if (lowerQuery.includes(name.toLowerCase())) {
          countryFilter = countryNames;
          break;
        }
      }
      if (countryFilter.length > 0) break;
    }
    
    // If no specific country, check for regions
    if (countryFilter.length === 0) {
      for (const [region, countries] of Object.entries(regions)) {
        if (lowerQuery.includes(region)) {
          countryFilter = countries;
          break;
        }
      }
    }

    // Extract price filters
    const priceMatch = lowerQuery.match(/less than \$?(\d+(?:\.\d+)?)|under \$?(\d+(?:\.\d+)?)|below \$?(\d+(?:\.\d+)?)/);
    const maxPrice = priceMatch ? parseFloat(priceMatch[1] || priceMatch[2] || priceMatch[3]) : null;

    // Extract service type
    const isDataQuery = lowerQuery.includes('data') || lowerQuery.includes('gb') || lowerQuery.includes('gigabyte');
    const isSmsQuery = lowerQuery.includes('sms');
    const isIoTQuery = lowerQuery.includes('iot') || lowerQuery.includes('cat-m') || lowerQuery.includes('nb-iot');
    const isImsiQuery = lowerQuery.includes('imsi');
    const isBestPriceQuery = lowerQuery.includes('best') || lowerQuery.includes('cheapest') || lowerQuery.includes('lowest') || lowerQuery.includes('deal');
    
    console.log('Query analysis:', {
      query: lowerQuery,
      countryFilter,
      isBestPriceQuery,
      isDataQuery
    });

    // Build and execute the query - use the same structure as PricingTable
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
    
    // Transform the data to match our interface (same as PricingTable)
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
    
    console.log('Fetched networks from database:', data?.length || 0);

    // Filter and process results based on price criteria
    let filteredData = data || [];
    let answer = '';
    
    // Debug: Log unique countries
    const uniqueCountries = [...new Set(filteredData.map(n => n.country))];
    console.log('Unique countries in data:', uniqueCountries);

    // Handle "best price" queries for specific countries
    if (isBestPriceQuery && countryFilter.length > 0) {
      console.log('Looking for best price in:', countryFilter);
      // Use partial matching for any of the country name variations
      const countryNetworks = filteredData.filter(n => {
        const countryLower = n.country.toLowerCase();
        // Check if the network's country matches any of our search variations
        return countryFilter.some(searchCountry => 
          countryLower.includes(searchCountry.toLowerCase()) ||
          searchCountry.toLowerCase().includes(countryLower)
        );
      });
      console.log('Found networks:', countryNetworks.length);
      
      const displayCountry = countryFilter[0]; // Use first variation for display
      
      if (countryNetworks.length === 0) {
        answer = `No networks found for ${displayCountry}. Available data shows ${filteredData.length} total networks. Try searching without country filter to see all available networks.`;
      } else {
        // Sort by data cost to find the best prices
        const sortedByData = [...countryNetworks]
          .filter(n => n.data_cost && n.data_cost > 0)
          .sort((a, b) => (a.data_cost || 0) - (b.data_cost || 0));
        
        if (sortedByData.length > 0) {
          const best = sortedByData[0];
          const bestPriceGB = (best.data_cost || 0) * 1024;
          
          answer = `📍 **Best prices in ${displayCountry}:**\n\n`;
          answer += `🏆 **Cheapest data**: ${best.network_name} (${best.operator})\n`;
          answer += `   • €${(best.data_cost || 0).toFixed(4)}/MB (€${bestPriceGB.toFixed(2)}/GB)\n`;
          answer += `   • TADIG: ${best.tadig}\n\n`;
          
          // Show top 3 for comparison
          if (sortedByData.length > 1) {
            answer += `**Other competitive options:**\n`;
            sortedByData.slice(1, 4).forEach((network, idx) => {
              const priceGB = (network.data_cost || 0) * 1024;
              answer += `${idx + 2}. ${network.network_name} (${network.operator}): €${priceGB.toFixed(2)}/GB\n`;
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
            answer += `\n📱 **Cheapest SMS**: ${bestSMS.network_name} (${bestSMS.operator}) - €${(bestSMS.sms_cost || 0).toFixed(3)}\n`;
          }
          
          if (bestIMSI) {
            answer += `💳 **Lowest IMSI fee**: ${bestIMSI.network_name} (${bestIMSI.operator}) - €${(bestIMSI.imsi_cost || 0).toFixed(2)}\n`;
          }
          
          answer += `\n📊 Total networks analyzed in ${displayCountry}: ${countryNetworks.length}`;
        } else {
          answer = `Found ${countryNetworks.length} networks in ${displayCountry}, but no data pricing available.`;
        }
      }
    } else if (isDataQuery && maxPrice !== null) {
      // Convert price per MB to price per GB (multiply by 1024)
      const maxPricePerMB = maxPrice / 1024;
      filteredData = filteredData.filter(n => n.data_cost && n.data_cost <= maxPricePerMB);
      
      const uniqueCountries = [...new Set(filteredData.map(n => n.country))];
      answer = `Found ${uniqueCountries.length} countries with data costs under $${maxPrice}/GB:\n\n`;
      
      uniqueCountries.forEach(country => {
        const networks = filteredData.filter(n => n.country === country);
        const avgPrice = networks.reduce((sum, n) => sum + (n.data_cost || 0) * 1024, 0) / networks.length;
        answer += `• **${country}**: Average $${avgPrice.toFixed(2)}/GB (${networks.length} networks)\n`;
      });
    } else if (isSmsQuery) {
      filteredData = filteredData.filter(n => n.sms_cost !== null && n.sms_cost !== undefined)
        .sort((a, b) => (a.sms_cost || 0) - (b.sms_cost || 0)).slice(0, 10);
      answer = `Top 10 cheapest SMS rates:\n\n`;
      filteredData.forEach(n => {
        answer += `• **${n.network_name}** (${n.country}): €${(n.sms_cost || 0).toFixed(3)} per SMS\n`;
      });
    } else if (isIoTQuery) {
      const catMNetworks = filteredData.filter(n => n.lte_m);
      const nbIotNetworks = filteredData.filter(n => n.nb_iot);
      answer = `IoT Network Coverage:\n\n`;
      answer += `**CAT-M/LTE-M**: ${catMNetworks.length} networks across ${[...new Set(catMNetworks.map(n => n.country))].length} countries\n`;
      answer += `**NB-IoT**: ${nbIotNetworks.length} networks across ${[...new Set(nbIotNetworks.map(n => n.country))].length} countries\n\n`;
      
      const topCountries = [...new Set(filteredData.map(n => n.country))].slice(0, 5);
      answer += `Top IoT countries: ${topCountries.join(', ')}`;
    } else if (isImsiQuery) {
      filteredData = filteredData.filter(n => n.imsi_cost !== null && n.imsi_cost !== undefined)
        .sort((a, b) => (a.imsi_cost || 0) - (b.imsi_cost || 0)).slice(0, 10);
      answer = `Top 10 lowest IMSI fees:\n\n`;
      filteredData.forEach(n => {
        answer += `• **${n.network_name}** (${n.country}): €${(n.imsi_cost || 0).toFixed(2)}\n`;
      });
    } else {
      // General query response - show what countries are available
      const uniqueCountries = [...new Set(filteredData.map(n => n.country))].sort();
      answer = `Found ${filteredData.length} networks across ${uniqueCountries.length} countries.\n\n`;
      
      if (countryFilter.length > 0 && filteredData.length === 0) {
        answer += `⚠️ No data found for "${countryFilter.join(', ')}". This might be because:\n`;
        answer += `• The country name doesn't match the database\n`;
        answer += `• No networks are available for this country\n\n`;
      }
      
      answer += `Available countries include: ${uniqueCountries.slice(0, 10).join(', ')}${uniqueCountries.length > 10 ? '...' : ''}\n\n`;
      answer += `Please be more specific about what you'd like to know, or try searching for one of the available countries.`;
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
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your query. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Pricing Advisor</h3>
            <p className="text-xs text-gray-500">Powered by Natural Language Analysis</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap break-words text-sm">
                {message.content}
              </div>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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