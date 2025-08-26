import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

// Initialize Gemini AI - API key should be stored in environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

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
}

export class AIAdvisorService {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  async processNaturalLanguageQuery(query: string): Promise<{
    answer: string;
    data?: any[];
    sqlQuery?: string;
    confidence: number;
  }> {
    try {
      // First, get the database schema context
      const schemaContext = `
        You are an AI assistant for a telecom pricing database. The database contains network pricing information with the following structure:
        
        Table: networks
        Columns:
        - network_name: string (network/carrier name)
        - country: string (country name - use full names like "United Kingdom" not "UK")
        - tadig: string (TADIG code)
        - operator: string (operator source: A1, Telefonica, Tele2, Monogoto)
        - data_cost: number (cost per MB in euros)
        - sms_cost: number (cost per SMS in euros)
        - imsi_cost: number (IMSI fee in euros)
        - lte_m: boolean (supports CAT-M/LTE-M IoT technology)
        - nb_iot: boolean (supports NB-IoT technology)
        - notes: string (additional notes)
        
        Important context:
        - When user says "UK", they mean "United Kingdom" - ALWAYS filter by country = 'United Kingdom'
        - When user asks for "best price", "best deal", or "good price", find the LOWEST cost option
        - Data prices are per MB, so multiply by 1024 to get price per GB
        - ALWAYS provide specific network names and operators when discussing prices
        - For best price queries, sort by data_cost ascending and show the cheapest option first
        - Include the operator source (A1, Telefonica, Tele2) in your response
        - If asking about UK, focus ONLY on United Kingdom networks, not global data
        
        IoT Context:
        - CAT-M, Cat-M, CATM, LTE-M all refer to the same IoT technology (lte_m field)
        - NB-IoT, NBIOT refer to Narrowband IoT technology (nb_iot field)
        - When asked about IoT networks, check both lte_m and nb_iot fields
        - If no networks have IoT flags set to true, still provide the best available networks
        - Many modern networks support IoT even if not explicitly flagged in our database
        
        User Query: ${query}
        
        Based on this query, provide:
        1. A detailed natural language answer with specific network names and operators
        2. The relevant SQL query to fetch the data
        3. Key insights from the data, including which specific operator offers the best price
        
        IMPORTANT: If the user asks for IoT/CAT-M/NB-IoT networks and none are found with those flags,
        still provide the best available network options and note that explicit IoT support isn't marked
        but the networks may still support IoT devices.
        
        Format your response as JSON with fields: answer, sqlQuery, insights
      `;

      console.log('Sending query to Gemini:', query);
      const result = await this.model.generateContent(schemaContext);
      const response = result.response;
      const text = response.text();
      
      // Parse the AI response
      let aiResponse;
      try {
        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResponse = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback parsing
          aiResponse = {
            answer: text,
            sqlQuery: this.buildFallbackQuery(query),
            insights: []
          };
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.log('Raw AI response:', text);
        aiResponse = {
          answer: text,
          sqlQuery: this.buildFallbackQuery(query),
          insights: []
        };
      }
      
      // IMPORTANT: Don't trust Gemini's answer about data availability
      // Always execute the query to get real data
      console.log('AI suggested SQL:', aiResponse.sqlQuery);

      // Execute the SQL query to get REAL data
      let data: any[] = [];
      try {
        // Always execute our structured query based on the user's intent
        const queryResult = await this.executeStructuredQuery(query);
        data = queryResult.data || [];
        console.log(`Found ${data.length} networks from database`);
        
        // ALWAYS generate answer based on ACTUAL data, not Gemini's assumptions
        // This ensures we provide helpful results even for IoT queries
        if (data && data.length > 0) {
          const customAnswer = await this.generateAnswerFromData(data, query);
          console.log('Generated custom answer based on actual data');
          return {
            answer: customAnswer,
            data,
            sqlQuery: aiResponse.sqlQuery,
            confidence: this.calculateConfidence(query, data)
          };
        } else {
          aiResponse.answer = 'No data found for your query. Please try a different search.';
        }
      } catch (queryError) {
        console.error('Error executing query:', queryError);
        // Fall back to Gemini's response if query fails
      }

      return {
        answer: aiResponse.answer,
        data,
        sqlQuery: aiResponse.sqlQuery,
        confidence: this.calculateConfidence(query, data)
      };
    } catch (error) {
      console.error('Error processing AI query:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      
      // Fallback to rule-based processing
      return this.fallbackProcessing(query);
    }
  }

  private async executeStructuredQuery(originalQuery: string) {
    const lowerQuery = originalQuery.toLowerCase();
    
    // Use the same query structure as PricingTable for consistency
    let queryBuilder = supabase
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
      `);

    // Handle country queries - check for any country name
    // Be more specific with UK matching to avoid false positives
    if (lowerQuery.includes('israel')) {
      queryBuilder = queryBuilder.eq('country', 'Israel');
    } else if (lowerQuery.match(/\buk\b/) || lowerQuery.includes('united kingdom') || 
        lowerQuery.includes('britain') || lowerQuery.includes('england')) {
      queryBuilder = queryBuilder.eq('country', 'United Kingdom');
    } else if (lowerQuery.includes('germany')) {
      queryBuilder = queryBuilder.eq('country', 'Germany');
    } else if (lowerQuery.includes('france')) {
      queryBuilder = queryBuilder.eq('country', 'France');
    } else if (lowerQuery.includes('spain')) {
      queryBuilder = queryBuilder.eq('country', 'Spain');
    } else if (lowerQuery.includes('italy')) {
      queryBuilder = queryBuilder.eq('country', 'Italy');
    } else if (lowerQuery.includes('usa') || lowerQuery.includes('united states') || lowerQuery.includes('america')) {
      queryBuilder = queryBuilder.or('country.eq.USA,country.eq.United States');
    } else if (lowerQuery.includes('canada')) {
      queryBuilder = queryBuilder.eq('country', 'Canada');
    } else if (lowerQuery.includes('japan')) {
      queryBuilder = queryBuilder.eq('country', 'Japan');
    } else if (lowerQuery.includes('china')) {
      queryBuilder = queryBuilder.eq('country', 'China');
    } else if (lowerQuery.includes('india')) {
      queryBuilder = queryBuilder.eq('country', 'India');
    } else if (lowerQuery.includes('brazil')) {
      queryBuilder = queryBuilder.eq('country', 'Brazil');
    } else if (lowerQuery.includes('australia')) {
      queryBuilder = queryBuilder.eq('country', 'Australia');
    }
    // Apply filters based on the query intent
    else if (lowerQuery.includes('europe')) {
      queryBuilder = queryBuilder.in('country', [
        'Germany', 'France', 'Italy', 'Spain', 'United Kingdom', 'Netherlands', 
        'Belgium', 'Poland', 'Austria', 'Switzerland', 'Sweden', 'Norway'
      ]);
    } else if (lowerQuery.includes('asia')) {
      queryBuilder = queryBuilder.in('country', [
        'Japan', 'China', 'India', 'Singapore', 'South Korea', 
        'Thailand', 'Indonesia', 'Malaysia', 'Philippines', 'Vietnam'
      ]);
    }

    // IoT filters are handled differently since they're nested
    // We'll filter these in post-processing after getting the data

    // Don't limit here - we'll sort and filter in post-processing

    return await queryBuilder;
  }

  private async generateAnswerFromData(data: any[], query: string): Promise<string> {
    const lowerQuery = query.toLowerCase();
    
    // Transform the nested data structure
    const networks: any[] = [];
    data.forEach(network => {
      network.network_pricing?.forEach((pricing: any) => {
        networks.push({
          network_name: network.network_name,
          country: network.country,
          tadig: network.tadig,
          operator: pricing.pricing_sources?.source_name || 'Unknown',
          data_cost: pricing.data_per_mb,
          sms_cost: pricing.sms_mo || pricing.sms_mt,
          imsi_cost: pricing.imsi_access_fee,
          lte_m: pricing.lte_m,
          nb_iot: pricing.nb_iot,
          notes: pricing.notes
        });
      });
    });
    
    if (networks.length === 0) {
      return 'No pricing data available for this query.';
    }
    
    // Check if this is an IoT-specific query
    const isIoTQuery = lowerQuery.includes('cat-m') || lowerQuery.includes('catm') || 
                       lowerQuery.includes('cat m') || lowerQuery.includes('lte-m') || 
                       lowerQuery.includes('nb-iot') || lowerQuery.includes('nbiot') || 
                       lowerQuery.includes('iot');
    
    // Apply IoT filters if specified - but be more intelligent about it
    let filteredNetworks = networks;
    let iotFilterApplied = false;
    let iotType = '';
    
    if (lowerQuery.includes('cat-m') || lowerQuery.includes('catm') || lowerQuery.includes('cat m') || lowerQuery.includes('lte-m')) {
      const iotNetworks = networks.filter(n => n.lte_m === true);
      iotType = 'CAT-M/LTE-M';
      if (iotNetworks.length > 0) {
        filteredNetworks = iotNetworks;
        iotFilterApplied = true;
      }
    } else if (lowerQuery.includes('nb-iot') || lowerQuery.includes('nbiot')) {
      const iotNetworks = networks.filter(n => n.nb_iot === true);
      iotType = 'NB-IoT';
      if (iotNetworks.length > 0) {
        filteredNetworks = iotNetworks;
        iotFilterApplied = true;
      }
    } else if (lowerQuery.includes('iot')) {
      const iotNetworks = networks.filter(n => n.lte_m === true || n.nb_iot === true);
      iotType = 'IoT';
      if (iotNetworks.length > 0) {
        filteredNetworks = iotNetworks;
        iotFilterApplied = true;
      }
    }
    
    // Generate answer based on query type
    if (lowerQuery.includes('best') || lowerQuery.includes('cheap') || lowerQuery.includes('lowest') || lowerQuery.includes('good price')) {
      // Find best price
      const validNetworks = filteredNetworks.filter(n => n.data_cost && n.data_cost > 0);
      if (validNetworks.length === 0) {
        // If no IoT networks found but IoT was requested, show regular networks instead
        if (isIoTQuery && !iotFilterApplied && networks.length > 0) {
          const regularNetworks = networks.filter(n => n.data_cost && n.data_cost > 0);
          if (regularNetworks.length > 0) {
            regularNetworks.sort((a, b) => a.data_cost - b.data_cost);
            const best = regularNetworks[0];
            const country = best.country;
            
            let answer = `📍 **${iotType} Network Status in ${country}:**\n\n`;
            answer += `⚠️ No networks with explicit ${iotType} support found in ${country}.\n\n`;
            answer += `However, here are the best available network prices that may support IoT devices:\n\n`;
            answer += `🏆 **Best available option**: ${best.network_name} (${best.operator})\n`;
            answer += `   • €${best.data_cost.toFixed(4)}/MB (€${(best.data_cost * 1024).toFixed(2)}/GB)\n`;
            answer += `   • TADIG: ${best.tadig}\n\n`;
            
            if (regularNetworks.length > 1) {
              answer += `**Other options:**\n`;
              regularNetworks.slice(1, 4).forEach((network, idx) => {
                const priceGB = network.data_cost * 1024;
                answer += `${idx + 2}. ${network.network_name} (${network.operator}): €${priceGB.toFixed(2)}/GB\n`;
              });
            }
            
            answer += `\n💡 **Note**: While these networks don't explicitly advertise ${iotType} support, many modern networks support IoT connectivity. Contact the operator for specific IoT capabilities.`;
            answer += `\n\n📊 Total networks analyzed in ${country}: ${regularNetworks.length}`;
            return answer;
          }
        }
        return 'No pricing data available for the requested networks.';
      }
      
      validNetworks.sort((a, b) => a.data_cost - b.data_cost);
      const best = validNetworks[0];
      const country = best.country;
      
      // Build answer with IoT context if applicable
      let answer = '';
      if (iotFilterApplied) {
        answer = `📍 **Best ${iotType} prices in ${country}:**\n\n`;
      } else if (isIoTQuery) {
        answer = `📍 **Best prices in ${country} (for ${iotType} devices):**\n\n`;
      } else {
        answer = `📍 **Best prices in ${country}:**\n\n`;
      }
      answer += `🏆 **Cheapest data**: ${best.network_name} (${best.operator})\n`;
      answer += `   • €${best.data_cost.toFixed(4)}/MB (€${(best.data_cost * 1024).toFixed(2)}/GB)\n`;
      answer += `   • TADIG: ${best.tadig}\n`;
      
      // Add IoT technology info
      if (best.lte_m || best.nb_iot) {
        answer += `   • IoT Support: `;
        const techs = [];
        if (best.lte_m) techs.push('CAT-M/LTE-M');
        if (best.nb_iot) techs.push('NB-IoT');
        answer += techs.join(', ') + '\n';
      }
      answer += '\n';
      
      // Show top 3 options
      if (validNetworks.length > 1) {
        answer += `**Other competitive options:**\n`;
        validNetworks.slice(1, 4).forEach((network, idx) => {
          const priceGB = network.data_cost * 1024;
          answer += `${idx + 2}. ${network.network_name} (${network.operator}): €${priceGB.toFixed(2)}/GB\n`;
        });
      }
      
      // Add SMS and IMSI info if available
      const bestSMS = validNetworks.filter(n => n.sms_cost && n.sms_cost > 0)
        .sort((a, b) => a.sms_cost - b.sms_cost)[0];
      const bestIMSI = validNetworks.filter(n => n.imsi_cost && n.imsi_cost > 0)
        .sort((a, b) => a.imsi_cost - b.imsi_cost)[0];
      
      if (bestSMS) {
        answer += `\n📱 **Cheapest SMS**: ${bestSMS.network_name} (${bestSMS.operator}) - €${bestSMS.sms_cost.toFixed(3)}\n`;
      }
      if (bestIMSI) {
        answer += `💳 **Lowest IMSI fee**: ${bestIMSI.network_name} (${bestIMSI.operator}) - €${bestIMSI.imsi_cost.toFixed(2)}\n`;
      }
      
      // Add IoT summary if applicable
      if (lowerQuery.includes('iot') || lowerQuery.includes('cat-m') || lowerQuery.includes('nb-iot')) {
        const totalInCountry = networks.length;
        const iotPercent = Math.round((validNetworks.length / totalInCountry) * 100);
        answer += `\n📊 IoT Coverage: ${validNetworks.length} IoT networks out of ${totalInCountry} total (${iotPercent}%)`;
      } else {
        answer += `\n📊 Total networks analyzed: ${validNetworks.length}`;
      }
      return answer;
    }
    
    // Default response
    const countries = [...new Set(filteredNetworks.map(n => n.country))];
    if (lowerQuery.includes('iot') || lowerQuery.includes('cat-m') || lowerQuery.includes('nb-iot')) {
      const catMCount = filteredNetworks.filter(n => n.lte_m).length;
      const nbIotCount = filteredNetworks.filter(n => n.nb_iot).length;
      return `Found ${filteredNetworks.length} IoT-enabled networks (${catMCount} CAT-M, ${nbIotCount} NB-IoT) across ${countries.length} countries. Please be more specific about what you'd like to know.`;
    }
    return `Found ${filteredNetworks.length} network pricing entries across ${countries.length} countries. Please be more specific about what you'd like to know.`;
  }
  
  private enhanceAnswerWithData(answer: string, data: any[], query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('less than') || lowerQuery.includes('under') || lowerQuery.includes('below')) {
      const priceMatch = query.match(/\$?(\d+(?:\.\d+)?)/);
      if (priceMatch && lowerQuery.includes('data')) {
        const threshold = parseFloat(priceMatch[1]);
        const pricePerGB = threshold;
        const pricePerMB = pricePerGB / 1024;
        
        const matchingNetworks = data.filter(n => {
          const dataCost = n.network_pricing?.[0]?.data_per_mb;
          return dataCost && dataCost <= pricePerMB;
        });
        const countries = [...new Set(matchingNetworks.map(n => n.country))];
        
        return `Found ${countries.length} countries with data costs under $${pricePerGB}/GB:\n\n` +
          countries.map(country => {
            const networks = matchingNetworks.filter(n => n.country === country);
            const avgPrice = networks.reduce((sum, n) => {
              const dataCost = n.network_pricing?.[0]?.data_per_mb || 0;
              return sum + dataCost * 1024;
            }, 0) / networks.length;
            return `• **${country}**: $${avgPrice.toFixed(2)}/GB (${networks.length} networks)`;
          }).join('\n') +
          '\n\n' + answer;
      }
    }

    if (lowerQuery.includes('iot')) {
      const catMNetworks = data.filter(n => n.network_pricing?.[0]?.lte_m);
      const nbIotNetworks = data.filter(n => n.network_pricing?.[0]?.nb_iot);
      const countries = [...new Set(data.map(n => n.country))];
      
      return `IoT Network Analysis:\n\n` +
        `• **CAT-M/LTE-M**: ${catMNetworks.length} networks in ${[...new Set(catMNetworks.map(n => n.country))].length} countries\n` +
        `• **NB-IoT**: ${nbIotNetworks.length} networks in ${[...new Set(nbIotNetworks.map(n => n.country))].length} countries\n` +
        `• **Coverage**: ${countries.join(', ')}\n\n` +
        answer;
    }

    return answer;
  }

  private buildFallbackQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('iot')) {
      return "SELECT * FROM networks WHERE lte_m = true OR nb_iot = true";
    }
    
    if (lowerQuery.includes('cheapest') && lowerQuery.includes('data')) {
      return "SELECT * FROM networks ORDER BY data_cost ASC LIMIT 10";
    }
    
    if (lowerQuery.includes('europe')) {
      return "SELECT * FROM networks WHERE country IN ('Germany', 'France', 'Italy', 'Spain', 'UK')";
    }
    
    return "SELECT * FROM networks LIMIT 20";
  }

  private calculateConfidence(query: string, data: any[]): number {
    // Simple confidence calculation based on query complexity and data results
    let confidence = 0.5;
    
    if (data.length > 0) confidence += 0.2;
    if (data.length > 10) confidence += 0.1;
    
    const keywords = ['price', 'cost', 'cheap', 'expensive', 'iot', 'europe', 'asia', 'data', 'sms'];
    const matchedKeywords = keywords.filter(kw => query.toLowerCase().includes(kw));
    confidence += matchedKeywords.length * 0.05;
    
    return Math.min(confidence, 0.95);
  }

  private async fallbackProcessing(query: string) {
    console.log('Using fallback processing for query:', query);
    // Fallback to rule-based processing if AI fails
    const lowerQuery = query.toLowerCase();
    
    // Use the same query structure as executeStructuredQuery
    let queryBuilder = supabase
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
      `);
    
    // Apply country filters for common queries
    if (lowerQuery.includes('israel')) {
      queryBuilder = queryBuilder.eq('country', 'Israel');
    } else if (lowerQuery.includes('uk') || lowerQuery.includes('united kingdom')) {
      queryBuilder = queryBuilder.eq('country', 'United Kingdom');
    } else if (lowerQuery.includes('germany')) {
      queryBuilder = queryBuilder.eq('country', 'Germany');
    } else if (lowerQuery.includes('france')) {
      queryBuilder = queryBuilder.eq('country', 'France');
    } else if (lowerQuery.includes('spain')) {
      queryBuilder = queryBuilder.eq('country', 'Spain');
    } else if (lowerQuery.includes('italy')) {
      queryBuilder = queryBuilder.eq('country', 'Italy');
    } else if (lowerQuery.includes('usa') || lowerQuery.includes('united states')) {
      queryBuilder = queryBuilder.or('country.eq.USA,country.eq.United States');
    } else if (lowerQuery.includes('canada')) {
      queryBuilder = queryBuilder.eq('country', 'Canada');
    } else if (lowerQuery.includes('japan')) {
      queryBuilder = queryBuilder.eq('country', 'Japan');
    } else if (lowerQuery.includes('china')) {
      queryBuilder = queryBuilder.eq('country', 'China');
    } else if (lowerQuery.includes('india')) {
      queryBuilder = queryBuilder.eq('country', 'India');
    } else if (lowerQuery.includes('brazil')) {
      queryBuilder = queryBuilder.eq('country', 'Brazil');
    } else if (lowerQuery.includes('australia')) {
      queryBuilder = queryBuilder.eq('country', 'Australia');
    } else if (lowerQuery.includes('europe')) {
      queryBuilder = queryBuilder.in('country', [
        'Germany', 'France', 'Italy', 'Spain', 'United Kingdom', 
        'Netherlands', 'Belgium', 'Poland', 'Austria', 'Switzerland'
      ]);
    }
    // Note: IoT filtering will be done in post-processing since it's nested data
    
    const { data, error } = await queryBuilder;
    
    if (error) {
      return {
        answer: 'Sorry, I encountered an error processing your query. Please try rephrasing it.',
        data: [],
        confidence: 0.2
      };
    }
    
    if (!data || data.length === 0) {
      return {
        answer: 'No networks found matching your query. Try searching for a different country or region.',
        data: [],
        confidence: 0.3
      };
    }
    
    // Transform and filter data first
    const transformedNetworks: any[] = [];
    data.forEach(network => {
      network.network_pricing?.forEach((pricing: any) => {
        transformedNetworks.push({
          network_name: network.network_name,
          country: network.country,
          tadig: network.tadig,
          operator: pricing.pricing_sources?.source_name || 'Unknown',
          data_cost: pricing.data_per_mb,
          sms_cost: pricing.sms_mo || pricing.sms_mt,
          imsi_cost: pricing.imsi_access_fee,
          lte_m: pricing.lte_m,
          nb_iot: pricing.nb_iot,
          notes: pricing.notes
        });
      });
    });
    
    // Check if this is an IoT query
    const isIoTQuery = lowerQuery.includes('cat-m') || lowerQuery.includes('catm') || 
                       lowerQuery.includes('cat m') || lowerQuery.includes('lte-m') || 
                       lowerQuery.includes('nb-iot') || lowerQuery.includes('nbiot') || 
                       lowerQuery.includes('iot');
    
    // Apply IoT filters if needed - but be intelligent about it
    let filteredNetworks = transformedNetworks;
    let iotFilterApplied = false;
    let iotType = '';
    
    if (lowerQuery.includes('cat-m') || lowerQuery.includes('catm') || lowerQuery.includes('cat m') || lowerQuery.includes('lte-m')) {
      const iotNetworks = transformedNetworks.filter(n => n.lte_m === true);
      iotType = 'CAT-M/LTE-M';
      if (iotNetworks.length > 0) {
        filteredNetworks = iotNetworks;
        iotFilterApplied = true;
      }
    } else if (lowerQuery.includes('nb-iot') || lowerQuery.includes('nbiot')) {
      const iotNetworks = transformedNetworks.filter(n => n.nb_iot === true);
      iotType = 'NB-IoT';
      if (iotNetworks.length > 0) {
        filteredNetworks = iotNetworks;
        iotFilterApplied = true;
      }
    } else if (lowerQuery.includes('iot')) {
      const iotNetworks = transformedNetworks.filter(n => n.lte_m === true || n.nb_iot === true);
      iotType = 'IoT';
      if (iotNetworks.length > 0) {
        filteredNetworks = iotNetworks;
        iotFilterApplied = true;
      }
    }
    
    // Process the data based on query type
    let answer = '';
    if (lowerQuery.includes('best') || lowerQuery.includes('cheap') || lowerQuery.includes('good price')) {
      // Find best prices
      const networksWithPricing = filteredNetworks.filter(n => n.data_cost && n.data_cost > 0);
      
      if (networksWithPricing.length > 0) {
        // Sort by price
        networksWithPricing.sort((a, b) => a.data_cost - b.data_cost);
        
        const best = networksWithPricing[0];
        const country = best.country;
        
        // Build answer with IoT context
        if (iotFilterApplied) {
          answer = `Best ${iotType} price in ${country}:\n\n`;
        } else if (isIoTQuery) {
          answer = `Best price in ${country} (for ${iotType} devices):\n\n`;
          answer += `⚠️ No networks with explicit ${iotType} support found.\n`;
          answer += `Showing best available network prices:\n\n`;
        } else {
          answer = `Best price in ${country}:\n\n`;
        }
        
        answer += `🏆 **${best.network_name}** (${best.operator})\n`;
        answer += `   • Data: €${best.data_cost.toFixed(4)}/MB (€${(best.data_cost * 1024).toFixed(2)}/GB)\n`;
        answer += `   • TADIG: ${best.tadig}\n`;
        
        // Add IoT info
        if (best.lte_m || best.nb_iot) {
          answer += `   • IoT Support: `;
          const techs = [];
          if (best.lte_m) techs.push('CAT-M/LTE-M');
          if (best.nb_iot) techs.push('NB-IoT');
          answer += techs.join(', ') + '\n';
        }
        answer += '\n';
        
        if (networksWithPricing.length > 1) {
          answer += `Other options:\n`;
          networksWithPricing.slice(1, 4).forEach((n, i) => {
            answer += `${i + 2}. ${n.network_name}: €${(n.data_cost * 1024).toFixed(2)}/GB`;
            if (n.lte_m || n.nb_iot) {
              const techs = [];
              if (n.lte_m) techs.push('CAT-M');
              if (n.nb_iot) techs.push('NB-IoT');
              answer += ` (${techs.join('/')})`;
            }
            answer += '\n';
          });
        }
      } else {
        // If no IoT networks found but IoT was requested, show regular networks
        if (isIoTQuery && !iotFilterApplied && transformedNetworks.length > 0) {
          const regularNetworks = transformedNetworks.filter(n => n.data_cost && n.data_cost > 0);
          if (regularNetworks.length > 0) {
            regularNetworks.sort((a, b) => a.data_cost - b.data_cost);
            const best = regularNetworks[0];
            const country = best.country;
            
            answer = `${iotType} Network Status in ${country}:\n\n`;
            answer += `⚠️ No networks with explicit ${iotType} support found.\n`;
            answer += `However, here are the best available network prices:\n\n`;
            answer += `🏆 **${best.network_name}** (${best.operator})\n`;
            answer += `   • Data: €${best.data_cost.toFixed(4)}/MB (€${(best.data_cost * 1024).toFixed(2)}/GB)\n`;
            answer += `   • TADIG: ${best.tadig}\n\n`;
            
            if (regularNetworks.length > 1) {
              answer += `Other options:\n`;
              regularNetworks.slice(1, 4).forEach((n, i) => {
                answer += `${i + 2}. ${n.network_name}: €${(n.data_cost * 1024).toFixed(2)}/GB\n`;
              });
            }
            
            answer += `\n💡 Note: Contact operators for specific IoT capabilities.`;
          } else {
            answer = `Found ${transformedNetworks.length} networks but no pricing data available.`;
          }
        } else {
          answer = `Found ${transformedNetworks.length} networks but no pricing data available.`;
        }
      }
    } else {
      answer = `Found ${transformedNetworks.length} networks. Please be more specific about what you'd like to know.`;
    }
    
    return {
      answer,
      data: data || [],
      confidence: 0.4
    };
  }

  async getSuggestions(context: string): Promise<string[]> {
    const prompt = `
      Given the context of a telecom pricing database query: "${context}"
      
      Suggest 3 follow-up questions that would help analyze pricing data.
      Focus on practical business questions about costs, coverage, and optimization.
      
      Return as JSON array of strings.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }

    // Fallback suggestions
    return [
      'What data volume and expected monthly usage are we considering for this CAT M deployment in the UK?',
      'Can you provide details on the desired geographic coverage in the UK (specific regions or postcode areas) to assess the impact on pricing and network availability?',
      'What are our cost optimization priorities – lowest upfront cost, lowest ongoing monthly cost, or a balance between the two, taking into account potential variations in coverage and data allowances across different providers?'
    ];
  }
}