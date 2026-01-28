import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp, DollarSign, Globe, Activity, Info, FileText } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface DealProposalViewProps {
  formData: any;
  evaluation: any;
  enhancedAnalysis: any;
  comprehensiveAnalysis?: any;
}

export const DealProposalView: React.FC<DealProposalViewProps> = ({
  formData,
  evaluation,
  enhancedAnalysis,
  comprehensiveAnalysis
}) => {
  const { isAdmin } = useUser();

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

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency || 'USD',
      minimumFractionDigits: value < 1 ? 3 : 2,
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  };

  // Format data costs - always 4 decimal places
  const formatDataCost = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency || 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
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
                <span className="text-sm text-gray-900">
                  {formatCurrency(listPrice)}/month
                </span>
              </div>

              {/* List Price Breakdown - indented sub-items */}
              <div className="pl-4 space-y-2 pb-2 border-b border-gray-200">
                {/* Active SIM Fee */}
                {enhancedAnalysis?.payAsYouGo?.activeSimFee !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Active SIM Fee</span>
                    <span className="text-xs font-medium text-gray-600">
                      {formatCurrency(enhancedAnalysis.payAsYouGo.activeSimFee)}/month
                    </span>
                  </div>
                )}

                {/* Data Cost */}
                {enhancedAnalysis?.payAsYouGo?.dataCostPerSim !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Data Cost ({formData.monthlyDataPerSim >= 1
                        ? `${formData.monthlyDataPerSim} GB × ${formatDataCost(enhancedAnalysis.payAsYouGo.dataFee * 1024)}/GB`
                        : `${formData.monthlyDataPerSim * 1024} MB × ${formatDataCost(enhancedAnalysis.payAsYouGo.dataFee)}/MB`})
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      {formatDataCost(enhancedAnalysis.payAsYouGo.dataCostPerSim)}/month
                    </span>
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
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(listPrice * (1 - approvedDiscount / 100))}/month
                </span>
              </div>

              {/* Requested Price per SIM */}
              <div className="flex justify-between items-center py-2 pt-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">
                  Requested Price per SIM
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {formatCurrency(yourPrice)}/month
                </span>
              </div>


              {/* Monthly Total */}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-700">Total Monthly Recurring</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(monthlyTotal)}/month
                </span>
              </div>

              {/* Contract Total */}
              <div className="flex justify-between items-center py-2 pt-3 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total Contract Value</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(contractTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Network Details */}
          {networks.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                Network Configuration
              </h3>

              <div className="space-y-4">
                {formData.countries.map((country: string) => {
                  const countryNetworks = networks.filter(n => n.country === country);
                  const usage = formData.usagePercentages?.[country] || (100 / formData.countries.length);

                  return (
                    <div key={country} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center py-1">
                        <span className="font-semibold text-gray-900">{country}</span>
                      </div>
                      {countryNetworks.map((network, idx) => {
                        // Apply 50% markup to show the customer-facing rate
                        const customerRate = network.dataRate * 1.5;
                        return (
                          <div key={idx} className="flex justify-between items-center py-1">
                            <span className="text-sm text-gray-600">
                              {usage.toFixed(0)}% of total data usage via <span className="font-semibold text-gray-900">{network.carrier}</span> network {network.operator && `(identity ${network.operator})`}
                            </span>
                            <span className="text-sm text-gray-700 font-medium">
                              {formatDataCost(customerRate)}/MB • {formatDataCost(customerRate * 1024)}/GB
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {hasMultipleNetworks && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Multiple networks selected for redundancy. Usage will be distributed based on
                      configured percentages. IMSI access fees apply per active network.
                    </span>
                  </p>
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