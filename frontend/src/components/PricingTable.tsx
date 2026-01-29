import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Wifi, Smartphone, Globe, DollarSign, Euro, Lock, Download, Eye, EyeOff, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import '../styles/monogoto-theme.css';

// Country to Region mapping
const countryToRegion: Record<string, string> = {
  // Africa
  'Algeria': 'Africa',
  'Angola': 'Africa',
  'Benin': 'Africa',
  'Buneer': 'Africa',
  'Botswana': 'Africa',
  'Burkina Faso': 'Africa',
  'Burundi': 'Africa',
  'Cameroon': 'Africa',
  'Cape Verde': 'Africa',
  'Cabo Verde': 'Africa',
  'Central African Republic': 'Africa',
  'Chad': 'Africa',
  'Comoros': 'Africa',
  'Congo': 'Africa',
  'Congo, Democratic Republic': 'Africa',
  'Congo Democratic Republic': 'Africa',
  'Congo Democratic Republic of': 'Africa',
  'Congo Democratic Rep of': 'Africa',
  'Congo, Democratic Republic of the': 'Africa',
  'Congo Democratic': 'Africa',
  'Congo Republic Of': 'Africa',
  'Congo Rep of': 'Africa',
  'Congo, Republic Of': 'Africa',
  'Democratic Republic of the Congo': 'Africa',
  'Djibouti': 'Africa',
  'Egypt': 'Africa',
  'Equatorial Guinea': 'Africa',
  'Eritrea': 'Africa',
  'Eswatini': 'Africa',
  'Ethiopia': 'Africa',
  'Gabon': 'Africa',
  'Gambia': 'Africa',
  'Ghana': 'Africa',
  'Guinea': 'Africa',
  'Guinea-Bissau': 'Africa',
  'Guinea Bissau': 'Africa',
  'Ivory Coast': 'Africa',
  'Côte d\'Ivoire': 'Africa',
  'Cote d\'Ivoire': 'Africa',
  'Cote dIvoire': 'Africa',
  'Kenya': 'Africa',
  'Lesotho': 'Africa',
  'Liberia': 'Africa',
  'Libya': 'Africa',
  'Libyan Arab': 'Africa',
  'Libyan Arab Jamahiriya': 'Africa',
  'Madagascar': 'Africa',
  'Malawi': 'Africa',
  'Mali': 'Africa',
  'Mauritania': 'Africa',
  'Mauritius': 'Africa',
  'Mayotte': 'Africa',
  'Morocco': 'Africa',
  'Mozambique': 'Africa',
  'Namibia': 'Africa',
  'Niger': 'Africa',
  'Nigeria': 'Africa',
  'Reunion': 'Africa',
  'Réunion': 'Africa',
  'Rwanda': 'Africa',
  'Sao Tome and Principe': 'Africa',
  'Saint Helena': 'Africa',
  'Senegal': 'Africa',
  'Seychelles': 'Africa',
  'Sierra Leone': 'Africa',
  'Somalia': 'Africa',
  'South Africa': 'Africa',
  'South Sudan': 'Africa',
  'Sudan': 'Africa',
  'Swaziland': 'Africa',
  'Tanzania': 'Africa',
  'Tanzania, United Republic': 'Africa',
  'Tanzania United Republic': 'Africa',
  'Tanzania United Republic of': 'Africa',
  'Togo': 'Africa',
  'Tunisia': 'Africa',
  'Uganda': 'Africa',
  'Zambia': 'Africa',
  'Zimbabwe': 'Africa',

  // Asia
  'Afghanistan': 'Asia',
  'Armenia': 'Asia',
  'Azerbaijan': 'Asia',
  'Bahrain': 'Middle East',
  'Bangladesh': 'Asia',
  'Bhutan': 'Asia',
  'Brunei': 'Asia',
  'Brunei Darussalam': 'Asia',
  'Cambodia': 'Asia',
  'China': 'Asia',
  'Georgia': 'Asia',
  'Hong Kong': 'Asia',
  'India': 'Asia',
  'Indonesia': 'Asia',
  'Iran': 'Middle East',
  'Iran, Islamic Republic Of': 'Middle East',
  'Iran Islamic Republic Of': 'Middle East',
  'Iraq': 'Middle East',
  'Israel': 'Middle East',
  'Japan': 'Asia',
  'Jordan': 'Middle East',
  'Kazakhstan': 'Asia',
  'Kuwait': 'Middle East',
  'Kyrgyzstan': 'Asia',
  'Laos': 'Asia',
  'Lao': 'Asia',
  'Lao People\'s Democratic Republic': 'Asia',
  'Lao PDR': 'Asia',
  'Lebanon': 'Middle East',
  'Macau': 'Asia',
  'Macao': 'Asia',
  'Malaysia': 'Asia',
  'Maldives': 'Asia',
  'Mongolia': 'Asia',
  'Myanmar': 'Asia',
  'Nepal': 'Asia',
  'North Korea': 'Asia',
  'Oman': 'Middle East',
  'Pakistan': 'Asia',
  'Palestine': 'Middle East',
  'Palestinian Territory': 'Middle East',
  'Philippines': 'Asia',
  'Qatar': 'Middle East',
  'Saudi Arabia': 'Middle East',
  'Singapore': 'Asia',
  'South Korea': 'Asia',
  'Korea, Republic of': 'Asia',
  'Korea Republic Of': 'Asia',
  'Korea, Republic Of': 'Asia',
  'Republic of Korea': 'Asia',
  'Sri Lanka': 'Asia',
  'Syria': 'Middle East',
  'Syrian Arab Republic': 'Middle East',
  'Taiwan': 'Asia',
  'Taiwan, Province Of China': 'Asia',
  'Tajikistan': 'Asia',
  'Thailand': 'Asia',
  'Timor-Leste': 'Asia',
  'East Timor': 'Asia',
  'Turkey': 'Europe',
  'Turkmenistan': 'Asia',
  'United Arab Emirates': 'Middle East',
  'UAE': 'Middle East',
  'Uzbekistan': 'Asia',
  'Vietnam': 'Asia',
  'Viet Nam': 'Asia',
  'Yemen': 'Middle East',

  // Europe
  'Albania': 'Europe',
  'Andorra': 'Europe',
  'Austria': 'Europe',
  'Belarus': 'Europe',
  'Belgium': 'Europe',
  'Bosnia and Herzegovina': 'Europe',
  'Bulgaria': 'Europe',
  'Croatia': 'Europe',
  'Cyprus': 'Europe',
  'Czech Republic': 'Europe',
  'Czechia': 'Europe',
  'Denmark': 'Europe',
  'Estonia': 'Europe',
  'Faroe Islands': 'Europe',
  'Finland': 'Europe',
  'France': 'Europe',
  'Germany': 'Europe',
  'Gibraltar': 'Europe',
  'Greece': 'Europe',
  'Greenland': 'Europe',
  'Guernsey': 'Europe',
  'Hungary': 'Europe',
  'Iceland': 'Europe',
  'Ireland': 'Europe',
  'Isle of Man': 'Europe',
  'Italy': 'Europe',
  'Jersey': 'Europe',
  'Kosovo': 'Europe',
  'Latvia': 'Europe',
  'Liechtenstein': 'Europe',
  'Lithuania': 'Europe',
  'Luxembourg': 'Europe',
  'Malta': 'Europe',
  'Moldova': 'Europe',
  'Moldova, Republic Of': 'Europe',
  'Moldova Republic Of': 'Europe',
  'Republic of Moldova': 'Europe',
  'Monaco': 'Europe',
  'Montenegro': 'Europe',
  'Montenegro, Republic of': 'Europe',
  'Netherlands': 'Europe',
  'North Macedonia': 'Europe',
  'Macedonia': 'Europe',
  'Macedonia, Republic Of': 'Europe',
  'Macedonia Republic Of': 'Europe',
  'Republic of Macedonia': 'Europe',
  'The Former Yugoslav Republic of Macedonia': 'Europe',
  'FYROM': 'Europe',
  'Norway': 'Europe',
  'Poland': 'Europe',
  'Portugal': 'Europe',
  'Romania': 'Europe',
  'Russia': 'Europe',
  'Russian Federation': 'Europe',
  'San Marino': 'Europe',
  'Serbia': 'Europe',
  'Serbia Republic of': 'Europe',
  'Serbia and Montenegro': 'Europe',
  'Slovakia': 'Europe',
  'Slovenia': 'Europe',
  'Spain': 'Europe',
  'Svalbard': 'Europe',
  'Sweden': 'Europe',
  'Switzerland': 'Europe',
  'Ukraine': 'Europe',
  'United Kingdom': 'Europe',
  'UK': 'Europe',
  'Great Britain': 'Europe',
  'Britain': 'Europe',
  'England': 'Europe',
  'Scotland': 'Europe',
  'Wales': 'Europe',
  'Northern Ireland': 'Europe',
  'Vatican City': 'Europe',
  'Holy See': 'Europe',

  // North America
  'Bermuda': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',
  'United States': 'North America',
  'USA': 'North America',
  'US': 'North America',

  // Central America & Caribbean
  'Anguilla': 'Caribbean',
  'Antigua and Barbuda': 'Caribbean',
  'Aruba': 'Caribbean',
  'Bahamas': 'Caribbean',
  'Barbados': 'Caribbean',
  'Bonaire': 'Caribbean',
  'Belize': 'Central America',
  'British Virgin Islands': 'Caribbean',
  'Cayman Islands': 'Caribbean',
  'Costa Rica': 'Central America',
  'Cuba': 'Caribbean',
  'Curaçao': 'Caribbean',
  'Curacao': 'Caribbean',
  'Dominica': 'Caribbean',
  'Dominican Republic': 'Caribbean',
  'El Salvador': 'Central America',
  'Grenada': 'Caribbean',
  'Guadeloupe': 'Caribbean',
  'Guatemala': 'Central America',
  'Haiti': 'Caribbean',
  'Honduras': 'Central America',
  'Jamaica': 'Caribbean',
  'Martinique': 'Caribbean',
  'Montserrat': 'Caribbean',
  'Netherlands Antilles': 'Caribbean',
  'Nicaragua': 'Central America',
  'Panama': 'Central America',
  'Puerto Rico': 'Caribbean',
  'Saint Kitts and Nevis': 'Caribbean',
  'Saint Lucia': 'Caribbean',
  'Saint Vincent and the Grenadines': 'Caribbean',
  'Sint Maarten': 'Caribbean',
  'Saint Martin': 'Caribbean',
  'St. Kitts and Nevis': 'Caribbean',
  'St. Lucia': 'Caribbean',
  'St. Vincent': 'Caribbean',
  'Trinidad and Tobago': 'Caribbean',
  'Turks and Caicos': 'Caribbean',
  'Turks and Caicos Islands': 'Caribbean',
  'US Virgin Islands': 'Caribbean',
  'Virgin Islands (US)': 'Caribbean',
  'Virgin Islands (British)': 'Caribbean',

  // South America
  'Argentina': 'South America',
  'Bolivia': 'South America',
  'Bolivia, Plurinational State Of': 'South America',
  'Brazil': 'South America',
  'Chile': 'South America',
  'Colombia': 'South America',
  'Ecuador': 'South America',
  'Falkland Islands': 'South America',
  'Falkland Islands (Malvinas)': 'South America',
  'French Guiana': 'South America',
  'Guyana': 'South America',
  'Paraguay': 'South America',
  'Peru': 'South America',
  'Suriname': 'South America',
  'Uruguay': 'South America',
  'Venezuela': 'South America',
  'Venezuela, Bolivarian Republic Of': 'South America',

  // Oceania
  'American Samoa': 'Oceania',
  'Australia': 'Oceania',
  'Cook Islands': 'Oceania',
  'Fiji': 'Oceania',
  'French Polynesia': 'Oceania',
  'Guam': 'Oceania',
  'Kiribati': 'Oceania',
  'Marshall Islands': 'Oceania',
  'Micronesia': 'Oceania',
  'Micronesia, Federated States Of': 'Oceania',
  'Nauru': 'Oceania',
  'New Caledonia': 'Oceania',
  'New Zealand': 'Oceania',
  'Niue': 'Oceania',
  'Norfolk Island': 'Oceania',
  'Northern Mariana Islands': 'Oceania',
  'Palau': 'Oceania',
  'Papua New Guinea': 'Oceania',
  'Samoa': 'Oceania',
  'Solomon Islands': 'Oceania',
  'Tonga': 'Oceania',
  'Tuvalu': 'Oceania',
  'Vanuatu': 'Oceania',
};

// Helper function to get region for a country
const getRegion = (country: string): string => {
  // Try exact match first
  if (countryToRegion[country]) {
    return countryToRegion[country];
  }
  // Try case-insensitive match
  const lowerCountry = country.toLowerCase();
  for (const [key, value] of Object.entries(countryToRegion)) {
    if (key.toLowerCase() === lowerCountry) {
      return value;
    }
  }
  return 'Other';
};

// Region display order for the country selector dropdown
const REGION_ORDER = [
  'Africa',
  'Asia',
  'Europe',
  'Middle East',
  'North America',
  'Central America',
  'Caribbean',
  'South America',
  'Oceania',
  'Other'
];

interface NetworkData {
  network_name: string;
  country: string;
  region: string;
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
  // Raw data price for expensive network filtering (before markup)
  _rawDataPrice?: number;
}

interface GroupedNetwork {
  network_name: string;
  country: string;
  region: string;
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

// Threshold for expensive networks (data cost > $1/MB is considered expensive)
const EXPENSIVE_NETWORK_THRESHOLD = 1.0; // $1.00 per MB

// Cache for network data to avoid reloading on every page visit
let networkDataCache: { data: any[] | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export const PricingTable: React.FC<PricingTableProps> = ({ currency: propCurrency, onCurrencyChange }) => {
  const { isSales, isAdmin } = useUser();
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [allNetworks, setAllNetworks] = useState<NetworkData[]>([]); // Store all networks including hidden ones
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>(propCurrency || 'USD');
  const [dataUnit, setDataUnit] = useState<'MB' | 'GB'>('MB');
  const [markupMultiplier, setMarkupMultiplier] = useState<1.0 | 1.1 | 1.5>(1.0);
  const [exchangeRate, setExchangeRate] = useState(1.1); // Default EUR to USD rate
  const [exchangeRateStatus, setExchangeRateStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [selectedIdentities, setSelectedIdentities] = useState<Set<string>>(new Set());
  const [showHiddenNetworks, setShowHiddenNetworks] = useState(false);
  
  // Search and sort state
  const [networkSearch, setNetworkSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [tadigSearch, setTagidSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  // Multi-select filters for Identity, Network Tech, and LP-WAN
  const [selectedIdentityFilters, setSelectedIdentityFilters] = useState<Set<string>>(new Set());
  const [selectedGenFilters, setSelectedGenFilters] = useState<Set<string>>(new Set());
  const [selectedLpwanFilters, setSelectedLpwanFilters] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'network' | 'country' | 'region' | 'tadig' | 'source' | 'generation' | 'data' | 'sms' | 'imsi' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Search box / dropdown visibility state
  const [showNetworkSearch, setShowNetworkSearch] = useState(false);
  const [showCountrySearch, setShowCountrySearch] = useState(false);
  const [showTagidSearch, setShowTagidSearch] = useState(false);
  const [showRegionSearch, setShowRegionSearch] = useState(false);
  const [showIdentityDropdown, setShowIdentityDropdown] = useState(false);
  const [showGenDropdown, setShowGenDropdown] = useState(false);
  const [showLpwanDropdown, setShowLpwanDropdown] = useState(false);

  // Country multi-select with region grouping
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countryDropdownSearch, setCountryDropdownSearch] = useState('');

  // Price threshold: $1/MB = approximately €0.90/MB at 1.1 exchange rate
  const MAX_REASONABLE_PRICE_EUR_MB = 0.90;

  const fetchExchangeRate = async () => {
    try {
      setExchangeRateStatus('loading');
      // Using a free API for exchange rates
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      const data = await response.json();
      if (data.rates && data.rates.USD) {
        setExchangeRate(data.rates.USD);
        setExchangeRateStatus('success');
      } else {
        setExchangeRateStatus('error');
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setExchangeRateStatus('error');
      // Keep default rate if API fails
    }
  };

  const loadNetworks = useCallback(async () => {
    try {
      // Check if we have valid cached data
      const now = Date.now();
      const cacheValid = networkDataCache.data && (now - networkDataCache.timestamp) < CACHE_DURATION;

      let pricingData: any[];

      if (cacheValid) {
        console.log('Using cached network data');
        pricingData = networkDataCache.data!;
      } else {
        console.log('Loading networks from Supabase network_pricing...');

        // Primary source: Supabase network_pricing table
        // Fetch all records in batches (Supabase has 1000 row limit per request)
        const allData: any[] = [];
        const batchSize = 1000;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data: batch, error: batchError } = await supabase
            .from('network_pricing')
            .select('*')
            .order('country', { ascending: true })
            .order('network_name', { ascending: true })
            .range(offset, offset + batchSize - 1);

          if (batchError) {
            console.error('Error fetching from network_pricing:', batchError);
            throw batchError;
          }

          if (batch && batch.length > 0) {
            allData.push(...batch);
            offset += batchSize;
            hasMore = batch.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        pricingData = allData;

        // Store in cache
        networkDataCache = { data: pricingData, timestamp: now };
        console.log(`Cached ${pricingData.length} records`);
      }

      if (pricingData && pricingData.length > 0) {
        console.log(`Loaded ${pricingData.length} records from Supabase`);

        // Transform Supabase data to match our interface
        const transformedData: NetworkData[] = pricingData.map((item: any) => {
          // Get raw data price for expensive network check (before markup)
          // Handle both numeric and string values from database
          const rawDataPriceValue = item.data_per_mb;
          const rawDataPrice = typeof rawDataPriceValue === 'number'
            ? rawDataPriceValue
            : parseFloat(String(rawDataPriceValue)) || 0;

          const smsPrice = parseFloat(item.sms_cost) || 0;
          const imsiPrice = parseFloat(item.imsi_cost) || 0;

          // Apply role-based markup if user is sales
          const adjustedDataPrice = isSales ? rawDataPrice * 1.5 : rawDataPrice;
          const adjustedSmsPrice = isSales ? smsPrice * 1.5 : smsPrice;
          const adjustedImsiPrice = isSales ? imsiPrice * 1.5 : imsiPrice;

          return {
            network_name: item.network_name,
            country: item.country,
            region: getRegion(item.country),
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
            // Store raw price for expensive network filtering
            _rawDataPrice: rawDataPrice,
          };
        });

        // Filter out expensive networks (data cost > $1/MB before markup)
        // These are blocked in roaming policy and customers won't use them
        const regularNetworks = transformedData.filter((n: NetworkData) => {
          const price = n._rawDataPrice;
          // Include if price is missing, zero, or below threshold
          if (price === undefined || price === null || isNaN(price)) return true;
          return price <= EXPENSIVE_NETWORK_THRESHOLD;
        });
        const expensiveNetworks = transformedData.filter((n: NetworkData) => {
          const price = n._rawDataPrice;
          // Only include if price is a valid number above threshold
          if (price === undefined || price === null || isNaN(price)) return false;
          return price > EXPENSIVE_NETWORK_THRESHOLD;
        });

        console.log(`[PricingTable] Network filtering: Total=${transformedData.length}, Regular=${regularNetworks.length}, Expensive=${expensiveNetworks.length}`);

        // allNetworks contains everything (for admins to see when toggling)
        // Create new array references to ensure React detects changes
        setAllNetworks([...transformedData]);
        // networks contains only non-expensive networks (default view for everyone)
        // Admin and sales both see regular networks by default
        setNetworks([...regularNetworks]);
        return;
      }

      // No data in Supabase - show empty state
      console.log('No data in network_pricing table');
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

  // Data is stored in USD - convert to EUR when needed
  const convertCurrency = (value: number): number => {
    return currency === 'EUR' ? value / exchangeRate : value;
  };

  const formatDataPrice = (value: number, includeSymbol: boolean = false): string => {
    if (value === 0 || value === null || value === undefined) return '';

    // Apply markup multiplier first
    const markedUpValue = value * markupMultiplier;

    // Convert MB to GB if needed (1 GB = 1024 MB)
    const adjustedValue = dataUnit === 'GB' ? markedUpValue * 1024 : markedUpValue;
    const converted = convertCurrency(adjustedValue);

    const decimals = dataUnit === 'GB' ? 2 : 4;
    const symbol = currency === 'EUR' ? '€' : '$';
    const unit = `/${dataUnit}`;

    if (includeSymbol) {
      return `${symbol}${converted.toFixed(decimals)}${unit}`;
    }
    return `${symbol}${converted.toFixed(decimals)}${unit}`;
  };

  const formatCurrency = (value: number, decimals: number = 4, includeSymbol: boolean = false): string => {
    if (value === 0 || value === null || value === undefined) return '';

    // Apply markup multiplier first
    const markedUpValue = value * markupMultiplier;
    const converted = convertCurrency(markedUpValue);
    const symbol = currency === 'EUR' ? '€' : '$';
    if (includeSymbol) {
      return `${symbol}${converted.toFixed(decimals)}`;
    }
    return `${symbol}${converted.toFixed(decimals)}`;
  };

  const handleSort = (field: 'network' | 'country' | 'region' | 'tadig' | 'source' | 'generation' | 'data' | 'sms' | 'imsi') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Close all dropdowns/search boxes
  const closeAllDropdowns = () => {
    setShowNetworkSearch(false);
    setShowCountrySearch(false);
    setShowTagidSearch(false);
    setShowRegionSearch(false);
    setShowIdentityDropdown(false);
    setShowGenDropdown(false);
    setShowLpwanDropdown(false);
    setShowCountryDropdown(false);
    setCountryDropdownSearch('');
  };

  const toggleSearchBox = (field: 'network' | 'country' | 'tadig' | 'region') => {
    closeAllDropdowns();
    if (field === 'network') {
      setShowNetworkSearch(!showNetworkSearch);
    } else if (field === 'country') {
      setShowCountrySearch(!showCountrySearch);
    } else if (field === 'tadig') {
      setShowTagidSearch(!showTagidSearch);
    } else if (field === 'region') {
      setShowRegionSearch(!showRegionSearch);
    }
  };

  const toggleDropdown = (field: 'identity' | 'generation' | 'lpwan') => {
    closeAllDropdowns();
    if (field === 'identity') {
      setShowIdentityDropdown(!showIdentityDropdown);
    } else if (field === 'generation') {
      setShowGenDropdown(!showGenDropdown);
    } else if (field === 'lpwan') {
      setShowLpwanDropdown(!showLpwanDropdown);
    }
  };

  // Toggle filter selection for multi-select dropdowns
  const toggleIdentityFilter = (value: string) => {
    const newSet = new Set(selectedIdentityFilters);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setSelectedIdentityFilters(newSet);
  };

  const toggleGenFilter = (value: string) => {
    const newSet = new Set(selectedGenFilters);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setSelectedGenFilters(newSet);
  };

  const toggleLpwanFilter = (value: string) => {
    const newSet = new Set(selectedLpwanFilters);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setSelectedLpwanFilters(newSet);
  };

  const groupNetworks = (networks: NetworkData[]): GroupedNetwork[] => {
    const grouped: Record<string, GroupedNetwork> = {};

    networks.forEach(network => {
      const key = `${network.network_name}_${network.country}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          network_name: network.network_name,
          country: network.country,
          region: network.region,
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

  // Apply show/hide toggle - admin can reveal expensive networks
  const visibleNetworks = showHiddenNetworks ? allNetworks : networks;

  // Group available countries by region for the dropdown
  const availableCountriesByRegion = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    const seen = new Set<string>();

    visibleNetworks.forEach(network => {
      if (network.country && !seen.has(network.country)) {
        seen.add(network.country);
        const region = getRegion(network.country);
        if (!grouped[region]) {
          grouped[region] = [];
        }
        grouped[region].push(network.country);
      }
    });

    // Sort countries within each region
    Object.keys(grouped).forEach(region => {
      grouped[region].sort();
    });

    return grouped;
  }, [visibleNetworks]);

  // Filter countries in dropdown based on search term
  const filteredCountriesByRegion = useMemo(() => {
    if (!countryDropdownSearch.trim()) {
      return availableCountriesByRegion;
    }

    const searchLower = countryDropdownSearch.toLowerCase().trim();
    const filtered: Record<string, string[]> = {};

    Object.entries(availableCountriesByRegion).forEach(([region, countries]) => {
      const matchingCountries = countries.filter(country =>
        country.toLowerCase().includes(searchLower)
      );
      if (matchingCountries.length > 0) {
        filtered[region] = matchingCountries;
      }
    });

    return filtered;
  }, [availableCountriesByRegion, countryDropdownSearch]);

  // Toggle individual country selection
  const toggleCountrySelection = (country: string) => {
    const newSet = new Set(selectedCountries);
    if (newSet.has(country)) {
      newSet.delete(country);
    } else {
      newSet.add(country);
    }
    setSelectedCountries(newSet);
  };

  // Toggle entire region selection
  const toggleRegionSelection = (region: string) => {
    const countriesInRegion = availableCountriesByRegion[region] || [];
    const newSet = new Set(selectedCountries);

    // Check if all countries in region are currently selected
    const allSelected = countriesInRegion.every(country => newSet.has(country));

    if (allSelected) {
      // Deselect all countries in this region
      countriesInRegion.forEach(country => newSet.delete(country));
    } else {
      // Select all countries in this region
      countriesInRegion.forEach(country => newSet.add(country));
    }

    setSelectedCountries(newSet);
  };

  // Toggle region expand/collapse
  const toggleRegionExpand = (region: string) => {
    const newSet = new Set(expandedRegions);
    if (newSet.has(region)) {
      newSet.delete(region);
    } else {
      newSet.add(region);
    }
    setExpandedRegions(newSet);
  };

  // Check if a region is fully selected
  const isRegionFullySelected = (region: string): boolean => {
    const countriesInRegion = availableCountriesByRegion[region] || [];
    if (countriesInRegion.length === 0) return false;
    return countriesInRegion.every(country => selectedCountries.has(country));
  };

  // Check if a region is partially selected
  const isRegionPartiallySelected = (region: string): boolean => {
    const countriesInRegion = availableCountriesByRegion[region] || [];
    if (countriesInRegion.length === 0) return false;
    const selectedCount = countriesInRegion.filter(c => selectedCountries.has(c)).length;
    return selectedCount > 0 && selectedCount < countriesInRegion.length;
  };

  // Get count of selected countries in a region
  const getRegionSelectedCount = (region: string): number => {
    const countriesInRegion = availableCountriesByRegion[region] || [];
    return countriesInRegion.filter(c => selectedCountries.has(c)).length;
  };

  // Clear all country selections
  const clearAllCountries = () => {
    setSelectedCountries(new Set());
  };

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

    // Apply country multi-select filter
    if (selectedCountries.size > 0 && !selectedCountries.has(network.country)) {
      return false;
    }

    if (tadigSearch && !network.tadig.toLowerCase().includes(tadigSearch.toLowerCase().trim())) {
      return false;
    }

    if (regionSearch && !network.region.toLowerCase().includes(regionSearch.toLowerCase().trim())) {
      return false;
    }

    // Apply Identity multi-select filter
    if (selectedIdentityFilters.size > 0) {
      const identityLetter = network.identity?.includes('-')
        ? network.identity.split('-').pop()
        : network.identity;
      if (!identityLetter || !selectedIdentityFilters.has(identityLetter)) {
        return false;
      }
    }

    // Apply Network Tech multi-select filter
    if (selectedGenFilters.size > 0) {
      const networkGens: string[] = [];
      if (network.gsm || network.gprs2G) networkGens.push('2G');
      if (network.umts3G) networkGens.push('3G');
      if (network.lte4G) networkGens.push('4G');
      if (network.lte5G) networkGens.push('5G');
      // Check if any of the network's generations match the selected filters
      const hasMatchingGen = networkGens.some(gen => selectedGenFilters.has(gen));
      if (!hasMatchingGen) {
        return false;
      }
    }

    // Apply LP-WAN Tech multi-select filter
    if (selectedLpwanFilters.size > 0) {
      const networkLpwan: string[] = [];
      if (network.lte_m) networkLpwan.push('Cat-M');
      if (network.nb_iot) networkLpwan.push('NB-IoT');
      // Check if any of the network's LP-WAN tech matches the selected filters
      const hasMatchingLpwan = networkLpwan.some(lpwan => selectedLpwanFilters.has(lpwan));
      if (!hasMatchingLpwan) {
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
    } else if (sortField === 'region') {
      const comparison = a.region.localeCompare(b.region);
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
    } else if (sortField === 'data') {
      // Sort by lowest data cost from sources
      const aDataCost = Math.min(...a.sources.map(s => s.data_cost || Infinity));
      const bDataCost = Math.min(...b.sources.map(s => s.data_cost || Infinity));
      const comparison = aDataCost - bDataCost;
      return sortDirection === 'asc' ? comparison : -comparison;
    } else if (sortField === 'sms') {
      // Sort by lowest SMS cost from sources
      const aSmsCost = Math.min(...a.sources.map(s => s.sms_cost || Infinity));
      const bSmsCost = Math.min(...b.sources.map(s => s.sms_cost || Infinity));
      const comparison = aSmsCost - bSmsCost;
      return sortDirection === 'asc' ? comparison : -comparison;
    } else if (sortField === 'imsi') {
      // Sort by lowest IMSI cost from sources
      const aImsiCost = Math.min(...a.sources.map(s => s.imsi_cost || Infinity));
      const bImsiCost = Math.min(...b.sources.map(s => s.imsi_cost || Infinity));
      const comparison = aImsiCost - bImsiCost;
      return sortDirection === 'asc' ? comparison : -comparison;
    }
    return 0;
  });
  
  // Export functionality
  const exportToCSV = () => {
    const headers = ['Region', 'Country', 'Network', 'TADIG', 'Identity', `Data (${currency}/${dataUnit})`, `SMS (${currency})`, `IMSI (${currency})`, 'NETWORK TECH.', 'Cat-M', 'NB-IoT', 'Notes'];
    const rows = filteredNetworks.map(network => {
      // Build generation string for CSV
      const generations = [];
      if (network.gsm) generations.push('2G');
      if (network.gprs2G && !generations.includes('2G')) generations.push('2G');
      if (network.umts3G) generations.push('3G');
      if (network.lte4G) generations.push('4G');
      if (network.lte5G) generations.push('5G');

      return [
        network.region,
        network.country,
        network.network_name,
        network.tadig,
        network.identity || '',
        formatDataPrice(network.data_cost),
        formatCurrency(network.sms_cost, 4),
        formatCurrency(network.imsi_cost, 4),
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
                const markedUpPrice = avgPrice * markupMultiplier;
                const adjustedValue = dataUnit === 'GB' ? markedUpPrice * 1024 : markedUpPrice;
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
            {/* Filter Buttons Row: B,E,O,U | 2G,3G,4G,5G | NB-IoT,Cat-M | Hidden (admin) */}
            <div className="flex items-center gap-1">
              {/* Identity Filters: B, E, O, U */}
              {['B', 'E', 'O', 'U'].map((identity) => {
                const config = operatorConfig[identity as keyof typeof operatorConfig];
                return (
                  <button
                    key={identity}
                    onClick={() => toggleIdentity(identity)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all border ${
                      selectedIdentities.has(identity)
                        ? `${config.bgColor} ${config.color} ${config.borderColor} border-2`
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {identity}
                  </button>
                );
              })}

              {/* Vertical Separator */}
              <div className="h-5 w-px bg-gray-300 mx-2" />

              {/* Technology Filters: 2G, 3G, 4G, 5G */}
              {['2G', '3G', '4G', '5G'].map((tech) => (
                <button
                  key={tech}
                  onClick={() => {
                    const newSet = new Set(selectedGenFilters);
                    if (newSet.has(tech)) {
                      newSet.delete(tech);
                    } else {
                      newSet.add(tech);
                    }
                    setSelectedGenFilters(newSet);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all border ${
                    selectedGenFilters.has(tech)
                      ? 'bg-blue-50 text-blue-600 border-blue-200 border-2'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {tech}
                </button>
              ))}

              {/* Vertical Separator */}
              <div className="h-5 w-px bg-gray-300 mx-2" />

              {/* LP-WAN Filters: NB-IoT, Cat-M */}
              {[
                { label: 'NB-IoT', value: 'NB-IoT' },
                { label: 'Cat-M', value: 'Cat-M' }
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => {
                    const newSet = new Set(selectedLpwanFilters);
                    if (newSet.has(value)) {
                      newSet.delete(value);
                    } else {
                      newSet.add(value);
                    }
                    setSelectedLpwanFilters(newSet);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all border ${
                    selectedLpwanFilters.has(value)
                      ? 'bg-purple-50 text-purple-600 border-purple-200 border-2'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}

              {/* Vertical Separator + Hidden Networks Button (Admin only) */}
              {isAdmin && (
                <>
                  <div className="h-5 w-px bg-gray-300 mx-2" />
                  <button
                    onClick={() => setShowHiddenNetworks(!showHiddenNetworks)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-all border ${
                      showHiddenNetworks
                        ? 'bg-orange-50 text-orange-600 border-orange-200 border-2'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                    title={showHiddenNetworks
                      ? 'Currently showing all networks including expensive ones. Click to hide expensive networks.'
                      : `${allNetworks.length - networks.length} expensive networks (>$${EXPENSIVE_NETWORK_THRESHOLD}/MB) are hidden. Click to show them.`
                    }
                  >
                    {showHiddenNetworks ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span className="px-1 py-0.5 bg-white rounded text-xs">
                      {showHiddenNetworks ? 0 : allNetworks.length - networks.length}
                    </span>
                  </button>
                </>
              )}
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

            {/* Markup Multiplier Toggle - Admin Only */}
            {isAdmin && (
              <div className="flex items-center bg-gray-50 rounded-xl p-1">
                <button
                  onClick={() => setMarkupMultiplier(1.0)}
                  className={`px-3 py-0.5.5 rounded-lg text-sm transition-all ${
                    markupMultiplier === 1.0
                      ? 'bg-white text-[#5B9BD5] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="No markup (1.0x)"
                >
                  1.0
                </button>
                <button
                  onClick={() => setMarkupMultiplier(1.1)}
                  className={`px-3 py-0.5.5 rounded-lg text-sm transition-all ${
                    markupMultiplier === 1.1
                      ? 'bg-white text-[#5B9BD5] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="10% markup (1.1x)"
                >
                  1.1
                </button>
                <button
                  onClick={() => setMarkupMultiplier(1.5)}
                  className={`px-3 py-0.5.5 rounded-lg text-sm transition-all ${
                    markupMultiplier === 1.5
                      ? 'bg-white text-[#5B9BD5] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="50% markup (1.5x)"
                >
                  1.5
                </button>
              </div>
            )}

            {/* Currency Toggle - Right Side */}
            <div className="flex items-center gap-2">
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
              {/* Exchange Rate Status Indicator */}
              <div
                className="flex items-center gap-1"
                title={exchangeRateStatus === 'success'
                  ? `Live rate: 1 EUR = ${exchangeRate.toFixed(4)} USD`
                  : exchangeRateStatus === 'error'
                    ? `Using fallback rate: 1 EUR = ${exchangeRate} USD`
                    : 'Loading exchange rate...'}
              >
                <div className={`w-2 h-2 rounded-full ${
                  exchangeRateStatus === 'success'
                    ? 'bg-green-500'
                    : exchangeRateStatus === 'error'
                      ? 'bg-yellow-500'
                      : 'bg-gray-300 animate-pulse'
                }`} />
                <span className="text-xs text-gray-400">
                  {exchangeRateStatus === 'success' ? exchangeRate.toFixed(2) : '...'}
                </span>
              </div>
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
          {(searchTerm || networkSearch || countrySearch || tadigSearch || regionSearch || selectedIdentities.size > 0 || selectedIdentityFilters.size > 0 || selectedGenFilters.size > 0 || selectedLpwanFilters.size > 0 || selectedCountries.size > 0) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <span>Active filters:
                {searchTerm && <strong className="text-gray-700 ml-1">General: "{searchTerm}"</strong>}
                {regionSearch && <strong className="text-gray-700 ml-1">Region: "{regionSearch}"</strong>}
                {networkSearch && <strong className="text-gray-700 ml-1">Network: "{networkSearch}"</strong>}
                {countrySearch && <strong className="text-gray-700 ml-1">Country: "{countrySearch}"</strong>}
                {selectedCountries.size > 0 && <strong className="text-gray-700 ml-1">Countries: {selectedCountries.size} selected</strong>}
                {tadigSearch && <strong className="text-gray-700 ml-1">TADIG: "{tadigSearch}"</strong>}
                {selectedIdentities.size > 0 && <strong className="text-gray-700 ml-1">Carriers: {Array.from(selectedIdentities).join(', ')}</strong>}
                {selectedIdentityFilters.size > 0 && <strong className="text-gray-700 ml-1">Identity: {Array.from(selectedIdentityFilters).join(', ')}</strong>}
                {selectedGenFilters.size > 0 && <strong className="text-gray-700 ml-1">Network Tech: {Array.from(selectedGenFilters).join(', ')}</strong>}
                {selectedLpwanFilters.size > 0 && <strong className="text-gray-700 ml-1">LP-WAN: {Array.from(selectedLpwanFilters).join(', ')}</strong>}
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setNetworkSearch('');
                  setCountrySearch('');
                  setTagidSearch('');
                  setRegionSearch('');
                  setSelectedIdentities(new Set());
                  setSelectedIdentityFilters(new Set());
                  setSelectedGenFilters(new Set());
                  setSelectedLpwanFilters(new Set());
                  setSelectedCountries(new Set());
                  setExpandedRegions(new Set());
                  // Hide all search boxes/dropdowns
                  closeAllDropdowns();
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
        <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-2xl">
          <table className="w-full min-w-[1200px]">
          <colgroup>
            <col className="w-[110px]" /> {/* Region */}
            <col className="w-[140px]" /> {/* Country */}
            <col className="w-[220px]" /> {/* Network */}
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
                  <span>Region</span>
                  <button
                    onClick={() => handleSort('region')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort regions"
                  >
                    {sortField === 'region' ? (
                      sortDirection === 'asc' ?
                      <ArrowUp className="w-3 h-3 text-gray-500" /> :
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSearchBox('region')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Search regions"
                  >
                    <Search className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
                {showRegionSearch && (
                  <input
                    type="text"
                    placeholder="Search regions..."
                    value={regionSearch}
                    onChange={(e) => setRegionSearch(e.target.value)}
                    className="mt-1 w-full px-2 py-0.5 text-xs bg-gray-50 border-0 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white placeholder-gray-400"
                    autoFocus
                  />
                )}
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 relative">
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
                    onClick={() => {
                      closeAllDropdowns();
                      setShowCountryDropdown(!showCountryDropdown);
                    }}
                    className={`relative transition-opacity p-1 hover:bg-gray-200 rounded ${
                      showCountryDropdown || selectedCountries.size > 0
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title="Filter by country/region"
                  >
                    <Search className={`w-3 h-3 ${selectedCountries.size > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                    {selectedCountries.size > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] rounded-full w-3 h-3 flex items-center justify-center">
                        {selectedCountries.size}
                      </span>
                    )}
                  </button>
                </div>
                {/* Country Multi-Select Dropdown with Region Grouping */}
                {showCountryDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] min-w-[220px]">
                    {/* Search Input */}
                    <div className="p-1.5 border-b border-gray-100">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={countryDropdownSearch}
                        onChange={(e) => setCountryDropdownSearch(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white"
                        autoFocus
                      />
                    </div>

                    {/* Selected Count & Clear All */}
                    {selectedCountries.size > 0 && (
                      <div className="px-2 py-1 bg-blue-50 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-blue-700 font-medium">
                          {selectedCountries.size} selected
                        </span>
                        <button
                          onClick={clearAllCountries}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    {/* Region Groups */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {REGION_ORDER.filter(region => filteredCountriesByRegion[region]?.length > 0).map(region => {
                        const countries = filteredCountriesByRegion[region] || [];
                        const isExpanded = expandedRegions.has(region) || countryDropdownSearch.trim() !== '';
                        const isFullySelected = isRegionFullySelected(region);
                        const isPartiallySelected = isRegionPartiallySelected(region);
                        const selectedCount = getRegionSelectedCount(region);

                        return (
                          <div key={region} className="border-b border-gray-100 last:border-b-0">
                            {/* Region Header */}
                            <div
                              className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                              onClick={() => toggleRegionExpand(region)}
                            >
                              <input
                                type="checkbox"
                                checked={isFullySelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = isPartiallySelected;
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleRegionSelection(region);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3 h-3 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <ChevronRight
                                className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              />
                              <span className="text-xs font-medium text-gray-700 flex-1">{region}</span>
                              <span className="text-[10px] text-gray-500">
                                {selectedCount > 0 ? `${selectedCount}/` : ''}{countries.length}
                              </span>
                            </div>

                            {/* Country List (when expanded) */}
                            {isExpanded && (
                              <div className="bg-white">
                                {countries.map(country => (
                                  <label
                                    key={country}
                                    className="flex items-center gap-1.5 px-2 py-0.5 pl-7 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedCountries.has(country)}
                                      onChange={() => toggleCountrySelection(country)}
                                      className="w-3 h-3 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-700">{country}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Empty State */}
                      {Object.keys(filteredCountriesByRegion).length === 0 && (
                        <div className="px-2 py-2 text-center text-xs text-gray-500">
                          No match
                        </div>
                      )}
                    </div>
                  </div>
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
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 relative">
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
                    onClick={() => toggleDropdown('identity')}
                    className={`transition-opacity p-1 hover:bg-gray-200 rounded ${showIdentityDropdown || selectedIdentityFilters.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Filter by identity"
                  >
                    <Search className={`w-3 h-3 ${selectedIdentityFilters.size > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                  </button>
                </div>
                {showIdentityDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                    {['B', 'E', 'O', 'U'].map(identity => (
                      <label key={identity} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIdentityFilters.has(identity)}
                          onChange={() => toggleIdentityFilter(identity)}
                          className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{identity}</span>
                      </label>
                    ))}
                  </div>
                )}
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1 group">
                  <span>Data</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                  <button
                    onClick={() => handleSort('data')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort by data cost"
                  >
                    {sortField === 'data' ? (
                      sortDirection === 'asc' ?
                      <ArrowUp className="w-3 h-3 text-gray-500" /> :
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1 group">
                  <span>SMS</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                  <button
                    onClick={() => handleSort('sms')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort by SMS cost"
                  >
                    {sortField === 'sms' ? (
                      sortDirection === 'asc' ?
                      <ArrowUp className="w-3 h-3 text-gray-500" /> :
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                <div className="flex items-center gap-1 group">
                  <span>IMSI</span>
                  {isSales && <Lock className="w-3 h-3 text-blue-500" />}
                  <button
                    onClick={() => handleSort('imsi')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                    title="Sort by IMSI cost"
                  >
                    {sortField === 'imsi' ? (
                      sortDirection === 'asc' ?
                      <ArrowUp className="w-3 h-3 text-gray-500" /> :
                      <ArrowDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 relative">
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
                    onClick={() => toggleDropdown('generation')}
                    className={`transition-opacity p-1 hover:bg-gray-200 rounded ${showGenDropdown || selectedGenFilters.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Filter by network technology"
                  >
                    <Search className={`w-3 h-3 ${selectedGenFilters.size > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                  </button>
                </div>
                {showGenDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                    {['2G', '3G', '4G', '5G'].map(gen => (
                      <label key={gen} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGenFilters.has(gen)}
                          onChange={() => toggleGenFilter(gen)}
                          className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{gen}</span>
                      </label>
                    ))}
                  </div>
                )}
              </th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap relative">
                <div className="flex items-center gap-1 group">
                  <span>LP-WAN Tech.</span>
                  <button
                    onClick={() => toggleDropdown('lpwan')}
                    className={`transition-opacity p-1 hover:bg-gray-200 rounded ${showLpwanDropdown || selectedLpwanFilters.size > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Filter by LP-WAN technology"
                  >
                    <Search className={`w-3 h-3 ${selectedLpwanFilters.size > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                  </button>
                </div>
                {showLpwanDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                    {['Cat-M', 'NB-IoT'].map(lpwan => (
                      <label key={lpwan} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLpwanFilters.has(lpwan)}
                          onChange={() => toggleLpwanFilter(lpwan)}
                          className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{lpwan}</span>
                      </label>
                    ))}
                  </div>
                )}
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
                    if (source.lte_m) technologies.push('Cat-M');
                    if (source.nb_iot) technologies.push('NB-IoT');

                    // Display identity value (e.g., "Monogoto-B") or fall back to operator
                    const displayIdentity = source.identity || source.operator;

                    return (
                      <tr
                        key={`${networkIndex}-${sourceIndex}`}
                        className={`hover:bg-gray-50 transition-colors ${isLastSource ? 'border-b border-gray-200' : ''}`}
                      >
                        {/* Region - only show on first row, span all sources */}
                        {isFirstSource && (
                          <td
                            className="px-2 py-0.5 text-gray-700 text-sm align-top"
                            rowSpan={rowSpan}
                          >
                            {network.region}
                          </td>
                        )}
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
                          <td className="px-2 py-0.5 text-gray-700 text-sm align-top" rowSpan={rowSpan}>
                            {network.network_name}
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
                                  const isDouble = (tech === 'Cat-M' && source.lte_m_double) || (tech === 'NB-IoT' && source.nb_iot_double);
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