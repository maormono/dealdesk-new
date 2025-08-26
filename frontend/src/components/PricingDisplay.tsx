import React from 'react';
import { DollarSign, Globe, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';

export interface PricingData {
  country: string;
  countryCode: string;
  operator: string;
  tadigCode: string;
  technologies: string[];
  imsiCost: number;
  dataCostPerMB: number;
  smsCost: number;
  voiceCostPerMin: number;
  currency: string;
}

interface PricingDisplayProps {
  data: PricingData[];
  isLoading?: boolean;
}

export const PricingDisplay: React.FC<PricingDisplayProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No pricing data available</p>
        <p className="text-sm text-gray-400 mt-2">Upload a file to see pricing information</p>
      </div>
    );
  }

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const getTechBadgeColor = (tech: string) => {
    const colors = {
      '5G': 'bg-purple-100 text-purple-800',
      '4G': 'bg-blue-100 text-blue-800',
      '3G': 'bg-green-100 text-green-800',
      '2G': 'bg-gray-100 text-gray-800',
    };
    return colors[tech as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Operator Pricing Overview</h2>
        <span className="text-sm text-gray-500">{data.length} operators loaded</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((pricing, index) => (
          <div
            key={`${pricing.tadigCode}-${index}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{pricing.operator}</h3>
                <p className="text-sm text-gray-500">
                  {pricing.country} ({pricing.countryCode})
                </p>
                <p className="text-xs text-gray-400 mt-1">TADIG: {pricing.tadigCode}</p>
              </div>
              <div className="flex gap-1">
                {pricing.technologies.map((tech) => (
                  <span
                    key={tech}
                    className={clsx(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getTechBadgeColor(tech)
                    )}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Smartphone className="w-4 h-4 mr-2" />
                  <span className="text-sm">IMSI</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(pricing.imsiCost, pricing.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Globe className="w-4 h-4 mr-2" />
                  <span className="text-sm">Data/MB</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(pricing.dataCostPerMB, pricing.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="text-sm">SMS</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(pricing.smsCost, pricing.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="text-sm">Voice/min</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(pricing.voiceCostPerMin, pricing.currency)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Total Cost Estimate</span>
                <span className="font-medium text-gray-700">
                  {formatCurrency(
                    pricing.imsiCost + pricing.dataCostPerMB * 100 + pricing.smsCost * 10,
                    pricing.currency
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};