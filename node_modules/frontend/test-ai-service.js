import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Supabase
const supabaseUrl = 'https://uddmjjgnexdazfedrytt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZG1qamduZXhkYXpmZWRyeXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjQ2OTUsImV4cCI6MjA2MzM0MDY5NX0.A_034WOQ-JJ3DDvMux5fLXayJ4pUk3_WXnVTJI-wSL0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI('AIzaSyAZw1oOCupKS_Oz3a62i4JvV2JvQSlDIic');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  }
});

async function testAIService() {
  try {
    console.log('Fetching network data from Supabase...');
    
    // Fetch network data
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
      console.error('Supabase error:', error);
      return;
    }

    // Transform the data
    const networks = [];
    networksData?.forEach(network => {
      network.network_pricing?.forEach((pricing) => {
        networks.push({
          network_name: network.network_name,
          country: network.country,
          tadig: network.tadig,
          operator: pricing.pricing_sources?.source_name || 'Unknown',
          data_cost_per_mb: pricing.data_per_mb || 0,
          data_cost_per_gb: (pricing.data_per_mb || 0) * 1024,
          sms_cost: pricing.sms_mo || pricing.sms_mt || 0,
          imsi_cost: pricing.imsi_access_fee || 0,
          supports_cat_m: pricing.lte_m || false,
          supports_nb_iot: pricing.nb_iot || false,
          notes: pricing.notes
        });
      });
    });

    console.log(`Found ${networks.length} network pricing records\n`);

    // Test queries
    const queries = [
      "What are the best data prices in Finland?",
      "Show me the cheapest IoT networks with CAT-M support",
      "Which operators offer the best rates in Estonia?"
    ];
    
    for (const query of queries) {
      console.log(`\nTesting query: "${query}"`);
      console.log('=' .repeat(80));

    const systemPrompt = `
You are an expert telecom pricing advisor. You have access to a database of network pricing information.

USER QUERY: "${query}"

AVAILABLE NETWORK DATA:
${JSON.stringify(networks.slice(0, 10), null, 2)} 
... and ${networks.length - 10} more networks

INSTRUCTIONS:
1. Find the best/cheapest prices for the UK (United Kingdom)
2. Show the top 3-5 options ranked by price
3. Include operator name, network name, and TADIG codes
4. Show prices in both €/MB and €/GB for data
5. Be concise but complete

Now provide a clear, informative response to the user's query.
`;

    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const answer = response.text();

      console.log(answer);
      console.log('=' .repeat(80));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testAIService();