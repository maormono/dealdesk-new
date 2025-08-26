import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAZw1oOCupKS_Oz3a62i4JvV2JvQSlDIic';

async function testLatestGemini() {
  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash', 
    'gemini-1.5-flash'
  ];
  
  for (const modelName of models) {
    try {
      console.log(`\nTesting ${modelName}...`);
      console.log('=' .repeat(50));
      
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100
        }
      });
      
      const result = await model.generateContent('What is 2+2? Answer in one word.');
      const response = result.response;
      const text = response.text();
      
      console.log(`✅ ${modelName} works!`);
      console.log(`Response: ${text.trim()}`);
      
    } catch (error) {
      console.log(`❌ ${modelName} failed:`, error.message);
    }
  }
}

testLatestGemini();