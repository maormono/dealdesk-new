import React, { useState } from 'react';
import { EnhancedDealService } from '../services/enhancedDealService';

export const TestWeightedPricing: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const runTest = async () => {
    setLoading(true);
    const service = new EnhancedDealService();
    
    try {
      // Test with 71% USA, 16% Mexico, 13% Canada
      const analysis = await service.analyzeDeal({
        simCount: 5000,
        countries: ['United States', 'Mexico', 'Canada'],
        dataPerSim: 5120, // 5GB in MB
        pricingModel: 'payAsYouGo',
        usagePercentages: {
          'United States': 71,
          'Mexico': 16,
          'Canada': 13
        },
        contractLength: 24,
        requestedPrice: 8.50
      });
      
      setResult(analysis);
      
      // Log the breakdown for verification
      console.log('=== WEIGHTED PRICING TEST RESULTS ===');
      console.log('Usage Distribution:', analysis.usageDistribution);
      console.log('Pay-as-you-go Pricing:');
      console.log('- Active SIM Fee:', analysis.payAsYouGo.activeSimFee);
      console.log('- Data Fee per MB:', analysis.payAsYouGo.dataFee);
      console.log('- List Price per SIM:', analysis.payAsYouGo.listPrice);
      console.log('- Discount %:', analysis.payAsYouGo.discountPercentage);
      console.log('=================================');
      
    } catch (error) {
      console.error('Test failed:', error);
      setResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Test Weighted Pricing Calculation</h2>
      
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Test Parameters:</h3>
        <ul className="text-sm space-y-1">
          <li>• 5000 SIMs</li>
          <li>• Countries: USA (71%), Mexico (16%), Canada (13%)</li>
          <li>• 5GB per SIM</li>
          <li>• 24-month contract</li>
          <li>• Pay-as-you-go model</li>
        </ul>
      </div>
      
      <button
        onClick={runTest}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Running Test...' : 'Run Test'}
      </button>
      
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Results:</h3>
          {result.error ? (
            <div className="text-red-600">Error: {result.error}</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="font-medium">Pay-as-you-go Pricing:</div>
              <div>• Active SIM Fee: €{result.payAsYouGo.activeSimFee}/month</div>
              <div>• Data Rate: €{result.payAsYouGo.dataFee}/MB</div>
              <div>• List Price: €{result.payAsYouGo.listPrice}/SIM</div>
              <div>• Discount: {result.payAsYouGo.discountPercentage}%</div>
              <div className="mt-2">
                <div className="font-medium">Usage Distribution Verified:</div>
                {Object.entries(result.usageDistribution).map(([country, pct]: [string, any]) => (
                  <div key={country}>• {country}: {pct}%</div>
                ))}
              </div>
              <div className="mt-2 font-medium">
                Status: {result.approved ? '✅ Approved' : '❌ Needs Review'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};