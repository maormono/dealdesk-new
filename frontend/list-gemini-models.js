import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAZw1oOCupKS_Oz3a62i4JvV2JvQSlDIic';

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    console.log('Available Gemini models:');
    if (data.models) {
      data.models.forEach(model => {
        console.log(`\n- ${model.name}`);
        console.log(`  Display Name: ${model.displayName}`);
        console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
      });
    } else {
      console.log('No models found or API key issue');
      console.log('Response:', data);
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

// Also test with the new model name
async function testNewModel() {
  try {
    console.log('\n\nTesting with gemini-1.5-flash model:');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('What is the capital of Israel?');
    const response = result.response;
    const text = response.text();
    console.log('Response:', text);
  } catch (error) {
    console.log('Error with gemini-1.5-flash:', error.message);
  }
  
  try {
    console.log('\n\nTesting with gemini-1.5-pro model:');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const result = await model.generateContent('What is the capital of Israel?');
    const response = result.response;
    const text = response.text();
    console.log('Response:', text);
  } catch (error) {
    console.log('Error with gemini-1.5-pro:', error.message);
  }
}

listModels().then(() => testNewModel());