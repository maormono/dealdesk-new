import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp, Shield, DollarSign, Globe, Activity, Info } from 'lucide-react';

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
  // List price is calculated from costs + markup (the "official" price)
  const listPrice = enhancedAnalysis?.payAsYouGo?.listPrice || 0;

  // Your price is the customer's target price (or list price if no target)
  const yourPrice = enhancedAnalysis?.payAsYouGo?.yourPrice || listPrice;

  // Discount percentage from list price to reach your price
  const discount = enhancedAnalysis?.payAsYouGo?.discountPercentage || 0;

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

  // Extract network details from evaluation notes
  const extractNetworkDetails = () => {
    const networks: any[] = [];
    if (evaluation?.carrierOptions) {
      evaluation.carrierOptions.forEach((carrier: any) => {
        networks.push({
          country: carrier.country,
          carrier: carrier.carrier,
          operator: carrier.operator,
          dataRate: carrier.dataRate,
          imsiCost: carrier.imsiCost,
        });
      });
    }
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
                Reference: {formData.simQuantity.toLocaleString()} SIMs • {formData.duration} months • {formData.countries.join(', ')}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
              evaluation?.verdict === 'approved'
                ? 'bg-green-100 text-green-800'
                : evaluation?.verdict === 'negotiable'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {evaluation?.verdict === 'approved' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{evaluation?.verdict?.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Volume</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formData.simQuantity.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">SIM Cards</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Globe className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Coverage</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formData.countries.length}
              </div>
              <div className="text-xs text-gray-600">
                {formData.countries.length === 1 ? 'Country' : 'Countries'}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Data Plan</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formData.monthlyDataPerSim >= 1
                  ? `${formData.monthlyDataPerSim.toFixed(2)} GB`
                  : `${Math.round(formData.monthlyDataPerSim * 1024)} MB`}
              </div>
              <div className="text-xs text-gray-600">
                {formData.monthlyDataPerSim >= 1
                  ? `(${Math.round(formData.monthlyDataPerSim * 1024)} MB) per SIM/month`
                  : `(${formData.monthlyDataPerSim.toFixed(4)} GB) per SIM/month`}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Shield className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider">Term</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formData.duration}
              </div>
              <div className="text-xs text-gray-600">Months</div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Pricing Structure
            </h3>

            <div className="space-y-3">
              {/* List Price */}
              <div className="flex justify-between items-center py-2 border-b border-blue-100">
                <span className="text-sm text-gray-600">List Price per SIM</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(listPrice)}/month
                </span>
              </div>

              {/* Discount */}
              {discount > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm text-gray-600">
                    Discount ({formData.simQuantity.toLocaleString()} SIMs)
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    -{discount.toFixed(1)}%
                  </span>
                </div>
              )}

              {/* Active SIM Fee */}
              {enhancedAnalysis?.payAsYouGo?.activeSimFee && (
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm text-gray-600">Active SIM Fee</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(enhancedAnalysis.payAsYouGo.activeSimFee)}/month
                  </span>
                </div>
              )}

              {/* Data Rate */}
              {enhancedAnalysis?.payAsYouGo?.dataFee && (
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm text-gray-600">Data Rate</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(enhancedAnalysis.payAsYouGo.dataFee * 1024)}/GB
                  </span>
                </div>
              )}

              {/* Final Price */}
              <div className="flex justify-between items-center py-3 bg-white rounded-lg px-4">
                <span className="font-semibold text-gray-900">Your Price per SIM</span>
                <span className="text-xl font-bold text-blue-600">
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
              <div className="flex justify-between items-center py-2 pt-3 border-t border-blue-200">
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
                <Globe className="w-5 h-5 text-gray-600" />
                Network Configuration
              </h3>

              <div className="space-y-3">
                {formData.countries.map((country: string) => {
                  const countryNetworks = networks.filter(n => n.country === country);
                  const usage = formData.usagePercentages?.[country] || (100 / formData.countries.length);

                  return (
                    <div key={country} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{country}</h4>
                          <p className="text-sm text-gray-600">
                            {usage.toFixed(0)}% of total usage
                          </p>
                        </div>
                        {countryNetworks.length > 1 && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {countryNetworks.length} networks for redundancy
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 mt-3">
                        {countryNetworks.map((network, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {network.carrier} {network.operator && `(via ${network.operator})`}
                            </span>
                            <div className="text-right">
                              {network.imsiCost > 0 && (
                                <span className="text-gray-500 mr-3">
                                  Access: {formatCurrency(network.imsiCost)}
                                </span>
                              )}
                              <span className="text-gray-700 font-medium">
                                {formatCurrency(network.dataRate * 1024)}/GB
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
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
              <Info className="w-5 h-5 text-amber-600" />
              Important Terms
            </h3>

            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>
                  <strong>Overage Policy:</strong> Any data usage exceeding {formData.monthlyDataPerSim}GB per SIM
                  will be charged at standard pay-as-you-go rates of {formatCurrency(enhancedAnalysis?.payAsYouGo?.dataFee * 1024 || 0)}/GB
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

          {/* Margin/Profitability (only if approved) */}
          {evaluation?.verdict === 'approved' && evaluation?.profitMargin && (
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