import React, { useState, useEffect } from 'react';
import { NotesDisplay } from './NotesDisplay';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { ChevronDown, ChevronUp, Wifi, Smartphone, Globe, DollarSign, Euro, Lock, Download, Eye, EyeOff, Filter } from 'lucide-react';
import '../styles/monogoto-theme.css';

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

interface GroupedNetwork {
  network_name: string;
  country: string;
  tadigs: string[];
  sources: Array<{
    operator: string;
    data_cost: number;
    sms_cost: number;
    imsi_cost: number;
    notes?: string;
    lte_m?: boolean;
    nb_iot?: boolean;
  }>;
}

// Using Monogoto brand colors
const operatorConfig = {
  'A1': { 
    color: 'text-[#5B9BD5]', 
    bgColor: 'bg-[#5B9BD5]/10', 
    borderColor: 'border-[#5B9BD5]/20',
    label: 'A1' 
  },
  'Telefonica': { 
    color: 'text-[#EC6B9D]', 
    bgColor: 'bg-[#EC6B9D]/10', 
    borderColor: 'border-[#EC6B9D]/20',
    label: 'TF' 
  },
  'Tele2': { 
    color: 'text-[#9B7BB6]', 
    bgColor: 'bg-[#9B7BB6]/10', 
    borderColor: 'border-[#9B7BB6]/20',
    label: 'T2' 
  },
  'Monogoto': { 
    color: 'text-[#F5B342]', 
    bgColor: 'bg-[#F5B342]/10', 
    borderColor: 'border-[#F5B342]/20',
    label: 'MG' 
  }
};

interface PricingTableProps {
  currency?: 'EUR' | 'USD';
  onCurrencyChange?: (currency: 'EUR' | 'USD') => void;
}

export const PricingTable: React.FC<PricingTableProps> = ({ currency: propCurrency, onCurrencyChange }) => {
  const { userRole, getPriceLabel, formatPrice: formatRolePrice, isSales } = useUser();
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [allNetworks, setAllNetworks] = useState<NetworkData[]>([]); // Store all networks including hidden ones
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>(propCurrency || 'USD');
  const [dataUnit, setDataUnit] = useState<'MB' | 'GB'>('MB');
  const [exchangeRate, setExchangeRate] = useState(1.1); // Default EUR to USD rate
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedOperators, setSelectedOperators] = useState<Set<string>>(new Set());
  const [showHiddenNetworks, setShowHiddenNetworks] = useState(false);
  
  // Price threshold: $1/MB = approximately €0.90/MB at 1.1 exchange rate
  const MAX_REASONABLE_PRICE_EUR_MB = 0.90;

  useEffect(() => {
    loadNetworks();
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    if (propCurrency && propCurrency !== currency) {
      setCurrency(propCurrency);
    }
  }, [propCurrency]);

  const fetchExchangeRate = async () => {
    try {
      // Using a free API for exchange rates
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      const data = await response.json();
      if (data.rates && data.rates.USD) {
        setExchangeRate(data.rates.USD);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Keep default rate if API fails
    }
  };

  const convertCurrency = (value: number): number => {
    return currency === 'USD' ? value * exchangeRate : value;
  };

  const formatDataPrice = (value: number, includeSymbol: boolean = false): string => {
    if (value === 0 || value === null || value === undefined) return '';
    
    // Convert MB to GB if needed (1 GB = 1024 MB)
    const adjustedValue = dataUnit === 'GB' ? value * 1024 : value;
    const converted = convertCurrency(adjustedValue);
    
    const decimals = dataUnit === 'GB' ? 2 : 4;
    
    if (includeSymbol) {
      const symbol = currency === 'EUR' ? '€' : '$';
      return `${symbol}${converted.toFixed(decimals)}`;
    }
    return converted.toFixed(decimals);
  };

  const formatCurrency = (value: number, decimals: number = 2, includeSymbol: boolean = false): string => {
    if (value === 0 || value === null || value === undefined) return '';
    
    const converted = convertCurrency(value);
    if (includeSymbol) {
      const symbol = currency === 'EUR' ? '€' : '$';
      return `${symbol}${converted.toFixed(decimals)}`;
    }
    return converted.toFixed(decimals);
  };

  const loadNetworks = async () => {
    try {
      // Use the role-based pricing view/function
      const { data: pricingData, error: pricingError } = await supabase
        .rpc('get_role_based_pricing');

      if (pricingError) {
        console.error('Error fetching role-based pricing:', pricingError);
        // Fallback to regular pricing if role-based fails
        const { data: networksData, error: networksError } = await supabase
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
          .order('country', { ascending: true })
          .order('network_name', { ascending: true });

        if (networksError) throw networksError;

        // Transform the data to match our interface
        const transformedData: NetworkData[] = [];
        
        networksData?.forEach(network => {
          network.network_pricing?.forEach((pricing: any) => {
            const dataPrice = pricing.data_per_mb || 0;
            
            // Apply role-based markup if user is sales
            const adjustedDataPrice = isSales ? dataPrice * 1.5 : dataPrice;
            const adjustedSmsPrice = isSales ? (pricing.sms_mo || pricing.sms_mt || 0) * 1.5 : (pricing.sms_mo || pricing.sms_mt || 0);
            const adjustedImsiPrice = isSales ? (pricing.imsi_access_fee || 0) * 1.5 : (pricing.imsi_access_fee || 0);
            
            // Don't skip networks, but mark them for filtering
            transformedData.push({
              network_name: network.network_name,
              country: network.country,
              tadig: network.tadig,
              operator: pricing.pricing_sources?.source_name || 'Unknown',
              data_cost: adjustedDataPrice,
              sms_cost: adjustedSmsPrice,
              imsi_cost: adjustedImsiPrice,
              notes: pricing.notes,
              lte_m: pricing.lte_m || false,
              nb_iot: pricing.nb_iot || false,
              restrictions: pricing.notes
            });
          });
        });

        // Store all networks and filter hidden ones
        setAllNetworks(transformedData);
        const visibleNetworks = transformedData.filter(n => {
          const price = n.data_cost;
          return price <= MAX_REASONABLE_PRICE_EUR_MB * (isSales ? 1.5 : 1);
        });
        setNetworks(visibleNetworks);
      } else {
        // Use role-based pricing data
        const transformedData: NetworkData[] = pricingData?.map((item: any) => ({
          network_name: item.network_name,
          country: item.country,
          tadig: item.tadig,
          operator: 'Monogoto',
          data_cost: (item.data_price_cents_per_mb || 0) / 100, // Convert cents to euros
          sms_cost: (item.sms_price_cents || 0) / 100,
          imsi_cost: (item.imsi_price_cents || 0) / 100,
          notes: '',
          lte_m: false,
          nb_iot: false,
          restrictions: ''
        })) || [];

        // For role-based pricing, set both
        setAllNetworks(transformedData);
        setNetworks(transformedData);
      }
    } catch (error) {
      console.error('Error loading networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupNetworks = (networks: NetworkData[]): GroupedNetwork[] => {
    const grouped: Record<string, GroupedNetwork> = {};

    networks.forEach(network => {
      const key = `${network.network_name}_${network.country}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          network_name: network.network_name,
          country: network.country,
          tadigs: [],
          sources: []
        };
      }

      if (!grouped[key].tadigs.includes(network.tadig)) {
        grouped[key].tadigs.push(network.tadig);
      }

      grouped[key].sources.push({
        operator: network.operator,
        data_cost: network.data_cost,
        sms_cost: network.sms_cost,
        imsi_cost: network.imsi_cost,
        notes: network.notes,
        lte_m: network.lte_m,
        nb_iot: network.nb_iot
      });
    });

    return Object.values(grouped);
  };

  // Apply show/hide toggle
  const visibleNetworks = showHiddenNetworks ? allNetworks : networks;
  
  const filteredNetworks = visibleNetworks.filter(network => {
    // Apply operator filter
    if (selectedOperators.size > 0 && !selectedOperators.has(network.operator)) {
      return false;
    }
    
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase().trim();
    
    // Check for exact country match first (case-insensitive)
    if (network.country.toLowerCase() === search) {
      return true;
    }
    
    // For non-exact matches, check all fields but exclude partial country matches
    // This prevents "Jersey" from matching "United Kingdom"
    const isCountrySearch = networks.some(n => n.country.toLowerCase() === search);
    
    if (isCountrySearch) {
      // If it's a country search, only return exact country matches
      return false;
    }
    
    // Otherwise, do regular partial matching on all fields
    return (
      network.network_name.toLowerCase().includes(search) ||
      network.country.toLowerCase().includes(search) ||
      network.tadig.toLowerCase().includes(search) ||
      network.operator.toLowerCase().includes(search)
    );
  });

  const groupedNetworks = groupNetworks(filteredNetworks);
  
  // Export functionality
  const exportToCSV = () => {
    const headers = ['Network', 'Country', 'TADIG', 'Operator', `Data (${currency}/${dataUnit})`, `SMS (${currency})`, `IMSI (${currency})`, 'LTE-M', 'NB-IoT', 'Notes'];
    const rows = filteredNetworks.map(network => [
      network.network_name,
      network.country,
      network.tadig,
      network.operator,
      formatDataPrice(network.data_cost),
      formatCurrency(network.sms_cost, 3),
      formatCurrency(network.imsi_cost, 2),
      network.lte_m ? 'Yes' : 'No',
      network.nb_iot ? 'Yes' : 'No',
      network.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `network_pricing_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const toggleOperator = (operator: string) => {
    const newSelected = new Set(selectedOperators);
    if (newSelected.has(operator)) {
      newSelected.delete(operator);
    } else {
      newSelected.add(operator);
    }
    setSelectedOperators(newSelected);
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Pricing Notice for Sales Users */}
      {isSales && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            <strong>Customer Pricing Mode:</strong> All prices shown include standard markup for customer proposals.
          </span>
        </div>
      )}
      
      {/* Search Bar and Controls - Apple Style */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search networks, countries, TADIG codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
              />
            </div>
            
            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-[#5B9BD5] text-white rounded-xl hover:bg-[#5B9BD5]/90 transition-all font-medium text-sm"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            {/* Data Unit Toggle - Pill Style */}
            <div className="flex items-center bg-gray-50 rounded-xl p-1">
              <button
                onClick={() => setDataUnit('MB')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dataUnit === 'MB' 
                    ? 'bg-white text-[#5B9BD5] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                MB
              </button>
              <button
                onClick={() => setDataUnit('GB')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dataUnit === 'GB' 
                    ? 'bg-white text-[#5B9BD5] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                GB
              </button>
            </div>
            
            {/* Currency Toggle - Pill Style */}
            <div className="flex items-center bg-gray-50 rounded-xl p-1">
              <button
                onClick={() => {
                  setCurrency('USD');
                  onCurrencyChange?.('USD');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currency === 'USD' 
                    ? 'bg-white text-[#5B9BD5] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                USD $
              </button>
              <button
                onClick={() => {
                  setCurrency('EUR');
                  onCurrencyChange?.('EUR');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currency === 'EUR' 
                    ? 'bg-white text-[#5B9BD5] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                EUR €
              </button>
            </div>
          </div>
          
          {/* Filter Controls Row */}
          <div className="mt-4 flex gap-3 items-center">
            {/* Operator Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 mr-2">Operators:</span>
              <div className="flex gap-2">
                {['A1', 'Telefonica', 'Tele2'].map(operator => {
                  const config = operatorConfig[operator as keyof typeof operatorConfig];
                  return (
                    <button
                      key={operator}
                      onClick={() => toggleOperator(operator)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        selectedOperators.has(operator)
                          ? `${config.bgColor} ${config.color} ${config.borderColor} border-2`
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {config.label} {operator}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Show Hidden Networks Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowHiddenNetworks(!showHiddenNetworks)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  showHiddenNetworks
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {showHiddenNetworks ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showHiddenNetworks ? 'Showing All' : 'Hidden Networks'}
                <span className="px-1.5 py-0.5 bg-white rounded text-xs">
                  {showHiddenNetworks ? allNetworks.length - networks.length : 0}
                </span>
              </button>
            </div>
          </div>
      
          {/* Active filter indicator */}
          {(searchTerm || selectedOperators.size > 0) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <span>Active filters: 
                {searchTerm && <strong className="text-gray-700 ml-1">"{searchTerm}"</strong>}
                {selectedOperators.size > 0 && <strong className="text-gray-700 ml-1">{Array.from(selectedOperators).join(', ')}</strong>}
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedOperators(new Set());
                }}
                className="text-[#5B9BD5] hover:text-[#5B9BD5]/80 font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Apple Style */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-5 h-5 text-[#9B7BB6] opacity-70" />
            <span className="text-xs font-medium text-gray-400">COVERAGE</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-xl font-semibold text-gray-900 tracking-tight">
              {new Set(filteredNetworks.map(n => n.country)).size}
            </div>
            <div className="text-sm text-gray-500">Countries</div>
          </div>
        </div>
        
        <div className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Globe className="w-5 h-5 text-[#5B9BD5] opacity-70" />
            <span className="text-xs font-medium text-gray-400">TOTAL</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-xl font-semibold text-gray-900 tracking-tight">
              {new Set(filteredNetworks.map(n => n.tadig)).size}
            </div>
            <div className="text-sm text-gray-500">Networks</div>
          </div>
        </div>
        
        <div className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Smartphone className="w-5 h-5 text-[#EC6B9D] opacity-70" />
            <span className="text-xs font-medium text-gray-400">ACCESS</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-xl font-semibold text-gray-900 tracking-tight">
              {filteredNetworks.filter(n => n.imsi_cost > 0).length}
            </div>
            <div className="text-sm text-gray-500">With IMSI</div>
          </div>
        </div>
        
        <div className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            {currency === 'EUR' ? <Euro className="w-5 h-5 text-[#F5B342] opacity-70" /> : <DollarSign className="w-5 h-5 text-[#F5B342] opacity-70" />}
            <span className="text-xs font-medium text-gray-400">AVERAGE</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-xl font-semibold text-gray-900 tracking-tight">
              {formatDataPrice(
                filteredNetworks.reduce((sum, n) => sum + n.data_cost, 0) / Math.max(filteredNetworks.length, 1), 
                true
              )}
            </div>
            <div className="text-sm text-gray-500">per {dataUnit}</div>
          </div>
        </div>
        
        <div className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Wifi className="w-5 h-5 text-[#5B9BD5] opacity-70" />
            <span className="text-xs font-medium text-gray-400">IoT</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <div className="text-xl font-semibold text-gray-900 tracking-tight">
              {filteredNetworks.filter(n => n.lte_m || n.nb_iot).length}
            </div>
            <div className="text-sm text-gray-500">Enabled</div>
          </div>
        </div>
      </div>

      {/* Table - Apple Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[20%]" /> {/* Network */}
            <col className="w-[12%]" /> {/* Country */}
            <col className="w-[8%]" /> {/* TADIG */}
            <col className="w-[8%]" /> {/* Sources */}
            <col className="w-[10%]" /> {/* Data */}
            <col className="w-[8%]" /> {/* SMS */}
            <col className="w-[8%]" /> {/* IMSI */}
            <col className="w-[10%]" /> {/* IoT */}
            <col className="w-[16%]" /> {/* Notes */}
          </colgroup>
            <thead className="bg-gradient-to-b from-gray-50 to-white sticky top-0 z-10">
            <tr>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Network
              </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Country
              </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                TADIG
              </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Sources
              </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="flex items-center gap-1">
                  <span>Data<br/>({currency}/{dataUnit})</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                </div>
              </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="flex items-center gap-1">
                  <span>SMS<br/>({currency})</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                </div>
              </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div className="flex items-center gap-1">
                  <span>IMSI<br/>({currency})</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                </div>
              </th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                IoT
              </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {groupedNetworks.map((network, index) => {
              const isExpanded = expandedRows.has(index);
              const hasMultipleTadigs = network.tadigs.length > 1;
              const hasNotes = network.sources.some(s => s.notes);
              const needsExpansion = hasMultipleTadigs || hasNotes;

              return (
                <React.Fragment key={index}>
                  <tr className="hover:bg-gray-50/50 border-b border-gray-50 transition-colors">
                    <td className="px-2 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm" title={network.network_name}>
                            {network.network_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {network.sources.length} source{network.sources.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {needsExpansion && (
                          <button
                            onClick={() => toggleRowExpansion(index)}
                            className="ml-1 p-0.5 hover:bg-gray-200 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-gray-700 text-sm">{network.country}</td>
                    <td className="px-2 py-2">
                      <div className="font-mono text-xs">
                        <span className="font-semibold">{network.tadigs[0]}</span>
                        {hasMultipleTadigs && !isExpanded && (
                          <span className="text-gray-500"> +{network.tadigs.length - 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="space-y-0.5">
                        {[...new Set(network.sources.map(s => s.operator))].map((operator, i) => {
                          const config = operatorConfig[operator as keyof typeof operatorConfig];
                          if (!config) return null;
                          return (
                            <div
                              key={i}
                              className={`text-xs font-medium ${config.color}`}
                            >
                              {config.label}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {network.sources.map((source, i) => {
                        const config = operatorConfig[source.operator as keyof typeof operatorConfig];
                        const formatted = formatDataPrice(source.data_cost || 0);
                        return formatted ? (
                          <div key={i} className={`text-xs ${config?.color || 'text-gray-600'}`}>
                            {formatted}
                          </div>
                        ) : null;
                      }).filter(Boolean)}
                    </td>
                    <td className="px-2 py-2">
                      {network.sources.map((source, i) => {
                        const config = operatorConfig[source.operator as keyof typeof operatorConfig];
                        const formatted = formatCurrency(source.sms_cost || 0);
                        return formatted ? (
                          <div key={i} className={`text-xs ${config?.color || 'text-gray-600'}`}>
                            {formatted}
                          </div>
                        ) : null;
                      }).filter(Boolean)}
                    </td>
                    <td className="px-2 py-2">
                      {network.sources.map((source, i) => {
                        const config = operatorConfig[source.operator as keyof typeof operatorConfig];
                        const formatted = formatCurrency(source.imsi_cost || 0);
                        return formatted ? (
                          <div key={i} className={`text-xs ${config?.color || 'text-gray-600'}`}>
                            {formatted}
                          </div>
                        ) : null;
                      }).filter(Boolean)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="space-y-0.5">
                        {network.sources.map((source, i) => {
                          const config = operatorConfig[source.operator as keyof typeof operatorConfig];
                          const technologies = [];
                          if (source.lte_m) technologies.push('CAT-M');
                          if (source.nb_iot) technologies.push('NB-IoT');
                          
                          if (technologies.length === 0) return null;
                          
                          return (
                            <div
                              key={i}
                              className={`text-xs font-medium ${config?.color || 'text-gray-600'}`}
                            >
                              {technologies.join(', ')}
                            </div>
                          );
                        }).filter(Boolean)}
                        {network.sources.every(s => !s.lte_m && !s.nb_iot) && (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {!isExpanded && hasNotes ? (
                        <div className="truncate">
                          <NotesDisplay 
                            notes={network.sources.find(s => s.notes)?.notes}
                            operator={network.sources.find(s => s.notes)?.operator || ''}
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {network.sources.filter(s => s.notes).map((source, i) => (
                            <NotesDisplay 
                              key={i}
                              notes={source.notes}
                              operator={source.operator}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                  {isExpanded && needsExpansion && (
                    <tr className="bg-gray-50">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="space-y-2">
                          {hasMultipleTadigs && (
                            <div>
                              <span className="text-xs font-semibold text-gray-600">All TADIGs:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {network.tadigs.map((tadig, i) => (
                                  <span key={i} className="inline-block px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">
                                    {tadig}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {hasNotes && (
                            <div>
                              <span className="text-xs font-semibold text-gray-600">Notes & Restrictions:</span>
                              <div className="mt-1 space-y-1">
                                {network.sources.filter(s => s.notes).map((source, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <NotesDisplay 
                                      notes={source.notes}
                                      operator={source.operator}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};