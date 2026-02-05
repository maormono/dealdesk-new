import React from 'react';
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { SavedDeal, DealStatus } from '../config/dealConfig';
import { formatDealId } from '../config/dealConfig';

interface DealListProps {
  deals: SavedDeal[];
  onSelectDeal: (deal: SavedDeal) => void;
  onCreateNew: () => void;
  isLoading: boolean;
}

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

export const DealList: React.FC<DealListProps> = ({
  deals,
  onSelectDeal,
  onCreateNew,
  isLoading,
}) => {
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
    if (countries.length === 0) return 'No countries';
    if (countries.length === 1) return countries[0];
    if (countries.length <= 3) return countries.join(', ');
    return `${countries.slice(0, 2).join(', ')} +${countries.length - 2} more`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#5B9BD5] animate-spin" />
        <span className="ml-3 text-gray-600">Loading your deals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Your Deal Evaluations</h2>
          <p className="text-sm text-gray-500 mt-1">
            {deals.length === 0
              ? 'Create your first deal evaluation to get started'
              : `${deals.length} deal${deals.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#5B9BD5] to-[#9B7BB6] text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" />
          Create New Deal
        </button>
      </div>

      {/* Empty State */}
      {deals.length === 0 && (
        <div className="bg-gradient-to-br from-white via-[#5B9BD5]/[0.02] to-[#5B9BD5]/[0.05] rounded-2xl border border-[#5B9BD5]/10 p-12 text-center">
          <div className="w-16 h-16 bg-[#5B9BD5]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#5B9BD5]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No deals yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Start by creating a new deal evaluation. Each deal will be tracked with a unique ID for audit purposes.
          </p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5B9BD5] to-[#9B7BB6] text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Create Your First Deal
          </button>
        </div>
      )}

      {/* Deal Cards */}
      {deals.length > 0 && (
        <div className="grid gap-4">
          {deals.map((deal) => {
            const status = statusConfig[deal.status];
            const verdict = deal.verdict ? verdictConfig[deal.verdict] : null;
            const StatusIcon = status.icon;
            const VerdictIcon = verdict?.icon;

            return (
              <div
                key={deal.id}
                onClick={() => onSelectDeal(deal)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#5B9BD5]/50 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  {/* Left side - Deal info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-semibold text-[#5B9BD5]">
                        {formatDealId(deal.id)}
                      </span>
                      {deal.deal_name && (
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={deal.deal_name}>
                          {deal.deal_name}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      {verdict && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${verdict.color}`}>
                          {VerdictIcon && <VerdictIcon className="w-3 h-3" />}
                          {verdict.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{deal.sim_quantity.toLocaleString()}</span> SIMs
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="truncate max-w-[300px]" title={deal.countries.join(', ')}>
                        {formatCountries(deal.countries)}
                      </span>
                    </div>
                  </div>

                  {/* Right side - Price & Date */}
                  <div className="text-right shrink-0 ml-4">
                    {deal.proposed_price_per_sim && (
                      <div className="text-sm font-medium text-gray-900">
                        ${deal.proposed_price_per_sim.toFixed(2)}/SIM
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(deal.created_at)}
                    </div>
                  </div>
                </div>

                {/* Profit margin indicator for evaluated deals */}
                {deal.profit_margin !== null && deal.profit_margin !== undefined && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Profit Margin</span>
                      <span className={`font-medium ${
                        deal.profit_margin >= 0.35 ? 'text-green-600' :
                        deal.profit_margin >= 0.20 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(deal.profit_margin * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
