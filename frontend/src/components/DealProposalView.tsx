import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, DollarSign, Globe, Activity, Info, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

// Country to Region mapping (simplified version for display)
const countryToRegion: Record<string, string> = {
  // Africa
  'Algeria': 'Africa', 'Angola': 'Africa', 'Botswana': 'Africa', 'Cameroon': 'Africa',
  'Egypt': 'Africa', 'Ethiopia': 'Africa', 'Ghana': 'Africa', 'Kenya': 'Africa',
  'Morocco': 'Africa', 'Nigeria': 'Africa', 'South Africa': 'Africa', 'Tanzania': 'Africa',
  'Tunisia': 'Africa', 'Uganda': 'Africa', 'Zambia': 'Africa', 'Zimbabwe': 'Africa',
  // Asia
  'Bangladesh': 'Asia', 'China': 'Asia', 'Hong Kong': 'Asia', 'India': 'Asia',
  'Indonesia': 'Asia', 'Japan': 'Asia', 'Kazakhstan': 'Asia', 'Malaysia': 'Asia',
  'Pakistan': 'Asia', 'Philippines': 'Asia', 'Singapore': 'Asia', 'South Korea': 'Asia',
  'Taiwan': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia',
  // Europe
  'Albania': 'Europe', 'Andorra': 'Europe', 'Austria': 'Europe', 'Belarus': 'Europe',
  'Belgium': 'Europe', 'Bosnia and Herzegovina': 'Europe', 'Bulgaria': 'Europe', 'Croatia': 'Europe',
  'Cyprus': 'Europe', 'Czech Republic': 'Europe', 'Denmark': 'Europe', 'Estonia': 'Europe',
  'Faroe Islands': 'Europe', 'Finland': 'Europe', 'France': 'Europe', 'Germany': 'Europe',
  'Gibraltar': 'Europe', 'Greece': 'Europe', 'Greenland': 'Europe', 'Guernsey': 'Europe',
  'Hungary': 'Europe', 'Iceland': 'Europe', 'Ireland': 'Europe', 'Isle of Man': 'Europe',
  'Italy': 'Europe', 'Jersey': 'Europe', 'Kosovo': 'Europe', 'Latvia': 'Europe',
  'Liechtenstein': 'Europe', 'Lithuania': 'Europe', 'Luxembourg': 'Europe', 'Malta': 'Europe',
  'Moldova': 'Europe', 'Moldova Republic of': 'Europe', 'Monaco': 'Europe', 'Montenegro': 'Europe',
  'Montenegro, Republic of': 'Europe', 'Netherlands': 'Europe', 'North Macedonia': 'Europe',
  'Macedonia Republic of': 'Europe', 'Norway': 'Europe', 'Poland': 'Europe', 'Portugal': 'Europe',
  'Romania': 'Europe', 'Russia': 'Europe', 'San Marino': 'Europe', 'Serbia': 'Europe',
  'Serbia Republic of': 'Europe', 'Slovakia': 'Europe', 'Slovenia': 'Europe', 'Spain': 'Europe',
  'Sweden': 'Europe', 'Switzerland': 'Europe', 'Turkey': 'Europe', 'Ukraine': 'Europe',
  'United Kingdom': 'Europe',
  // Middle East
  'Bahrain': 'Middle East', 'Iran': 'Middle East', 'Iraq': 'Middle East', 'Israel': 'Middle East',
  'Jordan': 'Middle East', 'Kuwait': 'Middle East', 'Lebanon': 'Middle East', 'Oman': 'Middle East',
  'Palestine': 'Middle East', 'Qatar': 'Middle East', 'Saudi Arabia': 'Middle East',
  'United Arab Emirates': 'Middle East', 'Yemen': 'Middle East',
  // North America
  'Canada': 'North America', 'Mexico': 'North America', 'United States': 'North America',
  // Central America & Caribbean
  'Costa Rica': 'Central America', 'El Salvador': 'Central America', 'Guatemala': 'Central America',
  'Honduras': 'Central America', 'Nicaragua': 'Central America', 'Panama': 'Central America', 'Belize': 'Central America',
  'Anguilla': 'Caribbean', 'Antigua and Barbuda': 'Caribbean', 'Aruba': 'Caribbean', 'Bahamas': 'Caribbean',
  'Barbados': 'Caribbean', 'Bonaire': 'Caribbean', 'British Virgin Islands': 'Caribbean', 'Cayman Islands': 'Caribbean',
  'Cuba': 'Caribbean', 'Curacao': 'Caribbean', 'Dominica': 'Caribbean', 'Dominican Republic': 'Caribbean',
  'Grenada': 'Caribbean', 'Guadeloupe': 'Caribbean', 'Haiti': 'Caribbean', 'Jamaica': 'Caribbean',
  'Martinique': 'Caribbean', 'Montserrat': 'Caribbean', 'Puerto Rico': 'Caribbean', 'Saint Kitts and Nevis': 'Caribbean',
  'Saint Lucia': 'Caribbean', 'Saint Martin': 'Caribbean', 'Saint Vincent and the Grenadines': 'Caribbean',
  'Sint Maarten': 'Caribbean', 'Trinidad and Tobago': 'Caribbean', 'Turks and Caicos Islands': 'Caribbean',
  'US Virgin Islands': 'Caribbean', 'Virgin Islands, U.S.': 'Caribbean', 'Virgin Islands, British': 'Caribbean',
  // South America
  'Argentina': 'South America', 'Bolivia': 'South America', 'Brazil': 'South America',
  'Chile': 'South America', 'Colombia': 'South America', 'Ecuador': 'South America',
  'Paraguay': 'South America', 'Peru': 'South America', 'Uruguay': 'South America', 'Venezuela': 'South America',
  // Oceania
  'Australia': 'Oceania', 'Fiji': 'Oceania', 'New Zealand': 'Oceania', 'Papua New Guinea': 'Oceania',
  'Guam': 'Oceania', 'Samoa': 'Oceania', 'American Samoa': 'Oceania', 'Tonga': 'Oceania',
  'Vanuatu': 'Oceania', 'Solomon Islands': 'Oceania', 'Micronesia': 'Oceania', 'Palau': 'Oceania',
  'Marshall Islands': 'Oceania', 'Kiribati': 'Oceania', 'Nauru': 'Oceania', 'Tuvalu': 'Oceania',
  'French Polynesia': 'Oceania', 'New Caledonia': 'Oceania', 'Northern Mariana Islands': 'Oceania',
  // Additional Asia
  'Sri Lanka': 'Asia', 'Myanmar': 'Asia', 'Cambodia': 'Asia', 'Laos': 'Asia', 'Nepal': 'Asia',
  'Brunei': 'Asia', 'Mongolia': 'Asia', 'Macao': 'Asia', 'Macau': 'Asia', 'Maldives': 'Asia',
  'Bhutan': 'Asia', 'Timor-Leste': 'Asia', 'Afghanistan': 'Asia', 'Uzbekistan': 'Asia',
  'Turkmenistan': 'Asia', 'Tajikistan': 'Asia', 'Kyrgyzstan': 'Asia', 'Azerbaijan': 'Asia',
  'Armenia': 'Asia', 'Georgia': 'Asia',
  // Additional Africa
  'Senegal': 'Africa', 'Ivory Coast': 'Africa', "Cote d'Ivoire": 'Africa', 'Burkina Faso': 'Africa',
  'Mali': 'Africa', 'Niger': 'Africa', 'Chad': 'Africa', 'Sudan': 'Africa', 'South Sudan': 'Africa',
  'Eritrea': 'Africa', 'Djibouti': 'Africa', 'Somalia': 'Africa', 'Rwanda': 'Africa', 'Burundi': 'Africa',
  'Malawi': 'Africa', 'Mozambique': 'Africa', 'Madagascar': 'Africa', 'Mauritius': 'Africa',
  'Seychelles': 'Africa', 'Comoros': 'Africa', 'Reunion': 'Africa', 'Mayotte': 'Africa',
  'Namibia': 'Africa', 'Lesotho': 'Africa', 'Eswatini': 'Africa', 'Swaziland': 'Africa',
  'Gabon': 'Africa', 'Congo': 'Africa', 'Democratic Republic of the Congo': 'Africa',
  'Central African Republic': 'Africa', 'Equatorial Guinea': 'Africa', 'Sao Tome and Principe': 'Africa',
  'Cape Verde': 'Africa', 'Guinea': 'Africa', 'Guinea-Bissau': 'Africa', 'Gambia': 'Africa',
  'Sierra Leone': 'Africa', 'Liberia': 'Africa', 'Togo': 'Africa', 'Benin': 'Africa',
  // French territories
  'French Guiana': 'South America', 'Suriname': 'South America', 'Guyana': 'South America',
  'Falkland Islands': 'South America',
};

const getRegion = (country: string): string => {
  return countryToRegion[country] || 'Other';
};

const REGION_ORDER = ['Europe', 'Asia', 'Middle East', 'Africa', 'North America', 'Central America', 'Caribbean', 'South America', 'Oceania', 'Other'];

interface DealProposalViewProps {
  formData: any;
  evaluation: any;
  enhancedAnalysis: any;
  comprehensiveAnalysis?: any;
  currencyRates?: Record<string, number>;
}

export const DealProposalView: React.FC<DealProposalViewProps> = ({
  formData,
  evaluation,
  enhancedAnalysis,
  comprehensiveAnalysis,
  currencyRates = { USD: 1.0, EUR: 1.04, GBP: 1.38 }
}) => {
  const { isAdmin } = useUser();
  const [isNetworkExpanded, setIsNetworkExpanded] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  };

  // User's original currency (what they entered the price in)
  const originalCurrency = formData.currency || 'USD';
  const isOriginalUSD = originalCurrency === 'USD';

  // List price is calculated from costs + markup (the "official" price)
  const listPrice = enhancedAnalysis?.payAsYouGo?.listPrice || 0;

  // Your price is the customer's target price (or list price if no target)
  const yourPrice = enhancedAnalysis?.payAsYouGo?.yourPrice || listPrice;

  // Monogoto-approved discount (based on volume/contract tier)
  const approvedDiscount = enhancedAnalysis?.payAsYouGo?.discountPercentage || 0;

  // Requested discount (actual discount customer is asking for based on their target price)
  const requestedDiscount = enhancedAnalysis?.payAsYouGo?.requestedDiscountPercentage || 0;

  // Maximum allowed discount for this deal
  const maxAllowedDiscount = enhancedAnalysis?.payAsYouGo?.maxAllowedDiscount || 0;

  // Whether the deal is profitable
  const isProfitable = enhancedAnalysis?.payAsYouGo?.isProfitable !== false;

  const monthlyTotal = yourPrice * formData.simQuantity;
  const contractTotal = monthlyTotal * formData.duration;

  // Convert USD to original currency
  const usdToOriginal = (usdValue: number): number => {
    const rate = currencyRates[originalCurrency] || 1.0;
    return usdValue / rate;
  };

  // Format currency in USD (primary display)
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value < 1 ? 3 : 2,
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  };

  // Format currency in original currency (for secondary display)
  const formatOriginal = (usdValue: number) => {
    const convertedValue = usdToOriginal(usdValue);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: originalCurrency,
      minimumFractionDigits: convertedValue < 1 ? 3 : 2,
      maximumFractionDigits: convertedValue < 1 ? 4 : 2,
    }).format(convertedValue);
  };

  // Format data costs in USD - always 4 decimal places
  const formatDataCostUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  // Format data costs in original currency
  const formatDataCostOriginal = (usdValue: number) => {
    const convertedValue = usdToOriginal(usdValue);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: originalCurrency,
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(convertedValue);
  };

  // Extract network details from evaluation notes
  const extractNetworkDetails = () => {
    const networks: any[] = [];
    if (evaluation?.carrierOptions) {
      console.log('🎯 DealProposalView - Received carrier options:', evaluation.carrierOptions);
      evaluation.carrierOptions.forEach((carrier: any) => {
        console.log(`  📊 ${carrier.carrier} (${carrier.operator}): dataRate=$${carrier.dataRate}/MB`);
        networks.push({
          country: carrier.country,
          carrier: carrier.carrier,
          operator: carrier.operator,
          dataRate: carrier.dataRate,
          imsiCost: carrier.imsiCost,
        });
      });
    }
    console.log('🎯 DealProposalView - Extracted networks:', networks);
    return networks;
  };

  const networks = extractNetworkDetails();
  const hasMultipleNetworks = networks.length > 1;

  // Calculate identity distribution per region
  const getRegionIdentities = useMemo(() => {
    const regionIdentities: Record<string, Record<string, number>> = {};

    networks.forEach(network => {
      const region = getRegion(network.country);
      if (!regionIdentities[region]) {
        regionIdentities[region] = {};
      }
      const operator = network.operator || 'Unknown';
      regionIdentities[region][operator] = (regionIdentities[region][operator] || 0) + 1;
    });

    // Convert to percentages
    const regionIdentityPercentages: Record<string, { operator: string; percentage: number }[]> = {};
    Object.entries(regionIdentities).forEach(([region, operators]) => {
      const total = Object.values(operators).reduce((sum, count) => sum + count, 0);
      regionIdentityPercentages[region] = Object.entries(operators)
        .map(([operator, count]) => ({
          operator,
          percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.percentage - a.percentage);
    });

    return regionIdentityPercentages;
  }, [networks]);

  // Calculate overall identity distribution (across all networks)
  const overallIdentities = useMemo(() => {
    const identityCounts: Record<string, number> = {};

    networks.forEach(network => {
      const operator = network.operator || 'Unknown';
      identityCounts[operator] = (identityCounts[operator] || 0) + 1;
    });

    const total = Object.values(identityCounts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return [];

    return Object.entries(identityCounts)
      .map(([operator, count]) => ({
        operator,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [networks]);

  // Color palette for identity tags - based on identity letter
  const identityColors: Record<string, string> = {
    'E': 'bg-blue-100 text-blue-700 border-blue-200',
    'O': 'bg-purple-100 text-purple-700 border-purple-200',
    'B': 'bg-green-100 text-green-700 border-green-200',
    'A': 'bg-orange-100 text-orange-700 border-orange-200',
    'T': 'bg-pink-100 text-pink-700 border-pink-200',
    'M': 'bg-teal-100 text-teal-700 border-teal-200',
    'Unknown': 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const getIdentityColor = (operator: string): string => {
    // Use the first character of the operator as the identity key
    const identityKey = operator.charAt(0).toUpperCase();
    if (identityColors[identityKey]) return identityColors[identityKey];
    if (identityColors[operator]) return identityColors[operator];
    // Fallback to gray for unknown identities
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Deal Proposal</h2>
              <p className="text-sm text-gray-600 mt-1">
                Reference: {formData.simQuantity.toLocaleString()} SIMs • {formData.monthlyDataPerSim >= 1
                  ? `${formData.monthlyDataPerSim.toFixed(formData.monthlyDataPerSim % 1 === 0 ? 0 : 2)} GB`
                  : `${Math.round(formData.monthlyDataPerSim * 1024)} MB`} • {formData.duration} months • {formData.countries.join(', ')}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
              isProfitable && evaluation?.verdict === 'approved'
                ? 'bg-green-100 text-green-800'
                : !isProfitable
                ? 'bg-red-100 text-red-800'
                : evaluation?.verdict === 'negotiable'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {isProfitable && evaluation?.verdict === 'approved' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>
                {!isProfitable
                  ? 'REQUIRES APPROVAL'
                  : evaluation?.verdict?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Warning Banner for Unprofitable Deals */}
        {!isProfitable && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800">Deal Exceeds Discount Limits</h4>
                <p className="text-sm text-red-700 mt-1">
                  The customer's requested price requires a {requestedDiscount.toFixed(1)}% discount,
                  which exceeds the maximum allowed discount of {maxAllowedDiscount}% for this deal tier.
                  This deal requires management approval before proceeding.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-[#5B9BD5] opacity-70" />
                <span className="text-xs font-medium text-gray-400">VOLUME</span>
              </div>
              <div className="flex items-baseline space-x-2">
                <div className="text-xl font-semibold text-gray-900 tracking-tight">
                  {formData.simQuantity.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">SIM Cards</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-5 h-5 text-[#9B7BB6] opacity-70" />
                <span className="text-xs font-medium text-gray-400">COVERAGE</span>
              </div>
              <div className="flex items-baseline space-x-2">
                <div className="text-xl font-semibold text-gray-900 tracking-tight">
                  {formData.countries.length}
                </div>
                <div className="text-sm text-gray-500">
                  {formData.countries.length === 1 ? 'Country' : 'Countries'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-[#EC6B9D] opacity-70" />
                <span className="text-xs font-medium text-gray-400">DATA PLAN</span>
              </div>
              <div className="flex items-baseline space-x-2">
                <div className="text-xl font-semibold text-gray-900 tracking-tight">
                  {formData.monthlyDataPerSim >= 1
                    ? `${formData.monthlyDataPerSim.toFixed(2)} GB`
                    : `${Math.round(formData.monthlyDataPerSim * 1024)} MB`}
                </div>
                <div className="text-sm text-gray-500">SIM/month</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-[#F5B342] opacity-70" />
                <span className="text-xs font-medium text-gray-400">TERM</span>
              </div>
              <div className="flex items-baseline space-x-2">
                <div className="text-xl font-semibold text-gray-900 tracking-tight">
                  {formData.duration}
                </div>
                <div className="text-sm text-gray-500">Months</div>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Pricing Structure
            </h3>

            <div className="space-y-3">
              {/* List Price Header */}
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-900">List Price per SIM</span>
                <div className="text-right">
                  <span className="text-sm text-gray-900">{formatUSD(listPrice)}/month</span>
                  {!isOriginalUSD && (
                    <div className="text-xs text-gray-500">{formatOriginal(listPrice)}/month</div>
                  )}
                </div>
              </div>

              {/* List Price Breakdown - indented sub-items */}
              <div className="pl-4 space-y-2 pb-2 border-b border-gray-200">
                {/* Active SIM Fee */}
                {enhancedAnalysis?.payAsYouGo?.activeSimFee !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Active SIM Fee</span>
                    <div className="text-right">
                      <span className="text-xs font-medium text-gray-600">{formatUSD(enhancedAnalysis.payAsYouGo.activeSimFee)}/month</span>
                      {!isOriginalUSD && (
                        <div className="text-xs text-gray-400">{formatOriginal(enhancedAnalysis.payAsYouGo.activeSimFee)}/month</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Data Cost */}
                {enhancedAnalysis?.payAsYouGo?.dataCostPerSim !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Data Cost ({formData.monthlyDataPerSim >= 1
                        ? `${formData.monthlyDataPerSim} GB × ${formatDataCostUSD(enhancedAnalysis.payAsYouGo.dataFee * 1024)}/GB`
                        : `${formData.monthlyDataPerSim * 1024} MB × ${formatDataCostUSD(enhancedAnalysis.payAsYouGo.dataFee)}/MB`})
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-medium text-gray-600">{formatDataCostUSD(enhancedAnalysis.payAsYouGo.dataCostPerSim)}/month</span>
                      {!isOriginalUSD && (
                        <div className="text-xs text-gray-400">{formatDataCostOriginal(enhancedAnalysis.payAsYouGo.dataCostPerSim)}/month</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Monogoto Approved Discount */}
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  Monogoto Approved Discount ({formData.simQuantity.toLocaleString()} SIMs)
                </span>
                <span className="text-sm text-gray-900">
                  {approvedDiscount > 0 ? `-${approvedDiscount.toFixed(1)}%` : '0%'}
                </span>
              </div>

              {/* List Price after Approved Discount */}
              <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
                <span className="text-sm font-semibold text-gray-900">
                  List Price per SIM after Discount
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{formatUSD(listPrice * (1 - approvedDiscount / 100))}/month</span>
                  {!isOriginalUSD && (
                    <div className="text-xs text-gray-500">{formatOriginal(listPrice * (1 - approvedDiscount / 100))}/month</div>
                  )}
                </div>
              </div>

              {/* Requested Price per SIM */}
              <div className="flex justify-between items-center py-2 pt-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  Requested Price per SIM
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-blue-600">{formatUSD(yourPrice)}/month</span>
                  {!isOriginalUSD && (
                    <div className="text-xs text-blue-400">{formatOriginal(yourPrice)}/month</div>
                  )}
                </div>
              </div>


              {/* Monthly Total */}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-700">Total Monthly Recurring</span>
                <div className="text-right">
                  <span className="text-lg font-semibold text-gray-900">{formatUSD(monthlyTotal)}/month</span>
                  {!isOriginalUSD && (
                    <div className="text-xs text-gray-500">{formatOriginal(monthlyTotal)}/month</div>
                  )}
                </div>
              </div>

              {/* Contract Total */}
              <div className="flex justify-between items-center py-2 pt-3 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total Contract Value</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900">{formatUSD(contractTotal)}</span>
                  {!isOriginalUSD && (
                    <div className="text-sm text-gray-500">{formatOriginal(contractTotal)}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Network Details */}
          {networks.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              {/* Clickable Header */}
              <button
                type="button"
                onClick={() => setIsNetworkExpanded(!isNetworkExpanded)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-600" />
                  Network Configuration
                  <span className="text-sm font-normal text-gray-500">({formData.countries.length} {formData.countries.length === 1 ? 'country' : 'countries'})</span>
                  {/* Overall Identity Distribution Tags */}
                  {overallIdentities.length > 0 && (
                    <span className="flex items-center gap-1.5 ml-2">
                      {overallIdentities.map((identity) => (
                        <span
                          key={identity.operator}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getIdentityColor(identity.operator)}`}
                        >
                          {identity.operator}: {identity.percentage}%
                        </span>
                      ))}
                    </span>
                  )}
                </h3>
                {isNetworkExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>


              {/* Collapsible Network List - Grouped by Region */}
              {isNetworkExpanded && (
                <div className="mt-4 space-y-2">
                  {REGION_ORDER.filter(region =>
                    formData.countries.some((country: string) => getRegion(country) === region)
                  ).map(region => {
                    const countriesInRegion = formData.countries.filter((country: string) => getRegion(country) === region);
                    const isRegionExpanded = expandedRegions.has(region);

                    return (
                      <div key={region} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Region Header - Clickable */}
                        <button
                          type="button"
                          onClick={() => toggleRegion(region)}
                          className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 hover:bg-gray-150 text-left"
                        >
                          <span className="font-semibold text-gray-800 flex items-center gap-2">
                            {isRegionExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                            {region}
                            {/* Identity Distribution Tags */}
                            {getRegionIdentities[region] && (
                              <span className="flex items-center gap-1.5 ml-2">
                                {getRegionIdentities[region].map((identity) => (
                                  <span
                                    key={identity.operator}
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getIdentityColor(identity.operator)}`}
                                  >
                                    {identity.operator}: {identity.percentage}%
                                  </span>
                                ))}
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-gray-500">
                            {countriesInRegion.length} {countriesInRegion.length === 1 ? 'country' : 'countries'}
                          </span>
                        </button>

                        {/* Countries in Region - Collapsible */}
                        {isRegionExpanded && (
                          <div className="px-4 py-2 space-y-1">
                            {countriesInRegion.map((country: string) => {
                              const countryNetworks = networks.filter(n => n.country === country);
                              const usage = formData.usagePercentages?.[country] || (100 / formData.countries.length);

                              return countryNetworks.map((network, idx) => {
                                const customerRate = network.dataRate * 1.5;
                                return (
                                  <div key={`${country}-${idx}`} className="flex items-center py-1.5 border-b border-gray-100 last:border-b-0">
                                    <span className="font-medium text-gray-900 flex-1">{country}</span>
                                    <span className="text-sm text-gray-600 w-80 text-left shrink-0 pl-4">
                                      {usage.toFixed(0)}% via <span className="font-medium text-gray-800">{network.carrier}</span> {network.operator && `(${network.operator})`}
                                    </span>
                                    <div className="text-right w-56 shrink-0">
                                      <span className="text-sm text-gray-700 font-medium">
                                        {formatDataCostUSD(customerRate)}/MB
                                        {!isOriginalUSD && (
                                          <span className="text-gray-500 font-normal"> ({formatDataCostOriginal(customerRate)})</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                );
                              });
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="bg-amber-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Important Terms
            </h3>

            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>
                  <strong>Overage Policy:</strong> Any data usage exceeding {formData.monthlyDataPerSim >= 1
                    ? `${formData.monthlyDataPerSim.toFixed(formData.monthlyDataPerSim % 1 === 0 ? 0 : 2)} GB`
                    : `${Math.round(formData.monthlyDataPerSim * 1024)} MB`} per SIM
                  will be charged at standard pay-as-you-go rates. Alternatively, the customer can configure automatic SIM suspension once this threshold is reached.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>
                  <strong>Billing Terms:</strong> Monthly billing cycle with NET-30 payment terms.
                  Active SIM fees apply to all provisioned SIMs regardless of usage.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>
                  <strong>Network Access:</strong> One-time IMSI access fees may apply per network.
                  Multi-network configurations incur separate access fees for each network.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>
                  <strong>Contract Terms:</strong> {formData.duration}-month commitment required.
                  Pricing subject to annual review and adjustment based on usage patterns.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>
                  <strong>Service Level:</strong> Standard network redundancy and 24/7 support included.
                  Premium SLA options available upon request.
                </span>
              </li>
            </ul>
          </div>

          {/* Margin/Profitability (only for admin users when approved) */}
          {isAdmin && evaluation?.verdict === 'approved' && evaluation?.profitMargin && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">Deal Profitability</span>
                <span className="text-sm font-bold text-green-900">
                  {(evaluation.profitMargin * 100).toFixed(1)}% margin
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};