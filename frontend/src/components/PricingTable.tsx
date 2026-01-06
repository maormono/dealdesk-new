import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Wifi, Smartphone, Globe, DollarSign, Euro, Lock, Download, Eye, EyeOff, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DataUpload } from './DataUpload';
import '../styles/monogoto-theme.css';

interface NetworkData {
  network_name: string;
  country: string;
  tadig: string;
  operator: string;
  identity?: string; // B, O, E, U, etc.
  data_cost: number;
  sms_cost: number;
  imsi_cost: number;
  notes?: string;
  lte_m?: boolean;
  lte_m_double?: boolean; // Double checkmark (✓✓)
  nb_iot?: boolean;
  nb_iot_double?: boolean; // Double checkmark (✓✓)
  restrictions?: string;
  // Network generation fields
  gsm?: boolean;
  gprs2G?: boolean;
  umts3G?: boolean;
  lte4G?: boolean;
  lte5G?: boolean;
}

interface GroupedNetwork {
  network_name: string;
  country: string;
  tadigs: string[];
  sources: Array<{
    operator: string;
    identity?: string; // B, O, E, U, etc.
    data_cost: number;
    sms_cost: number;
    imsi_cost: number;
    notes?: string;
    lte_m?: boolean;
    lte_m_double?: boolean; // Double checkmark (✓✓)
    nb_iot?: boolean;
    nb_iot_double?: boolean; // Double checkmark (✓✓)
    // Network generation fields
    gsm?: boolean;
    gprs2G?: boolean;
    umts3G?: boolean;
    lte4G?: boolean;
    lte5G?: boolean;
  }>;
}

// Using Monogoto brand colors - keyed by operator OR identity
const operatorConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  // Legacy operator-based colors
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
  },
  // Identity-based colors (Monogoto-B, Monogoto-O, etc.)
  'B': {
    color: 'text-[#5B9BD5]',
    bgColor: 'bg-[#5B9BD5]/10',
    borderColor: 'border-[#5B9BD5]/20',
    label: 'Monogoto-B'
  },
  'O': {
    color: 'text-[#EC6B9D]',
    bgColor: 'bg-[#EC6B9D]/10',
    borderColor: 'border-[#EC6B9D]/20',
    label: 'Monogoto-O'
  },
  'E': {
    color: 'text-[#9B7BB6]',
    bgColor: 'bg-[#9B7BB6]/10',
    borderColor: 'border-[#9B7BB6]/20',
    label: 'Monogoto-E'
  },
  'U': {
    color: 'text-[#F5B342]',
    bgColor: 'bg-[#F5B342]/10',
    borderColor: 'border-[#F5B342]/20',
    label: 'Monogoto-U'
  },
};

// Helper function to get config based on identity or operator
const getSourceConfig = (source: { operator: string; identity?: string }) => {
  // First try to match by identity letter (B, O, E, U)
  if (source.identity) {
    // Extract the letter from identity like "Monogoto-B" -> "B" or just "B" -> "B"
    const identityLetter = source.identity.includes('-')
      ? source.identity.split('-').pop()
      : source.identity;
    if (identityLetter && operatorConfig[identityLetter]) {
      return operatorConfig[identityLetter];
    }
  }
  // Fall back to operator-based config
  return operatorConfig[source.operator] || null;
};

interface PricingTableProps {
  currency?: 'EUR' | 'USD';
  onCurrencyChange?: (currency: 'EUR' | 'USD') => void;
}

export const PricingTable: React.FC<PricingTableProps> = ({ currency: propCurrency, onCurrencyChange }) => {
  const { isSales } = useUser();
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [allNetworks, setAllNetworks] = useState<NetworkData[]>([]); // Store all networks including hidden ones
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>(propCurrency || 'USD');
  const [dataUnit, setDataUnit] = useState<'MB' | 'GB'>('MB');
  const [exchangeRate, setExchangeRate] = useState(1.1); // Default EUR to USD rate
  const [selectedIdentities, setSelectedIdentities] = useState<Set<string>>(new Set());
  const [showHiddenNetworks, setShowHiddenNetworks] = useState(false);
  
  // Search and sort state
  const [networkSearch, setNetworkSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [tadigSearch, setTagidSearch] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [generationSearch, setGenerationSearch] = useState('');
  const [sortField, setSortField] = useState<'network' | 'country' | 'tadig' | 'source' | 'generation' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Search box visibility state
  const [showNetworkSearch, setShowNetworkSearch] = useState(false);
  const [showCountrySearch, setShowCountrySearch] = useState(false);
  const [showTagidSearch, setShowTagidSearch] = useState(false);
  const [showSourceSearch, setShowSourceSearch] = useState(false);
  const [showGenerationSearch, setShowGenerationSearch] = useState(false);
  
  // Price threshold: $1/MB = approximately €0.90/MB at 1.1 exchange rate
  const MAX_REASONABLE_PRICE_EUR_MB = 0.90;

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

  const loadNetworks = useCallback(async () => {
    try {
      console.log('Loading networks from Supabase network_pricing_v2...');

      // Primary source: Supabase network_pricing_v2 table
      const { data: pricingData, error: pricingError } = await supabase
        .from('network_pricing_v2')
        .select('*')
        .order('country', { ascending: true })
        .order('network_name', { ascending: true });

      if (pricingError) {
        console.error('Error fetching from network_pricing_v2:', pricingError);
        throw pricingError;
      }

      if (pricingData && pricingData.length > 0) {
        console.log(`Loaded ${pricingData.length} records from Supabase`);

        // Transform Supabase data to match our interface
        const transformedData: NetworkData[] = pricingData.map((item: any) => {
          // Apply role-based markup if user is sales
          const dataPrice = parseFloat(item.data_per_mb) || 0;
          const smsPrice = parseFloat(item.sms_cost) || 0;
          const imsiPrice = parseFloat(item.imsi_cost) || 0;

          const adjustedDataPrice = isSales ? dataPrice * 1.5 : dataPrice;
          const adjustedSmsPrice = isSales ? smsPrice * 1.5 : smsPrice;
          const adjustedImsiPrice = isSales ? imsiPrice * 1.5 : imsiPrice;

          return {
            network_name: item.network_name,
            country: item.country,
            tadig: item.tadig,
            operator: item.identity || 'Unknown',
            identity: item.identity || '',
            data_cost: adjustedDataPrice,
            sms_cost: adjustedSmsPrice,
            imsi_cost: adjustedImsiPrice,
            notes: item.notes || '',
            lte_m: item.lte_m || false,
            lte_m_double: item.lte_m_double || false,
            nb_iot: item.nb_iot || false,
            nb_iot_double: item.nb_iot_double || false,
            restrictions: item.notes || '',
            gsm: item.gsm || false,
            gprs2G: item.gprs_2g || false,
            umts3G: item.umts_3g || false,
            lte4G: item.lte_4g || false,
            lte5G: item.lte_5g || false,
          };
        });

        setAllNetworks(transformedData);
        setNetworks(transformedData);
        return;
      }

      // No data in Supabase - show empty state
      console.log('No data in network_pricing_v2 table');
      setAllNetworks([]);
      setNetworks([]);

    } catch (error) {
      console.error('Error loading networks:', error);
      setAllNetworks([]);
      setNetworks([]);
    } finally {
      setLoading(false);
    }
  }, [isSales]);

  useEffect(() => {
    loadNetworks();
    fetchExchangeRate();
  }, [loadNetworks]);

  useEffect(() => {
    if (propCurrency && propCurrency !== currency) {
      setCurrency(propCurrency);
    }
  }, [propCurrency]);

  const convertCurrency = (value: number): number => {
    return currency === 'USD' ? value * exchangeRate : value;
  };

  const formatDataPrice = (value: number, includeSymbol: boolean = false): string => {
    if (value === 0 || value === null || value === undefined) return '';
    
    // Convert MB to GB if needed (1 GB = 1024 MB)
    const adjustedValue = dataUnit === 'GB' ? value * 1024 : value;
    const converted = convertCurrency(adjustedValue);
    
    const decimals = dataUnit === 'GB' ? 2 : 4;
    const symbol = currency === 'EUR' ? '€' : '$';
    const unit = `/${dataUnit}`;
    
    if (includeSymbol) {
      return `${symbol}${converted.toFixed(decimals)}${unit}`;
    }
    return `${symbol}${converted.toFixed(decimals)}${unit}`;
  };

  const formatCurrency = (value: number, decimals: number = 2, includeSymbol: boolean = false): string => {
    if (value === 0 || value === null || value === undefined) return '';
    
    const converted = convertCurrency(value);
    const symbol = currency === 'EUR' ? '€' : '$';
    if (includeSymbol) {
      return `${symbol}${converted.toFixed(decimals)}`;
    }
    return `${symbol}${converted.toFixed(decimals)}`;
  };

  const handleSort = (field: 'network' | 'country' | 'tadig' | 'source' | 'generation') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSearchBox = (field: 'network' | 'country' | 'tadig' | 'source' | 'generation') => {
    if (field === 'network') {
      setShowNetworkSearch(!showNetworkSearch);
      if (!showNetworkSearch) {
        // Hide other search boxes when opening one
        setShowCountrySearch(false);
        setShowTagidSearch(false);
        setShowSourceSearch(false);
        setShowGenerationSearch(false);
      }
    } else if (field === 'country') {
      setShowCountrySearch(!showCountrySearch);
      if (!showCountrySearch) {
        setShowNetworkSearch(false);
        setShowTagidSearch(false);
        setShowSourceSearch(false);
        setShowGenerationSearch(false);
      }
    } else if (field === 'tadig') {
      setShowTagidSearch(!showTagidSearch);
      if (!showTagidSearch) {
        setShowNetworkSearch(false);
        setShowCountrySearch(false);
        setShowSourceSearch(false);
        setShowGenerationSearch(false);
      }
    } else if (field === 'source') {
      setShowSourceSearch(!showSourceSearch);
      if (!showSourceSearch) {
        setShowNetworkSearch(false);
        setShowCountrySearch(false);
        setShowTagidSearch(false);
        setShowGenerationSearch(false);
      }
    } else if (field === 'generation') {
      setShowGenerationSearch(!showGenerationSearch);
      if (!showGenerationSearch) {
        setShowNetworkSearch(false);
        setShowCountrySearch(false);
        setShowTagidSearch(false);
        setShowSourceSearch(false);
      }
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
        identity: network.identity,
        data_cost: network.data_cost,
        sms_cost: network.sms_cost,
        imsi_cost: network.imsi_cost,
        notes: network.notes,
        lte_m: network.lte_m,
        lte_m_double: network.lte_m_double,
        nb_iot: network.nb_iot,
        nb_iot_double: network.nb_iot_double,
        // Network generation fields
        gsm: network.gsm,
        gprs2G: network.gprs2G,
        umts3G: network.umts3G,
        lte4G: network.lte4G,
        lte5G: network.lte5G,
      });
    });

    return Object.values(grouped);
  };

  // Apply show/hide toggle
  const visibleNetworks = showHiddenNetworks ? allNetworks : networks;
  
  const filteredNetworks = visibleNetworks.filter(network => {
    // Apply identity filter (A1->E, TF->O, T2->B)
    if (selectedIdentities.size > 0) {
      // Extract identity letter from network.identity (e.g., "Monogoto-B" -> "B" or just "B" -> "B")
      const identityLetter = network.identity?.includes('-')
        ? network.identity.split('-').pop()
        : network.identity;
      if (!identityLetter || !selectedIdentities.has(identityLetter)) {
        return false;
      }
    }
    
    // Apply column-specific search filters
    if (networkSearch && !network.network_name.toLowerCase().includes(networkSearch.toLowerCase().trim())) {
      return false;
    }
    
    if (countrySearch && !network.country.toLowerCase().includes(countrySearch.toLowerCase().trim())) {
      return false;
    }
    
    if (tadigSearch && !network.tadig.toLowerCase().includes(tadigSearch.toLowerCase().trim())) {
      return false;
    }
    
    if (sourceSearch && !(network.identity || '').toLowerCase().includes(sourceSearch.toLowerCase().trim())) {
      return false;
    }
    
    if (generationSearch) {
      // Build generation string for this network
      const generations = [];
      if (network.gsm) generations.push('2G');
      if (network.gprs2G) generations.push('2G');
      if (network.umts3G) generations.push('3G');
      if (network.lte4G) generations.push('4G');
      if (network.lte5G) generations.push('5G');
      const generationString = generations.join(', ');
      if (!generationString.toLowerCase().includes(generationSearch.toLowerCase().trim())) {
        return false;
      }
    }
    
    // Apply general search term (legacy search functionality)
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
  
  // Apply sorting
  const sortedNetworks = [...groupedNetworks].sort((a, b) => {
    if (sortField === 'network') {
      const comparison = a.network_name.localeCompare(b.network_name);
      return sortDirection === 'asc' ? comparison : -comparison;
    } else if (sortField === 'country') {
      const comparison = a.country.localeCompare(b.country);
      return sortDirection === 'asc' ? comparison : -comparison;
    } else if (sortField === 'tadig') {
      // Sort by first TADIG code
      const comparison = a.tadigs[0]?.localeCompare(b.tadigs[0] || '') || 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    } else if (sortField === 'source') {
      // Sort by first source operator
      const aSource = a.sources[0]?.operator || '';
      const bSource = b.sources[0]?.operator || '';
      const comparison = aSource.localeCompare(bSource);
      return sortDirection === 'asc' ? comparison : -comparison;
    } else if (sortField === 'generation') {
      // Sort by generation level (2G=2, 3G=3, 4G=4, 5G=5)
      const getMaxGeneration = (sources: any[]) => {
        let maxGen = 0;
        sources.forEach(source => {
          if (source.lte5G) maxGen = Math.max(maxGen, 5);
          else if (source.lte4G) maxGen = Math.max(maxGen, 4);
          else if (source.umts3G) maxGen = Math.max(maxGen, 3);
          else if (source.gprs2G || source.gsm) maxGen = Math.max(maxGen, 2);
        });
        return maxGen;
      };
      const aGeneration = getMaxGeneration(a.sources);
      const bGeneration = getMaxGeneration(b.sources);
      const comparison = aGeneration - bGeneration;
      return sortDirection === 'asc' ? comparison : -comparison;
    }
    return 0;
  });
  
  // Export functionality
  const exportToCSV = () => {
    const headers = ['Country', 'Network', 'TADIG', 'Identity', `Data (${currency}/${dataUnit})`, `SMS (${currency})`, `IMSI (${currency})`, 'NETWORK TECH.', 'CAT-M', 'NB-IoT', 'Notes'];
    const rows = filteredNetworks.map(network => {
      // Build generation string for CSV
      const generations = [];
      if (network.gsm) generations.push('2G');
      if (network.gprs2G && !generations.includes('2G')) generations.push('2G');
      if (network.umts3G) generations.push('3G');
      if (network.lte4G) generations.push('4G');
      if (network.lte5G) generations.push('5G');

      return [
        network.country,
        network.network_name,
        network.tadig,
        network.identity || '',
        formatDataPrice(network.data_cost),
        formatCurrency(network.sms_cost, 3),
        formatCurrency(network.imsi_cost, 2),
        generations.join(', ') || 'N/A',
        network.lte_m ? 'Yes' : 'No',
        network.nb_iot ? 'Yes' : 'No',
        network.notes || ''
      ];
    });
    
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
  
  const toggleIdentity = (identity: string) => {
    const newSelected = new Set(selectedIdentities);
    if (newSelected.has(identity)) {
      newSelected.delete(identity);
    } else {
      newSelected.add(identity);
    }
    setSelectedIdentities(newSelected);
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

      {/* Data Upload Component */}
      <DataUpload onDataLoaded={loadNetworks} />

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
              {(() => {
                const avgPrice = filteredNetworks.reduce((sum, n) => sum + n.data_cost, 0) / Math.max(filteredNetworks.length, 1);
                const adjustedValue = dataUnit === 'GB' ? avgPrice * 1024 : avgPrice;
                const converted = convertCurrency(adjustedValue);
                const decimals = dataUnit === 'GB' ? 2 : 4;
                const symbol = currency === 'EUR' ? '€' : '$';
                return `${symbol}${converted.toFixed(decimals)}`;
              })()}
            </div>
            <div className="text-sm text-gray-500">per {dataUnit}</div>
          </div>
        </div>
        
        <div className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Wifi className="w-5 h-5 text-[#5B9BD5] opacity-70" />
            <span className="text-xs font-medium text-gray-400">LP-WAN</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline space-x-2">
              <div className="text-xl font-semibold text-gray-900 tracking-tight">
                {filteredNetworks.filter(n => n.nb_iot).length}
              </div>
              <div className="text-sm text-gray-500">NB-IoT</div>
            </div>
            <div className="flex items-baseline space-x-2">
              <div className="text-xl font-semibold text-gray-900 tracking-tight">
                {filteredNetworks.filter(n => n.lte_m).length}
              </div>
              <div className="text-sm text-gray-500">LTE Cat-M</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Bar and Controls - Apple Style */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex gap-3 items-center">
            {/* Carrier Filter - Left Side */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 mr-1">Carriers:</span>
              <div className="flex gap-2">
                {/* A1 -> filters by identity E, TF -> filters by identity O, T2 -> filters by identity B */}
                {[
                  { label: 'A1', identity: 'E', configKey: 'A1' },
                  { label: 'TF', identity: 'O', configKey: 'Telefonica' },
                  { label: 'T2', identity: 'B', configKey: 'Tele2' }
                ].map(({ label, identity, configKey }) => {
                  const config = operatorConfig[configKey as keyof typeof operatorConfig];
                  return (
                    <button
                      key={label}
                      onClick={() => toggleIdentity(identity)}
                      className={`px-3 py-0.5.5 rounded-lg text-sm font-medium transition-all border ${
                        selectedIdentities.has(identity)
                          ? `${config.bgColor} ${config.color} ${config.borderColor} border-2`
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                
                {/* Hidden Networks Button - Next to T2 */}
                <button
                  onClick={() => setShowHiddenNetworks(!showHiddenNetworks)}
                  className={`flex items-center gap-1 px-2 py-0.5.5 rounded-lg text-sm font-medium transition-all border ${
                    showHiddenNetworks
                      ? 'bg-orange-50 text-orange-600 border-orange-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                  title="Hidden Networks"
                >
                  {showHiddenNetworks ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="px-1.5 py-0.5 bg-white rounded text-xs">
                    {allNetworks.length - networks.length}
                  </span>
                </button>
              </div>
            </div>
            
            {/* Search Bar - Center */}
            <div className="flex-1 relative mx-4">
              <input
                type="text"
                placeholder="Search networks, countries, TADIG codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-0.5.5 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400 text-sm"
              />
            </div>
            
            {/* Data Unit Toggle - Right Side */}
            <div className="flex items-center bg-gray-50 rounded-xl p-1">
              <button
                onClick={() => setDataUnit('MB')}
                className={`px-3 py-0.5.5 rounded-lg text-sm transition-all ${
                  dataUnit === 'MB' 
                    ? 'bg-white text-[#5B9BD5] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                MB
              </button>
              <button
                onClick={() => setDataUnit('GB')}
                className={`px-3 py-0.5.5 rounded-lg text-sm transition-all ${
                  dataUnit === 'GB' 
                    ? 'bg-white text-[#5B9BD5] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                GB
              </button>
            </div>
            
            {/* Currency Toggle - Right Side */}
            <div className="flex items-center bg-gray-50 rounded-xl p-1">
              <button
                onClick={() => {
                  setCurrency('USD');
                  onCurrencyChange?.('USD');
                }}
                className={`px-3 py-0.5.5 rounded-lg text-sm transition-all ${
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
                className={`px-3 py-0.5.5 rounded-lg text-sm transition-all ${
                  currency === 'EUR' 
                    ? 'bg-white text-[#5B9BD5] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                EUR €
              </button>
            </div>
            
            {/* Export Button - Far Right */}
            <button
              onClick={exportToCSV}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
      
          {/* Active filter indicator */}
          {(searchTerm || networkSearch || countrySearch || tadigSearch || sourceSearch || generationSearch || selectedIdentities.size > 0) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <span>Active filters:
                {searchTerm && <strong className="text-gray-700 ml-1">General: "{searchTerm}"</strong>}
                {networkSearch && <strong className="text-gray-700 ml-1">Network: "{networkSearch}"</strong>}
                {countrySearch && <strong className="text-gray-700 ml-1">Country: "{countrySearch}"</strong>}
                {tadigSearch && <strong className="text-gray-700 ml-1">TADIG: "{tadigSearch}"</strong>}
                {sourceSearch && <strong className="text-gray-700 ml-1">Source: "{sourceSearch}"</strong>}
                {generationSearch && <strong className="text-gray-700 ml-1">Generation: "{generationSearch}"</strong>}
                {selectedIdentities.size > 0 && <strong className="text-gray-700 ml-1">Carriers: {Array.from(selectedIdentities).join(', ')}</strong>}
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setNetworkSearch('');
                  setCountrySearch('');
                  setTagidSearch('');
                  setSourceSearch('');
                  setGenerationSearch('');
                  setSelectedIdentities(new Set());
                  // Hide all search boxes
                  setShowNetworkSearch(false);
                  setShowCountrySearch(false);
                  setShowTagidSearch(false);
                  setShowSourceSearch(false);
                  setShowGenerationSearch(false);
                }}
                className="text-[#5B9BD5] hover:text-[#5B9BD5]/80 font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table - Apple Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full min-w-[1200px]">
          <colgroup>
            <col className="w-[140px]" /> {/* Country */}
            <col className="w-[240px]" /> {/* Network */}
            <col className="w-[100px]" /> {/* TADIG */}
            <col className="w-[100px]" /> {/* Identity */}
            <col className="w-[120px]" /> {/* Data */}
            <col className="w-[100px]" /> {/* SMS */}
            <col className="w-[100px]" /> {/* IMSI */}
            <col className="w-[130px]" /> {/* NETWORK TECH. */}
            <col className="w-[120px]" /> {/* LP-WAN Tech */}
            <col /> {/* Notes - flexible width takes remaining space */}
          </colgroup>
            <thead className="bg-gradient-to-b from-gray-50 to-white sticky top-0 z-10">
            <tr>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1 group">
                  <span>Country</span>
                  <button 
                    onClick={() => handleSort('country')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort countries"
                  >
                    {sortField === 'country' ? (
                      sortDirection === 'asc' ? 
                      <ArrowUp className="w-3 h-3 text-gray-500" /> : 
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSearchBox('country')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Search countries"
                  >
                    <Search className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                {showCountrySearch && (
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="mt-1 w-full px-2 py-0.5 text-xs bg-gray-50 border-0 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white placeholder-gray-400"
                    autoFocus
                  />
                )}
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1 group">
                  <span>Network</span>
                  <button 
                    onClick={() => handleSort('network')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort networks"
                  >
                    {sortField === 'network' ? (
                      sortDirection === 'asc' ? 
                      <ArrowUp className="w-3 h-3 text-gray-500" /> : 
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSearchBox('network')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Search networks"
                  >
                    <Search className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                {showNetworkSearch && (
                  <input
                    type="text"
                    placeholder="Search networks..."
                    value={networkSearch}
                    onChange={(e) => setNetworkSearch(e.target.value)}
                    className="mt-1 w-full px-2 py-0.5 text-xs bg-gray-50 border-0 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white placeholder-gray-400"
                    autoFocus
                  />
                )}
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1 group">
                  <span>TADIG</span>
                  <button 
                    onClick={() => handleSort('tadig')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort TADIG codes"
                  >
                    {sortField === 'tadig' ? (
                      sortDirection === 'asc' ? 
                      <ArrowUp className="w-3 h-3 text-gray-500" /> : 
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSearchBox('tadig')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Search TADIG codes"
                  >
                    <Search className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                {showTagidSearch && (
                  <input
                    type="text"
                    placeholder="Search TADIG..."
                    value={tadigSearch}
                    onChange={(e) => setTagidSearch(e.target.value)}
                    className="mt-1 w-full px-2 py-0.5 text-xs bg-gray-50 border-0 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white placeholder-gray-400"
                    autoFocus
                  />
                )}
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1 group">
                  <span>Identity</span>
                  <button
                    onClick={() => handleSort('source')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort identity"
                  >
                    {sortField === 'source' ? (
                      sortDirection === 'asc' ?
                      <ArrowUp className="w-3 h-3 text-gray-500" /> :
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSearchBox('source')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Search identity"
                  >
                    <Search className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                {showSourceSearch && (
                  <input
                    type="text"
                    placeholder="Search identity..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    className="mt-1 w-full px-2 py-0.5 text-xs bg-gray-50 border-0 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white placeholder-gray-400"
                    autoFocus
                  />
                )}
              </th>
                <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1">
                  <span>Data</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                </div>
              </th>
                <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1">
                  <span>SMS</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                </div>
              </th>
                <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1">
                  <span>IMSI</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                </div>
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1 group whitespace-nowrap">
                  <span>NETWORK TECH.</span>
                  <button 
                    onClick={() => handleSort('generation')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort network generations"
                  >
                    {sortField === 'generation' ? (
                      sortDirection === 'asc' ? 
                      <ArrowUp className="w-3 h-3 text-gray-500" /> : 
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSearchBox('generation')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Search network generations"
                  >
                    <Search className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                {showGenerationSearch && (
                  <input
                    type="text"
                    placeholder="Search generations..."
                    value={generationSearch}
                    onChange={(e) => setGenerationSearch(e.target.value)}
                    className="mt-1 w-full px-2 py-0.5 text-xs bg-gray-50 border-0 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white placeholder-gray-400"
                    autoFocus
                  />
                )}
              </th>
                <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">
                LP-WAN Tech.
              </th>
                <th className="px-2 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedNetworks.map((network, networkIndex) => {
              // Render each source as a separate row with its identity-based background color
              return (
                <React.Fragment key={networkIndex}>
                  {network.sources.map((source, sourceIndex) => {
                    const config = getSourceConfig(source);
                    const isFirstSource = sourceIndex === 0;
                    const isLastSource = sourceIndex === network.sources.length - 1;
                    const rowSpan = network.sources.length;

                    // Build generation string
                    const generations: string[] = [];
                    if (source.gsm) generations.push('2G');
                    if (source.gprs2G && !generations.includes('2G')) generations.push('2G');
                    if (source.umts3G) generations.push('3G');
                    if (source.lte4G) generations.push('4G');
                    if (source.lte5G) generations.push('5G');

                    // Build LP-WAN technologies
                    const technologies: string[] = [];
                    if (source.lte_m) technologies.push('CAT-M');
                    if (source.nb_iot) technologies.push('NB-IoT');

                    // Display identity value (e.g., "Monogoto-B") or fall back to operator
                    const displayIdentity = source.identity || source.operator;

                    return (
                      <tr
                        key={`${networkIndex}-${sourceIndex}`}
                        className={`hover:bg-gray-50 transition-colors ${isLastSource ? 'border-b border-gray-200' : ''}`}
                      >
                        {/* Country - only show on first row, span all sources */}
                        {isFirstSource && (
                          <td
                            className="px-2 py-0.5 text-gray-700 text-sm align-top"
                            rowSpan={rowSpan}
                          >
                            {network.country}
                          </td>
                        )}
                        {/* Network - only show on first row, span all sources */}
                        {isFirstSource && (
                          <td className="px-2 py-0.5 align-top" rowSpan={rowSpan}>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm" title={network.network_name}>
                                {network.network_name}
                              </div>
                            </div>
                          </td>
                        )}
                        {/* TADIG - only show on first row, span all sources */}
                        {isFirstSource && (
                          <td className="px-2 py-0.5 align-top" rowSpan={rowSpan}>
                            <div className="font-mono text-xs font-semibold">
                              {network.tadigs.join(', ')}
                            </div>
                          </td>
                        )}
                        {/* Identity/Operator */}
                        <td className="px-2 py-0.5">
                          <span className={`text-xs ${config?.color || 'text-gray-600'}`}>
                            {displayIdentity}
                          </span>
                        </td>
                        {/* Data cost */}
                        <td className="px-2 py-0.5">
                          <span className={`text-xs whitespace-nowrap ${config?.color || 'text-gray-600'}`}>
                            {formatDataPrice(source.data_cost || 0) || <span className="text-gray-300">-</span>}
                          </span>
                        </td>
                        {/* SMS cost */}
                        <td className="px-2 py-0.5">
                          <span className={`text-xs ${config?.color || 'text-gray-600'}`}>
                            {formatCurrency(source.sms_cost || 0) || <span className="text-gray-300">-</span>}
                          </span>
                        </td>
                        {/* IMSI cost */}
                        <td className="px-2 py-0.5">
                          <span className={`text-xs ${config?.color || 'text-gray-600'}`}>
                            {formatCurrency(source.imsi_cost || 0) || <span className="text-gray-300">-</span>}
                          </span>
                        </td>
                        {/* Network Technology */}
                        <td className="px-2 py-0.5">
                          <span className={`text-xs whitespace-nowrap ${config?.color || 'text-gray-600'}`}>
                            {generations.length > 0 ? (
                              <span>{generations.join(', ')}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </span>
                        </td>
                        {/* LP-WAN Tech */}
                        <td className="px-2 py-0.5">
                          <span className={`text-xs whitespace-nowrap ${config?.color || 'text-gray-600'}`}>
                            {technologies.length > 0 ? (
                              <span className="flex items-center gap-1">
                                {technologies.map((tech, techIndex) => {
                                  const isDouble = (tech === 'CAT-M' && source.lte_m_double) || (tech === 'NB-IoT' && source.nb_iot_double);
                                  return (
                                    <span key={techIndex} className="flex items-center gap-0.5">
                                      {tech}
                                      {isDouble && (
                                        <span className="inline-flex items-center justify-center w-4 h-4 bg-green-500 rounded-full">
                                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </span>
                                      )}
                                      {techIndex < technologies.length - 1 && ', '}
                                    </span>
                                  );
                                })}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </span>
                        </td>
                        {/* Notes */}
                        <td className="px-2 py-0.5">
                          <span className={`text-xs whitespace-nowrap ${config?.color || 'text-gray-600'}`}>
                            {source.notes &&
                              source.notes !== 'X' &&
                              source.notes !== 'XX' &&
                              !source.notes.toLowerCase().startsWith('region:') &&
                              !(source.notes.toLowerCase().includes('access fee') && source.imsi_cost > 0) ?
                              <span>{source.notes}</span> :
                              <span className="text-gray-300">-</span>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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