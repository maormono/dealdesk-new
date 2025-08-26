import { DealEvaluationService } from './src/services/dealEvaluationService.js';

const dealService = new DealEvaluationService();

async function testDealEvaluation() {
  console.log('Testing deal evaluation with US, Mexico, and Canada...\n');
  
  const testDeal = {
    simQuantity: 1000,
    countries: ['United States', 'Mexico', 'Canada'],
    carriers: [], // No specific carriers, should pick the cheapest valid ones
    monthlyDataPerSim: 1,
    monthlySmsPerSim: 0,
    duration: 12,
    proposedPricePerSim: 3,
    currency: 'EUR',
    isNewCustomer: true,
    expectedUsagePattern: 'medium',
    requiresIoT: false
  };
  
  const result = await dealService.evaluateDeal(testDeal);
  
  console.log('Selected carriers:');
  result.carrierOptions.forEach(opt => {
    console.log(`  - ${opt.carrier} (${opt.country}) via ${opt.operator}: €${(opt.dataRate * 1024).toFixed(2)}/GB`);
  });
  
  console.log('\nNotes:');
  result.notes.forEach(note => console.log(`  - ${note}`));
}

testDealEvaluation();