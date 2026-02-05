import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  X,
  Calendar,
  User,
  Trash2,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { dealPersistenceService } from '../../services/dealPersistenceService';
import type { SavedDeal, DealFilters, DealStatus } from '../../config/dealConfig';
import { formatDealId } from '../../config/dealConfig';

// Country to region mapping
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

// Region colors for badges
const regionColors = [
  'bg-[#5B9BD5]/10 text-[#5B9BD5] border-[#5B9BD5]/20',
  'bg-[#9B7BB6]/10 text-[#9B7BB6] border-[#9B7BB6]/20',
  'bg-[#EC6B9D]/10 text-[#EC6B9D] border-[#EC6B9D]/20',
  'bg-[#F5B342]/10 text-[#F5B342] border-[#F5B342]/20'
];

const statusConfig: Record<DealStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: FileText,
  },
  evaluated: {
    label: 'Evaluated',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: CheckCircle,
  },
  finalized: {
    label: 'Finalized',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  archived: {
    label: 'Archived',
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: Clock,
  },
};

const verdictConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  negotiable: {
    label: 'Negotiable',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: AlertCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
};

export const DealAudit: React.FC = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [deletedDeals, setDeletedDeals] = useState<SavedDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeletedDeals, setShowDeletedDeals] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<SavedDeal | null>(null);
  const [dealToDelete, setDealToDelete] = useState<SavedDeal | null>(null);
  const [dealToRestore, setDealToRestore] = useState<SavedDeal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Filters
  const [filters, setFilters] = useState<DealFilters>({});
  const [statusFilter, setStatusFilter] = useState<DealStatus | ''>('');
  const [verdictFilter, setVerdictFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<'created_at' | 'user_email' | 'sim_quantity'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchDeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const appliedFilters: DealFilters = {};

      if (searchQuery.trim()) {
        appliedFilters.searchQuery = searchQuery.trim();
      }
      if (statusFilter) {
        appliedFilters.status = statusFilter;
      }
      if (verdictFilter) {
        appliedFilters.verdict = verdictFilter;
      }
      if (dateFrom) {
        appliedFilters.dateFrom = dateFrom;
      }
      if (dateTo) {
        appliedFilters.dateTo = dateTo;
      }

      const allDeals = await dealPersistenceService.getAllDeals(appliedFilters);

      // Sort deals
      const sortedDeals = [...allDeals].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'user_email':
            comparison = a.user_email.localeCompare(b.user_email);
            break;
          case 'sim_quantity':
            comparison = a.sim_quantity - b.sim_quantity;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      setDeals(sortedDeals);
    } catch (error) {
      console.error('Error fetching deals for audit:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, verdictFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const fetchDeletedDeals = useCallback(async () => {
    try {
      const deleted = await dealPersistenceService.getDeletedDeals();
      setDeletedDeals(deleted);
    } catch (error) {
      console.error('Error fetching deleted deals:', error);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    if (showDeletedDeals) {
      fetchDeletedDeals();
    }
  }, [showDeletedDeals, fetchDeletedDeals]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCountries = (countries: string[]) => {
    if (countries.length === 0) return 'None';
    if (countries.length === 1) return countries[0];
    if (countries.length <= 2) return countries.join(', ');
    return `${countries.slice(0, 2).join(', ')} +${countries.length - 2}`;
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Deal ID',
      'Deal Name',
      'User Email',
      'Status',
      'Verdict',
      'SIM Quantity',
      'Countries',
      'Price/SIM',
      'Currency',
      'Duration (months)',
      'Profit Margin',
      'Created At',
      'Evaluated At',
    ];

    const rows = deals.map(deal => [
      formatDealId(deal.id),
      deal.deal_name || '',
      deal.user_email,
      deal.status,
      deal.verdict || 'N/A',
      deal.sim_quantity,
      deal.countries.join('; '),
      deal.proposed_price_per_sim?.toFixed(2) || 'N/A',
      deal.currency,
      deal.duration_months || 'N/A',
      deal.profit_margin ? `${(deal.profit_margin * 100).toFixed(1)}%` : 'N/A',
      formatDate(deal.created_at),
      deal.evaluated_at ? formatDate(deal.evaluated_at) : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `deal-audit-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setVerdictFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return;

    setIsDeleting(true);
    try {
      await dealPersistenceService.deleteDeal(dealToDelete.id);
      setDealToDelete(null);
      await fetchDeals(); // Refresh the active list
      await fetchDeletedDeals(); // Refresh the deleted list
    } catch (error) {
      console.error('Error deleting deal:', error);
      alert('Failed to delete deal. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreDeal = async () => {
    if (!dealToRestore) return;

    setIsRestoring(true);
    try {
      await dealPersistenceService.restoreDeal(dealToRestore.id);
      setDealToRestore(null);
      await fetchDeals(); // Refresh the active list
      await fetchDeletedDeals(); // Refresh the deleted list
    } catch (error) {
      console.error('Error restoring deal:', error);
      alert('Failed to restore deal. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const hasActiveFilters = searchQuery || statusFilter || verdictFilter || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Deal Audit</h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and audit all deal evaluations across the organization
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={deals.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Deal ID or User Email..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50 focus:border-[#5B9BD5]"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-[#5B9BD5]/10 border-[#5B9BD5] text-[#5B9BD5]'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#5B9BD5]" />
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DealStatus | '')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="evaluated">Evaluated</option>
                  <option value="finalized">Finalized</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Verdict Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Verdict</label>
                <select
                  value={verdictFilter}
                  onChange={(e) => setVerdictFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50"
                >
                  <option value="">All Verdicts</option>
                  <option value="approved">Approved</option>
                  <option value="negotiable">Negotiable</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]/50"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{deals.length}</div>
          <div className="text-sm text-gray-500">Total Deals</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {deals.filter(d => d.verdict === 'approved').length}
          </div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {deals.filter(d => d.verdict === 'negotiable').length}
          </div>
          <div className="text-sm text-gray-500">Negotiable</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">
            {deals.filter(d => d.verdict === 'rejected').length}
          </div>
          <div className="text-sm text-gray-500">Rejected</div>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#5B9BD5] animate-spin" />
            <span className="ml-3 text-gray-600">Loading deals...</span>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
            <p className="text-gray-500">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results.'
                : 'No deals have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {sortBy === 'created_at' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Deal ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Deal Name
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('user_email')}
                  >
                    <div className="flex items-center gap-1">
                      User
                      {sortBy === 'user_email' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Verdict
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('sim_quantity')}
                  >
                    <div className="flex items-center gap-1">
                      SIMs
                      {sortBy === 'sim_quantity' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Countries
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Margin
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deals.map((deal) => {
                  const status = statusConfig[deal.status];
                  const verdict = deal.verdict ? verdictConfig[deal.verdict] : null;
                  const StatusIcon = status.icon;
                  const VerdictIcon = verdict?.icon;

                  return (
                    <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(deal.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/deal-review?dealId=${deal.id}&from=audit`)}
                          className="font-mono text-sm font-medium text-[#5B9BD5] hover:text-[#4A8AC4] hover:underline flex items-center gap-1 transition-colors"
                        >
                          {formatDealId(deal.id)}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 truncate max-w-[150px] block" title={deal.deal_name || ''}>
                          {deal.deal_name || <span className="text-gray-400">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {deal.user_email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">{deal.user_email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {verdict ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${verdict.color}`}>
                            {VerdictIcon && <VerdictIcon className="w-3 h-3" />}
                            {verdict.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {deal.sim_quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600" title={deal.countries.join(', ')}>
                        {formatCountries(deal.countries)}
                      </td>
                      <td className="px-4 py-3">
                        {deal.profit_margin !== null && deal.profit_margin !== undefined ? (
                          <span className={`text-sm font-medium ${
                            deal.profit_margin >= 0.35 ? 'text-green-600' :
                            deal.profit_margin >= 0.20 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {(deal.profit_margin * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDeal(deal)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#5B9BD5] hover:bg-[#5B9BD5]/10 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => setDealToDelete(deal)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deleted Deals Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowDeletedDeals(!showDeletedDeals)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Deleted Deals</span>
            {deletedDeals.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                {deletedDeals.length}
              </span>
            )}
          </div>
          {showDeletedDeals ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showDeletedDeals && (
          <div className="border-t border-gray-200">
            {deletedDeals.length === 0 ? (
              <div className="text-center py-8">
                <Trash2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No deleted deals</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-red-50/50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Deal ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        SIMs
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Deleted At
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {deletedDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-4 py-2">
                          <span className="font-mono text-sm font-medium text-gray-500">
                            {formatDealId(deal.id)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {deal.user_email}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {deal.sim_quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {deal.deleted_at ? formatDate(deal.deleted_at) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => setDealToRestore(deal)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-semibold text-[#5B9BD5]">
                  {formatDealId(selectedDeal.id)}
                </span>
                {selectedDeal.deal_name && (
                  <span className="text-lg font-medium text-gray-700">
                    {selectedDeal.deal_name}
                  </span>
                )}
                {selectedDeal.verdict && verdictConfig[selectedDeal.verdict] && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${verdictConfig[selectedDeal.verdict].color}`}>
                    {selectedDeal.verdict.charAt(0).toUpperCase() + selectedDeal.verdict.slice(1)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-130px)] p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Deal Info */}
                <div className="space-y-6">
                  {/* User Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Created By
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {selectedDeal.user_email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{selectedDeal.user_email}</div>
                        <div className="text-xs text-gray-500">
                          Created on {formatDate(selectedDeal.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deal Parameters */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Deal Parameters</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">SIM Quantity</span>
                        <span className="font-medium text-gray-900">{selectedDeal.sim_quantity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Proposed Price</span>
                        <span className="font-medium text-gray-900">
                          ${selectedDeal.proposed_price_per_sim?.toFixed(2)}/SIM
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium text-gray-900">{selectedDeal.duration_months} months</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Monthly Data</span>
                        <span className="font-medium text-gray-900">
                          {selectedDeal.monthly_data_per_sim ? `${selectedDeal.monthly_data_per_sim} GB` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Currency</span>
                        <span className="font-medium text-gray-900">{selectedDeal.currency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Evaluation Results */}
                <div className="space-y-6">
                  {/* Evaluation Summary */}
                  {selectedDeal.basic_evaluation && (
                    <div className="bg-gradient-to-br from-gray-50 to-[#5B9BD5]/5 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Evaluation Results</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Verdict</span>
                          {selectedDeal.verdict && verdictConfig[selectedDeal.verdict] && (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${verdictConfig[selectedDeal.verdict].color}`}>
                              {selectedDeal.verdict.charAt(0).toUpperCase() + selectedDeal.verdict.slice(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Profit Margin</span>
                          <span className={`text-lg font-bold ${
                            (selectedDeal.profit_margin || 0) >= 0.35 ? 'text-green-600' :
                            (selectedDeal.profit_margin || 0) >= 0.20 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {selectedDeal.profit_margin ? `${(selectedDeal.profit_margin * 100).toFixed(1)}%` : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Risk Score</span>
                          <span className="font-medium text-gray-900">
                            {selectedDeal.risk_score ?? '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Total Contract Value</span>
                          <span className="font-medium text-gray-900">
                            {selectedDeal.total_contract_value
                              ? `$${selectedDeal.total_contract_value.toLocaleString()}`
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Timeline
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-gray-500">Created:</span>
                        <span className="text-gray-900">{formatDate(selectedDeal.created_at)}</span>
                      </div>
                      {selectedDeal.evaluated_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-gray-500">Evaluated:</span>
                          <span className="text-gray-900">{formatDate(selectedDeal.evaluated_at)}</span>
                        </div>
                      )}
                      {selectedDeal.finalized_at && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-gray-500">Finalized:</span>
                          <span className="text-gray-900">{formatDate(selectedDeal.finalized_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing Data Used */}
                  {selectedDeal.pricing_data_filename && (
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                        Pricing Data Used
                      </h4>
                      <div className="text-sm text-gray-600">
                        {selectedDeal.pricing_data_filename}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Data ID: #{selectedDeal.pricing_data_id}
                      </div>
                    </div>
                  )}

                  {/* Raw Data Info */}
                  <div className="text-xs text-gray-400">
                    <p>Full evaluation data stored in database.</p>
                    <p>Deal ID: {selectedDeal.id}</p>
                  </div>
                </div>
              </div>

              {/* Countries - Grouped by Region (Full Width) */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Countries ({selectedDeal.countries.length})</h4>
                <div className="space-y-3">
                  {REGION_ORDER.filter(region =>
                    selectedDeal.countries.some(country => getRegion(country) === region)
                  ).map((region, regionIdx) => {
                    const countriesInRegion = selectedDeal.countries
                      .filter(country => getRegion(country) === region)
                      .sort();
                    const colorClass = regionColors[regionIdx % regionColors.length];
                    return (
                      <div key={region} className="flex items-start gap-3">
                        <div className="text-xs font-semibold text-gray-500 w-24 pt-1 shrink-0">{region}</div>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {countriesInRegion.map((country) => (
                            <span
                              key={country}
                              className={`px-2 py-0.5 text-xs rounded-full border ${colorClass}`}
                            >
                              {country}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedDeal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {dealToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Deal</h3>
                <p className="text-sm text-gray-500">You can restore this deal later</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Deal ID</span>
                  <span className="font-mono font-medium text-[#5B9BD5]">
                    {formatDealId(dealToDelete.id)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">User</span>
                  <span className="text-gray-900">{dealToDelete.user_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SIMs</span>
                  <span className="text-gray-900">{dealToDelete.sim_quantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Countries</span>
                  <span className="text-gray-900">{dealToDelete.countries.length}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this deal evaluation? The deal will be moved to the Deleted Deals section and can be restored later.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDealToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDeal}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Deal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {dealToRestore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Restore Deal</h3>
                <p className="text-sm text-gray-500">Bring this deal back to the active list</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Deal ID</span>
                  <span className="font-mono font-medium text-[#5B9BD5]">
                    {formatDealId(dealToRestore.id)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">User</span>
                  <span className="text-gray-900">{dealToRestore.user_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SIMs</span>
                  <span className="text-gray-900">{dealToRestore.sim_quantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Deleted At</span>
                  <span className="text-gray-900">
                    {dealToRestore.deleted_at ? formatDate(dealToRestore.deleted_at) : '-'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to restore this deal? It will be moved back to the active deals list.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDealToRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreDeal}
                disabled={isRestoring}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Restore Deal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
