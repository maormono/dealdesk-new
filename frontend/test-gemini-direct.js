import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAZw1oOCupKS_Oz3a62i4JvV2JvQSlDIic';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

async function testGemini() {
  try {
    console.log('Testing Gemini API with key:', API_KEY.substring(0, 10) + '...');
    
    const prompt = `
      You are an AI assistant for a telecom pricing database. The database contains network pricing information with the following structure:
      
      Table: networks
      Columns:
      - network_name: string (network/carrier name)
      - country: string (country name - use full names like "United Kingdom" not "UK")
      - tadig: string (TADIG code)
      - operator: string (operator source: A1, Telefonica, Tele2, Monogoto)
      - data_cost: number (cost per MB in euros)
      
      User Query: what is the best price in Israel?
      
      Based on this query, provide:
      1. A detailed natural language answer with specific network names and operators
      2. The relevant SQL query to fetch the data
      3. Key insights from the data
      
      Format your response as JSON with fields: answer, sqlQuery, insights
    `;

    console.log('\nSending prompt to Gemini...\n');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log('Raw response from Gemini:');
    console.log(text);
    
    // Try to parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('\nParsed JSON:');
      console.log(JSON.stringify(parsed, null, 2));
    }
    
  } catch (error) {
    console.error('Error calling Gemini:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      response: error.response
    });
  }
}

testGemini();