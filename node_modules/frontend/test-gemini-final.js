import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAZw1oOCupKS_Oz3a62i4JvV2JvQSlDIic';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function testGemini() {
  try {
    console.log('Testing Gemini 1.5 Flash with Israel query...\n');
    
    const prompt = `
      You are an AI assistant for a telecom pricing database. The database contains network pricing information with the following structure:
      
      Table: networks
      Columns:
      - network_name: string (network/carrier name)
      - country: string (country name - use full names like "United Kingdom" not "UK", "Israel" not "IL")
      - tadig: string (TADIG code)
      - operator: string (operator source: A1, Telefonica, Tele2, Monogoto)
      - data_cost: number (cost per MB in euros)
      - sms_cost: number (cost per SMS in euros)
      - imsi_cost: number (IMSI fee in euros)
      
      Important context:
      - When user says "UK", they mean "United Kingdom" - ALWAYS filter by country = 'United Kingdom'
      - When user says "best price" or "best deal", find the LOWEST cost option
      - Data prices are per MB, so multiply by 1024 to get price per GB
      - ALWAYS provide specific network names and operators when discussing prices
      - For best price queries, sort by data_cost ascending and show the cheapest option first
      - Include the operator source (A1, Telefonica, Tele2) in your response
      
      User Query: what is the best price in israel?
      
      Based on this query, provide:
      1. A detailed natural language answer with specific network names and operators
      2. The relevant SQL query to fetch the data
      3. Key insights from the data, including which specific operator offers the best price
      
      Format your response as JSON with fields: answer, sqlQuery, insights
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log('Raw response from Gemini:');
    console.log(text);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Try to parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed response:');
      console.log('Answer:', parsed.answer);
      console.log('\nSQL Query:', parsed.sqlQuery);
      console.log('\nInsights:', parsed.insights);
    }
    
  } catch (error) {
    console.error('Error calling Gemini:', error.message);
  }
}

testGemini();