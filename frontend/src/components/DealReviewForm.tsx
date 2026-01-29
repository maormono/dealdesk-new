import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calculator, Plus, X, Loader2, TrendingUp, AlertCircle, Globe, Smartphone, DollarSign, Wifi, Network, Edit, Maximize2, Minimize2, ChevronDown, ChevronRight, FilePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dealConfig } from '../config/dealConfig';
import type { DealRequest, DealEvaluation, SavedDeal } from '../config/dealConfig';
import { DealEvaluationService } from '../services/dealEvaluationService';
import { EnhancedDealService } from '../services/enhancedDealService';
import { ComprehensiveDealService } from '../services/comprehensiveDealService';
import { dealPersistenceService } from '../services/dealPersistenceService';
import type { DealRequestMandatory } from '../services/comprehensiveDealService';
import { formatDealForSales } from '../utils/dealFormatter';
import { DealProposalView } from './DealProposalView';
import '../styles/monogoto-theme.css';

// Country to Region mapping (comprehensive with all name variations)
const countryToRegion: Record<string, string> = {
  // Africa
  'Algeria': 'Africa', 'Angola': 'Africa', 'Benin': 'Africa', 'Buneer': 'Africa',
  'Botswana': 'Africa', 'Burkina Faso': 'Africa', 'Burundi': 'Africa', 'Cameroon': 'Africa',
  'Cape Verde': 'Africa', 'Cabo Verde': 'Africa', 'Central African Republic': 'Africa',
  'Chad': 'Africa', 'Comoros': 'Africa', 'Congo': 'Africa',
  'Congo, Democratic Republic': 'Africa', 'Congo Democratic Republic': 'Africa',
  'Congo Democratic Republic of': 'Africa', 'Congo Democratic Rep of': 'Africa',
  'Congo, Democratic Republic of the': 'Africa', 'Congo Democratic': 'Africa',
  'Congo Republic Of': 'Africa', 'Congo Rep of': 'Africa', 'Congo, Republic Of': 'Africa',
  'Democratic Republic of the Congo': 'Africa', 'Djibouti': 'Africa', 'Egypt': 'Africa',
  'Equatorial Guinea': 'Africa', 'Eritrea': 'Africa', 'Eswatini': 'Africa', 'Ethiopia': 'Africa',
  'Gabon': 'Africa', 'Gambia': 'Africa', 'Ghana': 'Africa', 'Guinea': 'Africa',
  'Guinea-Bissau': 'Africa', 'Guinea Bissau': 'Africa', 'Ivory Coast': 'Africa',
  "Côte d'Ivoire": 'Africa', "Cote d'Ivoire": 'Africa', 'Cote dIvoire': 'Africa',
  'Kenya': 'Africa', 'Lesotho': 'Africa', 'Liberia': 'Africa', 'Libya': 'Africa',
  'Libyan Arab': 'Africa', 'Libyan Arab Jamahiriya': 'Africa', 'Madagascar': 'Africa',
  'Malawi': 'Africa', 'Mali': 'Africa', 'Mauritania': 'Africa', 'Mauritius': 'Africa',
  'Mayotte': 'Africa', 'Morocco': 'Africa', 'Mozambique': 'Africa', 'Namibia': 'Africa',
  'Niger': 'Africa', 'Nigeria': 'Africa', 'Reunion': 'Africa', 'Réunion': 'Africa',
  'Rwanda': 'Africa', 'Sao Tome and Principe': 'Africa', 'Saint Helena': 'Africa',
  'Senegal': 'Africa', 'Seychelles': 'Africa', 'Sierra Leone': 'Africa', 'Somalia': 'Africa',
  'South Africa': 'Africa', 'South Sudan': 'Africa', 'Sudan': 'Africa', 'Swaziland': 'Africa',
  'Tanzania': 'Africa', 'Tanzania, United Republic': 'Africa', 'Tanzania United Republic': 'Africa',
  'Tanzania United Republic of': 'Africa', 'Togo': 'Africa', 'Tunisia': 'Africa',
  'Uganda': 'Africa', 'Zambia': 'Africa', 'Zimbabwe': 'Africa',
  // Asia
  'Afghanistan': 'Asia', 'Armenia': 'Asia', 'Azerbaijan': 'Asia', 'Bangladesh': 'Asia',
  'Bhutan': 'Asia', 'Brunei': 'Asia', 'Brunei Darussalam': 'Asia', 'Cambodia': 'Asia',
  'China': 'Asia', 'Georgia': 'Asia', 'Hong Kong': 'Asia', 'India': 'Asia',
  'Indonesia': 'Asia', 'Japan': 'Asia', 'Kazakhstan': 'Asia', 'Kyrgyzstan': 'Asia',
  'Laos': 'Asia', 'Lao': 'Asia', "Lao People's Democratic Republic": 'Asia', 'Lao PDR': 'Asia',
  'Macau': 'Asia', 'Macao': 'Asia', 'Malaysia': 'Asia', 'Maldives': 'Asia',
  'Mongolia': 'Asia', 'Myanmar': 'Asia', 'Nepal': 'Asia', 'North Korea': 'Asia',
  'Pakistan': 'Asia', 'Philippines': 'Asia', 'Singapore': 'Asia', 'South Korea': 'Asia',
  'Korea, Republic of': 'Asia', 'Korea Republic Of': 'Asia', 'Korea, Republic Of': 'Asia',
  'Republic of Korea': 'Asia', 'Sri Lanka': 'Asia', 'Taiwan': 'Asia',
  'Taiwan, Province Of China': 'Asia', 'Tajikistan': 'Asia', 'Thailand': 'Asia',
  'Timor-Leste': 'Asia', 'East Timor': 'Asia', 'Turkmenistan': 'Asia',
  'Uzbekistan': 'Asia', 'Vietnam': 'Asia', 'Viet Nam': 'Asia',
  // Middle East
  'Bahrain': 'Middle East', 'Iran': 'Middle East', 'Iran, Islamic Republic Of': 'Middle East',
  'Iran Islamic Republic Of': 'Middle East', 'Iraq': 'Middle East', 'Israel': 'Middle East',
  'Jordan': 'Middle East', 'Kuwait': 'Middle East', 'Lebanon': 'Middle East', 'Oman': 'Middle East',
  'Palestine': 'Middle East', 'Palestinian Territory': 'Middle East', 'Qatar': 'Middle East',
  'Saudi Arabia': 'Middle East', 'Syria': 'Middle East', 'Syrian Arab Republic': 'Middle East',
  'United Arab Emirates': 'Middle East', 'UAE': 'Middle East', 'Yemen': 'Middle East',
  // Europe
  'Albania': 'Europe', 'Andorra': 'Europe', 'Austria': 'Europe', 'Belarus': 'Europe',
  'Belgium': 'Europe', 'Bosnia and Herzegovina': 'Europe', 'Bulgaria': 'Europe', 'Croatia': 'Europe',
  'Cyprus': 'Europe', 'Czech Republic': 'Europe', 'Czechia': 'Europe', 'Denmark': 'Europe',
  'Estonia': 'Europe', 'Faroe Islands': 'Europe', 'Finland': 'Europe', 'France': 'Europe',
  'Germany': 'Europe', 'Gibraltar': 'Europe', 'Greece': 'Europe', 'Greenland': 'Europe',
  'Guernsey': 'Europe', 'Hungary': 'Europe', 'Iceland': 'Europe', 'Ireland': 'Europe',
  'Isle of Man': 'Europe', 'Italy': 'Europe', 'Jersey': 'Europe', 'Kosovo': 'Europe',
  'Latvia': 'Europe', 'Liechtenstein': 'Europe', 'Lithuania': 'Europe', 'Luxembourg': 'Europe',
  'Malta': 'Europe', 'Moldova': 'Europe', 'Moldova, Republic Of': 'Europe',
  'Moldova Republic Of': 'Europe', 'Republic of Moldova': 'Europe', 'Monaco': 'Europe',
  'Montenegro': 'Europe', 'Montenegro, Republic of': 'Europe', 'Netherlands': 'Europe',
  'North Macedonia': 'Europe', 'Macedonia': 'Europe', 'Macedonia, Republic Of': 'Europe',
  'Macedonia Republic Of': 'Europe', 'Republic of Macedonia': 'Europe',
  'The Former Yugoslav Republic of Macedonia': 'Europe', 'FYROM': 'Europe', 'Norway': 'Europe',
  'Poland': 'Europe', 'Portugal': 'Europe', 'Romania': 'Europe', 'Russia': 'Europe',
  'Russian Federation': 'Europe', 'San Marino': 'Europe', 'Serbia': 'Europe',
  'Serbia Republic of': 'Europe', 'Serbia and Montenegro': 'Europe', 'Slovakia': 'Europe',
  'Slovenia': 'Europe', 'Spain': 'Europe', 'Svalbard': 'Europe', 'Sweden': 'Europe',
  'Switzerland': 'Europe', 'Turkey': 'Europe', 'Ukraine': 'Europe', 'United Kingdom': 'Europe',
  'UK': 'Europe', 'Great Britain': 'Europe', 'Britain': 'Europe', 'England': 'Europe',
  'Scotland': 'Europe', 'Wales': 'Europe', 'Northern Ireland': 'Europe',
  'Vatican City': 'Europe', 'Holy See': 'Europe',
  // North America
  'Bermuda': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
  'United States': 'North America', 'USA': 'North America', 'US': 'North America',
  // Central America
  'Belize': 'Central America', 'Costa Rica': 'Central America', 'El Salvador': 'Central America',
  'Guatemala': 'Central America', 'Honduras': 'Central America', 'Nicaragua': 'Central America',
  'Panama': 'Central America',
  // Caribbean
  'Anguilla': 'Caribbean', 'Antigua and Barbuda': 'Caribbean', 'Aruba': 'Caribbean',
  'Bahamas': 'Caribbean', 'Barbados': 'Caribbean', 'Bonaire': 'Caribbean',
  'British Virgin Islands': 'Caribbean', 'Cayman Islands': 'Caribbean', 'Cuba': 'Caribbean',
  'Curaçao': 'Caribbean', 'Curacao': 'Caribbean', 'Dominica': 'Caribbean',
  'Dominican Republic': 'Caribbean', 'Grenada': 'Caribbean', 'Guadeloupe': 'Caribbean',
  'Haiti': 'Caribbean', 'Jamaica': 'Caribbean', 'Martinique': 'Caribbean',
  'Montserrat': 'Caribbean', 'Netherlands Antilles': 'Caribbean', 'Puerto Rico': 'Caribbean',
  'Saint Kitts and Nevis': 'Caribbean', 'Saint Lucia': 'Caribbean',
  'Saint Vincent and the Grenadines': 'Caribbean', 'Sint Maarten': 'Caribbean',
  'Saint Martin': 'Caribbean', 'St. Kitts and Nevis': 'Caribbean', 'St. Lucia': 'Caribbean',
  'St. Vincent': 'Caribbean', 'Trinidad and Tobago': 'Caribbean', 'Turks and Caicos': 'Caribbean',
  'Turks and Caicos Islands': 'Caribbean', 'US Virgin Islands': 'Caribbean',
  'Virgin Islands (US)': 'Caribbean', 'Virgin Islands (British)': 'Caribbean',
  // South America
  'Argentina': 'South America', 'Bolivia': 'South America',
  'Bolivia, Plurinational State Of': 'South America', 'Brazil': 'South America',
  'Chile': 'South America', 'Colombia': 'South America', 'Ecuador': 'South America',
  'Falkland Islands': 'South America', 'Falkland Islands (Malvinas)': 'South America',
  'French Guiana': 'South America', 'Guyana': 'South America', 'Paraguay': 'South America',
  'Peru': 'South America', 'Suriname': 'South America', 'Uruguay': 'South America',
  'Venezuela': 'South America', 'Venezuela, Bolivarian Republic Of': 'South America',
  // Oceania
  'American Samoa': 'Oceania', 'Australia': 'Oceania', 'Cook Islands': 'Oceania', 'Fiji': 'Oceania',
  'French Polynesia': 'Oceania', 'Guam': 'Oceania', 'Kiribati': 'Oceania', 'Marshall Islands': 'Oceania',
  'Micronesia': 'Oceania', 'Micronesia, Federated States Of': 'Oceania', 'Nauru': 'Oceania',
  'New Caledonia': 'Oceania', 'New Zealand': 'Oceania', 'Niue': 'Oceania', 'Norfolk Island': 'Oceania',
  'Northern Mariana Islands': 'Oceania', 'Palau': 'Oceania', 'Papua New Guinea': 'Oceania',
  'Samoa': 'Oceania', 'Solomon Islands': 'Oceania', 'Tonga': 'Oceania', 'Tuvalu': 'Oceania',
  'Vanuatu': 'Oceania',
};

// Helper function to get region for a country
const getRegion = (country: string): string => {
  if (countryToRegion[country]) return countryToRegion[country];
  const lowerCountry = country.toLowerCase();
  for (const [key, value] of Object.entries(countryToRegion)) {
    if (key.toLowerCase() === lowerCountry) return value;
  }
  return 'Other';
};

// Region display order
const REGION_ORDER = [
  'Africa', 'Asia', 'Europe', 'Middle East', 'North America',
  'Central America', 'Caribbean', 'South America', 'Oceania', 'Other'
];

// Default fallback rates (used if API fails)
const DEFAULT_CURRENCY_TO_USD: Record<string, number> = {
  'USD': 1.0,
  'EUR': 1.04,
  'GBP': 1.38,
};

// Fetch live exchange rates from API
const fetchExchangeRates = async (): Promise<Record<string, number>> => {
  try {
    // Using frankfurter.app - free, no API key required
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP');
    if (!response.ok) throw new Error('Failed to fetch rates');
    const data = await response.json();
    // API returns USD to other currencies, we need to invert for "currency to USD"
    return {
      'USD': 1.0,
      'EUR': 1 / data.rates.EUR,  // Invert: if 1 USD = 0.96 EUR, then 1 EUR = 1/0.96 USD
      'GBP': 1 / data.rates.GBP,
    };
  } catch (error) {
    console.warn('Failed to fetch exchange rates, using defaults:', error);
    return DEFAULT_CURRENCY_TO_USD;
  }
};

// localStorage key for persisting form state
const FORM_STORAGE_KEY = 'dealdesk_deal_review_form';

// Helper to load form state from localStorage
const loadFormState = () => {
  try {
    const saved = localStorage.getItem(FORM_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load form state from localStorage:', e);
  }
  return null;
};

// Helper to save form state to localStorage
const saveFormState = (state: any) => {
  try {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save form state to localStorage:', e);
  }
};

interface DealReviewFormProps {
  initialDeal?: Partial<DealRequest>;
  dealId?: string;
  onEvaluation?: (evaluation: DealEvaluation, deal: DealRequest) => void;
  onDealSaved?: (deal: SavedDeal) => void;
  onExpandToggle?: () => void;
  isExpanded?: boolean;
  onCreateNewDeal?: () => void;
}

export const DealReviewForm: React.FC<DealReviewFormProps> = ({
  initialDeal,
  dealId,
  onEvaluation,
  onDealSaved,
  onExpandToggle,
  isExpanded = false,
  onCreateNewDeal
}) => {
  // Load saved state from localStorage on initial render
  const savedState = loadFormState();

  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCarriers, setAvailableCarriers] = useState<Map<string, string[]>>(new Map());

  // Form state - restore from localStorage if available, otherwise use defaults
  const [formData, setFormData] = useState<DealRequest>(() => {
    if (savedState?.formData) {
      return savedState.formData;
    }
    return {
      simQuantity: initialDeal?.simQuantity || 1000,
      countries: initialDeal?.countries || [],
      usagePercentages: initialDeal?.usagePercentages || {},
      carriers: initialDeal?.carriers || [],
      monthlyDataPerSim: initialDeal?.monthlyDataPerSim || 1,
      monthlySmsPerSim: initialDeal?.monthlySmsPerSim || 0,
      duration: initialDeal?.duration || 12,
      proposedPricePerSim: initialDeal?.proposedPricePerSim || 2,
      currency: initialDeal?.currency || 'USD',
      isNewCustomer: initialDeal?.isNewCustomer ?? true,
      expectedUsagePattern: initialDeal?.expectedUsagePattern || 'medium',
      requiresIoT: initialDeal?.requiresIoT || false,
      iotType: initialDeal?.iotType
    };
  });

  const [evaluation, setEvaluation] = useState<DealEvaluation | null>(null);
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<any>(null);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [isResultsExpanded, setIsResultsExpanded] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>(DEFAULT_CURRENCY_TO_USD);
  const [dataAmount, setDataAmount] = useState<number>(() => savedState?.dataAmount || 1024);
  const [dataUnit, setDataUnit] = useState<'KB' | 'MB' | 'GB'>(() => savedState?.dataUnit || 'MB');
  const [priceAmount, setPriceAmount] = useState<string>(() => savedState?.priceAmount || '2');
  const [simQuantityStr, setSimQuantityStr] = useState<string>(() => savedState?.simQuantityStr || String(initialDeal?.simQuantity || 1000));
  const [monthlySmsStr, setMonthlySmsStr] = useState<string>(() => savedState?.monthlySmsStr || String(initialDeal?.monthlySmsPerSim || 0));
  const [durationStr, setDurationStr] = useState<string>(() => savedState?.durationStr || String(initialDeal?.duration || 12));
  const [cellularTechnologies, setCellularTechnologies] = useState<string[]>(() => savedState?.cellularTechnologies || ['2G', '3G', '4G', '5G']);
  const [lpwanTechnologies, setLpwanTechnologies] = useState<string[]>(() => savedState?.lpwanTechnologies || []);
  const [showCellularDropdown, setShowCellularDropdown] = useState(false);
  const [showLpwanDropdown, setShowLpwanDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [countryDropdownSearch, setCountryDropdownSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const countryListRef = useRef<HTMLDivElement>(null);
  const cellularDropdownRef = useRef<HTMLDivElement>(null);
  const lpwanDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Save form state to localStorage whenever it changes
  useEffect(() => {
    saveFormState({
      formData,
      dataAmount,
      dataUnit,
      priceAmount,
      simQuantityStr,
      monthlySmsStr,
      durationStr,
      cellularTechnologies,
      lpwanTechnologies,
    });
  }, [formData, dataAmount, dataUnit, priceAmount, simQuantityStr, monthlySmsStr, durationStr, cellularTechnologies, lpwanTechnologies]);

  // Group available countries by region
  const availableCountriesByRegion = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    availableCountries.forEach(country => {
      const region = getRegion(country);
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(country);
    });
    // Sort countries within each region
    Object.keys(grouped).forEach(region => {
      grouped[region].sort();
    });
    return grouped;
  }, [availableCountries]);

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

  // Toggle entire region selection
  const toggleRegionSelection = (region: string) => {
    const countriesInRegion = availableCountriesByRegion[region] || [];
    const currentSelected = formData.countries;
    const allSelected = countriesInRegion.every(c => currentSelected.includes(c));

    if (allSelected) {
      // Deselect all countries in this region
      setFormData(prev => ({
        ...prev,
        countries: prev.countries.filter(c => !countriesInRegion.includes(c))
      }));
    } else {
      // Select all countries in this region
      const newCountries = [...new Set([...currentSelected, ...countriesInRegion])];
      setFormData(prev => ({ ...prev, countries: newCountries }));
    }
  };

  // Check if a region is fully selected
  const isRegionFullySelected = (region: string): boolean => {
    const countriesInRegion = availableCountriesByRegion[region] || [];
    if (countriesInRegion.length === 0) return false;
    return countriesInRegion.every(c => formData.countries.includes(c));
  };

  // Check if a region is partially selected
  const isRegionPartiallySelected = (region: string): boolean => {
    const countriesInRegion = availableCountriesByRegion[region] || [];
    if (countriesInRegion.length === 0) return false;
    const selectedCount = countriesInRegion.filter(c => formData.countries.includes(c)).length;
    return selectedCount > 0 && selectedCount < countriesInRegion.length;
  };

  // Get count of selected countries in a region
  const getRegionSelectedCount = (region: string): number => {
    const countriesInRegion = availableCountriesByRegion[region] || [];
    return countriesInRegion.filter(c => formData.countries.includes(c)).length;
  };

  const evaluationService = new DealEvaluationService();
  const enhancedService = new EnhancedDealService();
  const comprehensiveService = new ComprehensiveDealService();
  
  // Format usage function (MB input → smart display)
  const formatUsage = (mb: number | string): string => {
    if (!mb) return "—";
    const mbValue = Number(mb);
    if (mbValue < 1024) {
      return mbValue + " MB";
    } else {
      let gb = mbValue / 1024;
      let s = gb.toFixed(1); // 1 decimal
      if (s.endsWith(".0")) s = s.slice(0, -2); // remove .0 if clean
      return s + " GB";
    }
  };
  
  useEffect(() => {
    loadCountries();
    // Initialize data amount from existing monthlyDataPerSim (convert GB to MB)
    setDataAmount(formData.monthlyDataPerSim * 1024);
    setPriceAmount(String(formData.proposedPricePerSim));
  }, []);

  // Fetch live exchange rates on mount
  useEffect(() => {
    fetchExchangeRates().then(rates => {
      setCurrencyRates(rates);
    });
  }, []);

  useEffect(() => {
    // Load carriers when countries change
    if (formData.countries.length > 0) {
      loadCarriersForCountries(formData.countries);
    }

    // Auto-distribute usage evenly when countries change
    if (formData.countries.length > 0) {
      const evenPercentage = 100 / formData.countries.length;
      const newPercentages: Record<string, number> = {};
      formData.countries.forEach((country) => {
        newPercentages[country] = evenPercentage;
      });
      setFormData(prev => ({ ...prev, usagePercentages: newPercentages }));
    }
  }, [formData.countries]);

  useEffect(() => {
    // Sync data amount with formData (always convert to GB for backend)
    let gbValue: number;
    switch (dataUnit) {
      case 'KB':
        gbValue = dataAmount / (1024 * 1024);
        break;
      case 'MB':
        gbValue = dataAmount / 1024;
        break;
      case 'GB':
        gbValue = dataAmount;
        break;
      default:
        gbValue = dataAmount / 1024;
    }
    setFormData(prev => ({ ...prev, monthlyDataPerSim: gbValue }));
  }, [dataAmount, dataUnit]);

  useEffect(() => {
    // Sync price amount with formData, converting to USD for calculations
    const numericPrice = parseFloat(priceAmount) || 0;
    const conversionRate = currencyRates[formData.currency] || 1.0;
    const priceInUSD = numericPrice * conversionRate;
    setFormData(prev => ({ ...prev, proposedPricePerSim: priceInUSD }));
  }, [priceAmount, formData.currency]);

  useEffect(() => {
    // Sync simQuantity string with formData
    const numeric = parseInt(simQuantityStr) || 1;
    setFormData(prev => ({ ...prev, simQuantity: numeric }));
  }, [simQuantityStr]);

  useEffect(() => {
    // Sync monthlySms string with formData
    const numeric = parseInt(monthlySmsStr) || 0;
    setFormData(prev => ({ ...prev, monthlySmsPerSim: numeric }));
  }, [monthlySmsStr]);

  useEffect(() => {
    // Sync duration string with formData
    const numeric = parseInt(durationStr) || 1;
    setFormData(prev => ({ ...prev, duration: numeric }));
  }, [durationStr]);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (cellularDropdownRef.current && !cellularDropdownRef.current.contains(event.target as Node)) {
        setShowCellularDropdown(false);
      }
      if (lpwanDropdownRef.current && !lpwanDropdownRef.current.contains(event.target as Node)) {
        setShowLpwanDropdown(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
        if (searchInputRef.current) {
          searchInputRef.current.value = '';
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const loadCountries = async () => {
    // Fetch all rows in batches to avoid Supabase 1000-row default limit
    // Exclude expensive networks (data cost > $1/MB) to match PricingTable filtering
    const EXPENSIVE_THRESHOLD = 1.0;
    const allCountries: string[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('network_pricing')
        .select('country, data_per_mb')
        .lte('data_per_mb', EXPENSIVE_THRESHOLD)
        .order('country')
        .range(offset, offset + batchSize - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      allCountries.push(...data.map(d => d.country));
      offset += batchSize;
      if (data.length < batchSize) hasMore = false;
    }

    const uniqueCountries = [...new Set(allCountries)].filter(c => c && c !== 'Unknown').sort();
    setAvailableCountries(uniqueCountries);
  };

  const loadCarriersForCountries = async (selectedCountries: string[]) => {
    const carrierMap = new Map<string, string[]>();

    for (const country of selectedCountries) {
      const { data, error } = await supabase
        .from('network_pricing')
        .select('network_name')
        .eq('country', country)
        .order('network_name');
      
      if (!error && data) {
        const uniqueCarriers = [...new Set(data.map(d => d.network_name))];
        carrierMap.set(country, uniqueCarriers);
      }
    }
    
    setAvailableCarriers(carrierMap);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare comprehensive deal request
      const comprehensiveDeal: DealRequestMandatory = {
        simCount: formData.simQuantity,
        dataPerMonth: formData.monthlyDataPerSim * 1024, // Convert GB to MB
        countries: formData.countries,
        networksPerCountry: formData.countries.reduce((acc, country) => {
          acc[country] = 2; // Default to 2 networks per country for redundancy
          return acc;
        }, {} as Record<string, number>),
        commitmentMonths: formData.duration,
        technology: formData.requiresIoT ? ['4G', '5G', 'Cat-M', 'NB-IoT'] : ['3G', '4G', '5G']
      };

      // Use all three services for comprehensive analysis
      const [basicResult, enhancedResult, comprehensiveResult] = await Promise.all([
        evaluationService.evaluateDeal(formData),
        enhancedService.analyzeDeal({
          simCount: formData.simQuantity,
          countries: formData.countries,
          dataPerSim: formData.monthlyDataPerSim * 1024, // Convert GB to MB
          pricingModel: 'payAsYouGo', // Always use pay-as-you-go now
          usagePercentages: formData.usagePercentages, // Pass usage distribution
          contractLength: formData.duration,
          requestedPrice: formData.proposedPricePerSim
        }),
        comprehensiveService.evaluateDeal(comprehensiveDeal)
      ]);

      console.log('=== DEBUGGING DEAL EVALUATION DATA ===');
      console.log('Basic evaluation result:', basicResult);
      console.log('Enhanced analysis result:', enhancedResult);
      console.log('Comprehensive analysis result:', comprehensiveResult);
      console.log('Comprehensive recommendation:', comprehensiveResult?.recommendation);
      console.log('Enhanced analysis fields:');
      console.log('- reasoning:', enhancedResult?.reasoning);
      console.log('- assumptions:', enhancedResult?.assumptions);
      console.log('- warnings:', enhancedResult?.warnings);
      console.log('- usageDistribution:', enhancedResult?.usageDistribution);
      console.log('- payAsYouGo:', enhancedResult?.payAsYouGo);
      console.log('Basic evaluation fields:');
      console.log('- verdict:', basicResult?.verdict);
      console.log('- notes:', basicResult?.notes);
      console.log('=========================================');

      setEvaluation(basicResult);
      setEnhancedAnalysis(enhancedResult);
      setComprehensiveAnalysis(comprehensiveResult);
      setShowResults(true);

      // Save evaluation to database if we have a deal ID
      if (dealId) {
        try {
          const savedDeal = await dealPersistenceService.saveEvaluation(dealId, formData, {
            basic_evaluation: basicResult,
            enhanced_analysis: enhancedResult,
            comprehensive_analysis: comprehensiveResult,
          });
          console.log('Deal evaluation saved:', savedDeal.id);
          if (onDealSaved) {
            onDealSaved(savedDeal);
          }
        } catch (saveError) {
          console.error('Error saving deal evaluation:', saveError);
          // Continue showing results even if save fails
        }
      }

      // Scroll to top when showing results
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (onEvaluation) {
        onEvaluation(basicResult, formData);
      }
    } catch (error) {
      console.error('Error evaluating deal:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditDeal = () => {
    setShowResults(false);
  };

  const addCountry = (country: string) => {
    if (country && !formData.countries.includes(country)) {
      setFormData(prev => ({
        ...prev,
        countries: [...prev.countries, country]
      }));
    }
  };
  
  const removeCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.filter(c => c !== country),
      // Also remove carriers from this country
      carriers: prev.carriers.filter(carrier => {
        const carriersInCountry = availableCarriers.get(country) || [];
        return !carriersInCountry.includes(carrier);
      })
    }));
  };
  
  const toggleCarrier = (carrier: string) => {
    setFormData(prev => ({
      ...prev,
      carriers: prev.carriers.includes(carrier)
        ? prev.carriers.filter(c => c !== carrier)
        : [...prev.carriers, carrier]
    }));
  };

  const toggleCellularTech = (tech: string) => {
    setCellularTechnologies(prev => 
      prev.includes(tech)
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  const toggleLpwanTech = (tech: string) => {
    setLpwanTechnologies(prev => 
      prev.includes(tech)
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  const cycleDataUnit = () => {
    // Convert current value to maintain the same data amount when switching units
    let newAmount = dataAmount;
    let newUnit: 'KB' | 'MB' | 'GB';
    
    switch (dataUnit) {
      case 'KB':
        newUnit = 'MB';
        newAmount = dataAmount / 1024; // Convert KB to MB
        break;
      case 'MB':
        newUnit = 'GB';
        newAmount = dataAmount / 1024; // Convert MB to GB
        break;
      case 'GB':
        newUnit = 'KB';
        newAmount = dataAmount * 1024 * 1024; // Convert GB to KB
        break;
      default:
        newUnit = 'MB';
    }
    
    setDataUnit(newUnit);
    setDataAmount(Math.round(newAmount * 100) / 100); // Round to 2 decimal places
  };

  const isFormValid = () => {
    // Check all required fields
    const basicFieldsValid = (
      formData.simQuantity > 0 &&
      dataAmount > 0 &&
      (parseFloat(priceAmount) || 0) > 0 &&
      formData.duration > 0 &&
      formData.countries.length > 0
    );

    // If multiple countries, check that usage distribution equals 100%
    if (formData.countries.length > 1) {
      const total = formData.countries.reduce((sum, country) =>
        sum + (formData.usagePercentages?.[country] || (100 / formData.countries.length)), 0
      );
      return basicFieldsValid && Math.abs(total - 100) < 0.01;
    }

    return basicFieldsValid;
  };
  
  // Show results screen if evaluation is complete and showResults is true
  if (showResults && evaluation) {
    return (
      <div className="max-w-5xl mx-auto px-6 pt-2 pb-6">
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={handleEditDeal}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors flex items-center space-x-2 border border-gray-200"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Deal</span>
          </button>
          {onCreateNewDeal && (
            <button
              onClick={onCreateNewDeal}
              className="px-3 py-1.5 bg-gradient-to-r from-[#5B9BD5] to-[#9B7BB6] hover:opacity-90 text-white text-sm rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            >
              <FilePlus className="w-4 h-4" />
              <span>Create New Deal</span>
            </button>
          )}
        </div>

        {/* New Professional Deal Proposal View */}
        <DealProposalView
          formData={formData}
          evaluation={evaluation}
          enhancedAnalysis={enhancedAnalysis}
          comprehensiveAnalysis={comprehensiveAnalysis}
          currencyRates={currencyRates}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Reorganized Deal Form */}
        <div className="bg-gradient-to-br from-white via-[#5B9BD5]/[0.02] to-[#5B9BD5]/[0.05] rounded-2xl shadow-sm border border-[#5B9BD5]/10 p-6">

          {/* Form Header */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recurring Deal Charges</h3>
            <p className="text-sm text-gray-500 mt-1">Enter your deal parameters to analyze pricing and profitability</p>
          </div>

          {/* First Row: Number of SIM, Monthly data usage, Monthly SMS */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Number of SIMs */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Number of SIMs
              </label>
              <input
                type="number"
                min="1"
                value={simQuantityStr}
                onChange={(e) => setSimQuantityStr(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                required
              />
            </div>
            
            {/* Monthly Data Usage */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Monthly Data Usage
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={cycleDataUnit}
                  className="absolute left-0 top-0 h-full px-4 flex items-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-l-xl transition-colors z-10 cursor-pointer"
                  title="Click to cycle through KB → MB → GB"
                >
                  <span className="font-semibold text-sm">
                    {dataUnit}
                  </span>
                </button>
                <input
                  type="number"
                  min="0"
                  step={dataUnit === 'GB' ? '0.1' : '1'}
                  value={dataAmount || ''}
                  onChange={(e) => setDataAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-16 pr-4 py-3 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click {dataUnit} to cycle units (KB → MB → GB)
              </p>
            </div>
            
            {/* Monthly SMS */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Monthly SMS
              </label>
              <input
                type="number"
                min="0"
                value={monthlySmsStr}
                onChange={(e) => setMonthlySmsStr(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
              />
            </div>
          </div>

          {/* Second Row: Customer type, Target price per SIM, Contract duration */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Customer Type */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Customer Type
              </label>
              <select
                value={formData.isNewCustomer ? 'new' : 'existing'}
                onChange={(e) => setFormData(prev => ({ ...prev, isNewCustomer: e.target.value === 'new' }))}
                className="w-full px-4 py-3 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all"
              >
                <option value="new">New Customer</option>
                <option value="existing">Existing Customer</option>
              </select>
            </div>
            
            {/* Target Price per SIM (monthly) */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Target Price per SIM (monthly)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const currencies = ['USD', 'GBP', 'EUR'] as const;
                    const currentIndex = currencies.indexOf(formData.currency as 'USD' | 'GBP' | 'EUR');
                    const nextIndex = (currentIndex + 1) % currencies.length;
                    setFormData(prev => ({ ...prev, currency: currencies[nextIndex] }));
                  }}
                  className="absolute left-0 top-0 h-full px-4 flex items-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-l-xl transition-colors z-10 cursor-pointer"
                  title="Click to cycle through USD → GBP → EUR"
                >
                  <span className="font-semibold text-sm">
                    {formData.currency === 'USD' ? '$' : formData.currency === 'GBP' ? '£' : '€'}
                  </span>
                </button>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                  placeholder="Enter price"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.currency !== 'USD' && parseFloat(priceAmount) > 0 ? (
                  <>
                    = ${((parseFloat(priceAmount) || 0) * currencyRates[formData.currency]).toFixed(2)} USD
                    <span className="mx-1">•</span>
                  </>
                ) : null}
                Click {formData.currency === 'USD' ? '$' : formData.currency === 'GBP' ? '£' : '€'} to change currency
              </p>
            </div>
            
            {/* Contract Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Contract Duration (months)
              </label>
              <input
                type="number"
                min="1"
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all placeholder-gray-400"
                required
              />
            </div>
          </div>

          {/* Third Row: Cellular technology, LPWAN, Expected usage pattern */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Cellular Technologies */}
            <div className="relative" ref={cellularDropdownRef}>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Cellular Technologies
              </label>
              <button
                type="button"
                onClick={() => setShowCellularDropdown(!showCellularDropdown)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all text-sm flex items-center justify-between"
              >
                <span className="text-left">
                  {cellularTechnologies.length === 0 
                    ? 'Select technologies...' 
                    : cellularTechnologies.length === 4
                    ? 'All selected (2G, 3G, 4G, 5G)'
                    : `${cellularTechnologies.length} selected: ${cellularTechnologies.join(', ')}`
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showCellularDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showCellularDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                  <div className="p-2">
                    {['2G', '3G', '4G', '5G'].map((tech) => (
                      <label key={tech} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cellularTechnologies.includes(tech)}
                          onChange={() => toggleCellularTech(tech)}
                          className="w-4 h-4 rounded border-gray-300 text-[#5B9BD5] focus:ring-[#5B9BD5]/50"
                        />
                        <span className="text-sm font-medium text-gray-700">{tech}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* LPWAN Technologies */}
            <div className="relative" ref={lpwanDropdownRef}>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                LPWAN Technologies
              </label>
              <button
                type="button"
                onClick={() => setShowLpwanDropdown(!showLpwanDropdown)}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all text-sm flex items-center justify-between"
              >
                <span className="text-left">
                  {lpwanTechnologies.length === 0 
                    ? 'Select technologies...' 
                    : lpwanTechnologies.length === 2
                    ? 'All selected (LTE-M, NB-IoT)'
                    : `${lpwanTechnologies.length} selected: ${lpwanTechnologies.join(', ')}`
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showLpwanDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showLpwanDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                  <div className="p-2">
                    {[
                      { value: 'LTE-M', label: 'LTE-M (Cat-M/LTE-M, Higher bandwidth)' },
                      { value: 'NB-IoT', label: 'NB-IoT (Lower power)' }
                    ].map((tech) => (
                      <label key={tech.value} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lpwanTechnologies.includes(tech.value)}
                          onChange={() => toggleLpwanTech(tech.value)}
                          className="w-4 h-4 rounded border-gray-300 text-[#5B9BD5] focus:ring-[#5B9BD5]/50"
                        />
                        <span className="text-sm font-medium text-gray-700">{tech.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Expected Usage Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Expected Usage Pattern
              </label>
              <select
                value={formData.expectedUsagePattern}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedUsagePattern: e.target.value as 'low' | 'medium' | 'high' }))}
                className="w-full px-4 py-3 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Fourth Row: Countries */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Countries - Searchable Dropdown */}
            <div ref={countryDropdownRef}>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Countries
              </label>
              {/* Button wrapper - dropdown positioned relative to this */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:bg-white transition-all text-sm flex items-center justify-between text-left"
                >
                  <span className="text-gray-500">
                    {formData.countries.length === 0
                      ? `Select countries (${availableCountries.length})...`
                      : `${formData.countries.length} selected`}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCountryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-[450px] overflow-hidden flex flex-col">
                  {/* Search Input */}
                  <div className="p-2 border-b border-gray-200">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={countryDropdownSearch}
                      onChange={(e) => setCountryDropdownSearch(e.target.value)}
                      placeholder="Search or type first letter..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50"
                      autoFocus
                    />
                  </div>

                  {/* Selected Count & Clear All */}
                  {formData.countries.length > 0 && (
                    <div className="px-3 py-2 bg-blue-50 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-xs text-blue-700 font-medium">
                        {formData.countries.length} countries selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, countries: [] }))}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  )}

                  {/* Region Groups */}
                  <div ref={countryListRef} className="overflow-y-auto flex-1">
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
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer"
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
                              className="w-4 h-4 rounded border-gray-300 text-[#5B9BD5] focus:ring-[#5B9BD5]/50"
                            />
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                            <span className="text-sm font-medium text-gray-700 flex-1">{region}</span>
                            <span className="text-xs text-gray-500">
                              {selectedCount > 0 ? `${selectedCount}/` : ''}{countries.length}
                            </span>
                          </div>

                          {/* Country List (when expanded) */}
                          {isExpanded && (
                            <div className="bg-white">
                              {countries.map((country: string) => (
                                <label
                                  key={country}
                                  data-country={country}
                                  className={`flex items-center gap-2 px-3 py-1.5 pl-10 hover:bg-gray-50 cursor-pointer ${
                                    formData.countries.includes(country) ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.countries.includes(country)}
                                    onChange={() => {
                                      if (formData.countries.includes(country)) {
                                        removeCountry(country);
                                      } else {
                                        addCountry(country);
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-[#5B9BD5] focus:ring-[#5B9BD5]/50"
                                  />
                                  <span className="text-sm text-gray-700">{country}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Empty State */}
                    {Object.keys(filteredCountriesByRegion).length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No countries match "{countryDropdownSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Selected Countries - grouped by region (full width) */}
          {formData.countries.length > 0 && (
            <div className="mb-6 space-y-3">
              {REGION_ORDER.filter(region =>
                formData.countries.some(country => getRegion(country) === region)
              ).map((region, regionIdx) => {
                const countriesInRegion = formData.countries
                  .filter(country => getRegion(country) === region)
                  .sort();
                const colors = [
                  'bg-[#5B9BD5]/10 text-[#5B9BD5] border-[#5B9BD5]/20',
                  'bg-[#9B7BB6]/10 text-[#9B7BB6] border-[#9B7BB6]/20',
                  'bg-[#EC6B9D]/10 text-[#EC6B9D] border-[#EC6B9D]/20',
                  'bg-[#F5B342]/10 text-[#F5B342] border-[#F5B342]/20'
                ];
                const colorClass = colors[regionIdx % colors.length];
                return (
                  <div key={region} className="flex items-start gap-3">
                    <div className="text-xs font-semibold text-gray-500 w-24 pt-1 shrink-0">{region}</div>
                    <div className="flex flex-wrap gap-2 flex-1">
                      {countriesInRegion.map((country) => (
                        <span
                          key={country}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}
                        >
                          {country}
                          <button
                            type="button"
                            onClick={() => removeCountry(country)}
                            className="ml-1.5 hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Usage Distribution for Multiple Countries */}
          {formData.countries.length > 1 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-xl border border-blue-100/50">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Usage Distribution (% of total traffic)
              </h4>
              <div className="space-y-3">
                {formData.countries.map((country, idx) => {
                  const usage = formData.usagePercentages?.[country] || (100 / formData.countries.length);
                  const displayValue = Math.round(usage * 100) / 100; // Round to 2 decimal places for display
                  return (
                    <div key={country} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600 w-24">{country}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.01"
                        value={usage}
                        onChange={(e) => {
                          const newPercentages = {
                            ...formData.usagePercentages,
                            [country]: parseFloat(e.target.value)
                          };
                          setFormData(prev => ({ ...prev, usagePercentages: newPercentages }));
                        }}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #5B9BD5 0%, #5B9BD5 ${usage}%, #e5e7eb ${usage}%, #e5e7eb 100%)`
                        }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={displayValue}
                        onChange={(e) => {
                          const newPercentages = {
                            ...formData.usagePercentages,
                            [country]: parseFloat(e.target.value) || 0
                          };
                          setFormData(prev => ({ ...prev, usagePercentages: newPercentages }));
                        }}
                        className="w-16 px-2 py-1 text-sm text-center bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#5B9BD5]/50"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  );
                })}
                
                {/* Total validation */}
                {(() => {
                  const total = formData.countries.reduce((sum, country) =>
                    sum + (formData.usagePercentages?.[country] || (100 / formData.countries.length)), 0
                  );
                  const isValid = Math.abs(total - 100) < 0.01; // Allow small floating point tolerance
                  return !isValid && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>Total: {total.toFixed(2)}% - must equal 100% to proceed</span>
                    </div>
                  );
                })()}
                
                <button
                  type="button"
                  onClick={() => {
                    const evenPercentage = 100 / formData.countries.length;
                    const newPercentages: Record<string, number> = {};
                    formData.countries.forEach((country) => {
                      newPercentages[country] = evenPercentage;
                    });
                    setFormData(prev => ({ ...prev, usagePercentages: newPercentages }));
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Distribute Evenly
                </button>
              </div>
            </div>
          )}
          
          {/* Preferred Carriers - Optional */}
          {formData.countries.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-500 mb-3">
                Preferred Carriers <span className="text-xs text-gray-400">(Optional - Select multiple for redundancy)</span>
              </label>
              {formData.countries.map(country => {
                const carriers = availableCarriers.get(country) || [];
                const selectedInCountry = carriers.filter(c => formData.carriers.includes(c)).length;
                return (
                  <div key={country} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">{country}</p>
                      {selectedInCountry > 0 && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {selectedInCountry} network{selectedInCountry > 1 ? 's' : ''} selected
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {carriers.map(carrier => (
                        <label key={carrier} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.carriers.includes(carrier)}
                            onChange={() => toggleCarrier(carrier)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-700 truncate">{carrier}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Submit Button */}
        <div className="flex flex-col items-end gap-3">
          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="px-8 py-3.5 bg-gradient-to-r from-[#5B9BD5] to-[#9B7BB6] text-white rounded-xl font-semibold hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                <span>Evaluate Deal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function to format message content with organized styling
function formatDealContent(content: string): string {
  return content
    // Headers - smaller font, better spacing
    .replace(/### (.*?)$/gm, '<h3 class="text-sm font-semibold mt-2 mb-1 text-gray-800">$1</h3>')
    .replace(/## (.*?)$/gm, '<h2 class="text-sm font-bold mt-3 mb-1 text-gray-900">$1</h2>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-sm">$1</strong>')
    // Replace grid with compact list format
    .replace(/<div class="pricing-grid">/g, '<div class="space-y-1 mb-2">')
    .replace(/<div class="pricing-card">/g, '<div class="text-sm">')
    .replace(/<span class="label">/g, '<span class="font-semibold text-gray-800 uppercase text-sm">')
    .replace(/<span class="value">/g, '<span class="font-semibold text-gray-900 text-sm">')
    .replace(/<span class="value success">/g, '<span class="font-semibold text-green-600 text-sm">')
    .replace(/<span class="value accent">/g, '<span class="font-semibold text-blue-600 text-sm">')
    .replace(/<span class="description">/g, '<span class="text-sm text-gray-500 ml-2">(')
    // Optimization section - compact
    .replace(/<div class="optimization-section">/g, '<div class="mb-1">')
    .replace(/<div class="optimization-grid">/g, '<div class="text-sm space-y-1">')
    .replace(/<div class="region-card">/g, '<div class="flex justify-between items-center text-sm">')
    .replace(/<div class="region-name">/g, '<div class="font-medium text-gray-700 text-sm">')
    .replace(/<div class="region-percentage">/g, '<div class="font-semibold text-gray-900 text-sm">')
    .replace(/<div class="optimization-note">/g, '<div class="text-sm text-gray-600">')
    .replace(/<span class="note-icon">/g, '<span class="text-blue-500">')
    .replace(/<span class="note-text">/g, '<span>')
    // Lists - compact
    .replace(/• (.*?)$/gm, '<li class="ml-1 text-sm">• $1</li>')
    .replace(/✓ (.*?)$/gm, '<li class="ml-1 text-sm text-green-600">✓ $1</li>')
    .replace(/→ (.*?)$/gm, '<div class="ml-1 text-sm text-gray-600">→ $1</div>')
    // Status icons
    .replace(/✅/g, '<span class="text-green-600">✅</span>')
    .replace(/❌/g, '<span class="text-red-600">❌</span>')
    .replace(/⚠️/g, '<span class="text-yellow-600">⚠️</span>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

