import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface PricingSource {
  data_per_mb: number;
  imsi_access_fee: number;
  sms_mo?: number;
  voice_moc?: number;
  currency: string;
}

interface NetworkResult {
  tadig: string;
  network_name: string;
  country: string;
  sources: {
    A1?: PricingSource;
    Telefonica?: PricingSource;
    Tele2?: PricingSource;
  };
  restrictions: string[];
  is_prohibited: boolean;
}

export const PricingSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<NetworkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'all' | 'A1' | 'Telefonica' | 'Tele2'>('all');
  const [stats, setStats] = useState({
    totalNetworks: 0,
    withIMSI: 0,
    prohibited: 0
  });

  // Search for networks
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/pricing/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
        
        // Calculate stats
        const withIMSI = data.data.filter((n: NetworkResult) => 
          Object.values(n.sources).some((s: any) => s?.imsi_access_fee > 0)
        ).length;
        
        const prohibited = data.data.filter((n: NetworkResult) => n.is_prohibited).length;
        
        setStats({
          totalNetworks: data.data.length,
          withIMSI,
          prohibited
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format price with currency
  const formatPrice = (price: number | undefined, currency: string = 'EUR') => {
    if (price === undefined || price === null) return '-';
    const symbol = currency === 'EUR' ? '€' : '$';
    return `${symbol}${price.toFixed(4)}`;
  };

  // Format IMSI fee
  const formatIMSI = (fee: number | undefined, currency: string = 'EUR') => {
    if (!fee || fee === 0) return '-';
    const symbol = currency === 'EUR' ? '€' : '$';
    return `${symbol}${fee.toFixed(2)}`;
  };

  // Get source badge color
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'A1': return 'bg-blue-500';
      case 'Telefonica': return 'bg-red-500';
      case 'Tele2': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Network Pricing Search</h1>
        <p className="text-gray-600">Search and compare pricing across A1, Telefonica, and Tele2</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by TADIG, network name, or country..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Source Filter */}
          <div className="flex gap-2 mt-4">
            <span className="text-sm text-gray-600 py-2">Filter by source:</span>
            {['all', 'A1', 'Telefonica', 'Tele2'].map((source) => (
              <button
                key={source}
                onClick={() => setSelectedSource(source as any)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  selectedSource === source
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {source === 'all' ? 'All Sources' : source}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      {results.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalNetworks}</div>
              <div className="text-sm text-gray-600">Networks Found</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.withIMSI}</div>
              <div className="text-sm text-gray-600">With IMSI Fees</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-red-600">{stats.prohibited}</div>
              <div className="text-sm text-gray-600">Prohibited</div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-7xl mx-auto">
        {results.map((network) => (
          <div key={network.tadig} className="bg-white rounded-lg shadow mb-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {network.network_name}
                  {network.is_prohibited && (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      PROHIBITED
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600">
                  {network.country} • TADIG: <span className="font-mono">{network.tadig}</span>
                </p>
              </div>
              
              {/* Source badges */}
              <div className="flex gap-1">
                {Object.keys(network.sources).map((source) => (
                  <span
                    key={source}
                    className={`px-2 py-1 text-white text-xs rounded ${getSourceColor(source)}`}
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>

            {/* Pricing Table */}
            <div className="grid grid-cols-4 gap-4">
              {['A1', 'Telefonica', 'Tele2'].map((source) => {
                const pricing = network.sources[source as keyof typeof network.sources];
                
                if (selectedSource !== 'all' && selectedSource !== source) {
                  return null;
                }
                
                if (!pricing) {
                  return (
                    <div key={source} className="border rounded-lg p-3 bg-gray-50">
                      <div className="font-medium text-gray-400 mb-2">{source}</div>
                      <div className="text-sm text-gray-400">No pricing data</div>
                    </div>
                  );
                }
                
                return (
                  <div key={source} className="border rounded-lg p-3">
                    <div className={`font-medium mb-2 ${
                      source === 'A1' ? 'text-blue-600' :
                      source === 'Telefonica' ? 'text-red-600' :
                      'text-purple-600'
                    }`}>
                      {source}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Data:</span>
                        <span className="font-medium">{formatPrice(pricing.data_per_mb, pricing.currency)}/MB</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">IMSI:</span>
                        <span className={`font-medium ${
                          pricing.imsi_access_fee > 0 ? 'text-orange-600' : 'text-gray-400'
                        }`}>
                          {formatIMSI(pricing.imsi_access_fee, pricing.currency)}
                        </span>
                      </div>
                      
                      {pricing.sms_mo !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">SMS:</span>
                          <span className="font-medium">{formatPrice(pricing.sms_mo, pricing.currency)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Restrictions */}
            {network.restrictions.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-yellow-800">Restrictions: </span>
                    <span className="text-yellow-700">
                      {network.restrictions.map(r => r.replace('_', ' ')).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && results.length === 0 && searchQuery && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try searching for "australia", "AUSTA", or "telstra"</p>
          </div>
        </div>
      )}
    </div>
  );
};