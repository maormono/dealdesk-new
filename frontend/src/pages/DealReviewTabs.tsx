import React, { useState } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import { DealReviewForm } from '../components/DealReviewForm';
import { DealReviewEnhanced } from '../components/DealReviewEnhanced';
import type { DealRequest, DealEvaluation } from '../config/dealConfig';
import '../styles/monogoto-theme.css';

export const DealReviewTabs: React.FC = () => {
  const [sharedDeal, setSharedDeal] = useState<Partial<DealRequest> | undefined>();
  const [sharedEvaluation, setSharedEvaluation] = useState<DealEvaluation | undefined>();
  const [showDealAnalyzer, setShowDealAnalyzer] = useState(false);
  const [isAnalyzerExpanded, setIsAnalyzerExpanded] = useState(false);

  // Handler for when form evaluation is complete
  const handleFormEvaluation = (evaluation: DealEvaluation, deal: DealRequest) => {
    setSharedEvaluation(evaluation);
    setSharedDeal(deal);
  };

  // Handler for expanding/collapsing the analyzer
  const handleAnalyzerExpandToggle = () => {
    setIsAnalyzerExpanded(!isAnalyzerExpanded);
  };

  return (
    <div className="bg-gray-50 pt-20 flex-1">
      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={showDealAnalyzer ? `grid grid-cols-1 ${isAnalyzerExpanded ? 'xl:grid-cols-2' : 'xl:grid-cols-4'} gap-6` : ''}>
          {/* Deal Review Form - Full width when closed, responsive when open */}
          <div className={showDealAnalyzer ? (isAnalyzerExpanded ? 'xl:col-span-1' : 'xl:col-span-3') : 'w-full'}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-6">Deal Review</h2>
              
              {/* Content */}
              <div className="min-h-[600px]">
                <div className="h-full overflow-y-auto">
                  <DealReviewForm 
                    initialDeal={sharedDeal}
                    onEvaluation={handleFormEvaluation}
                    onExpandToggle={handleAnalyzerExpandToggle}
                    isExpanded={isAnalyzerExpanded}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Deal Analyzer Panel - Right side */}
          {showDealAnalyzer && (
            <div className={isAnalyzerExpanded ? 'xl:col-span-1' : 'xl:col-span-1'}>
              <DealReviewEnhanced 
                onExpandToggle={handleAnalyzerExpandToggle}
                isExpanded={isAnalyzerExpanded}
              />
            </div>
          )}
        </div>
      </main>

      {/* Floating Deal Analyzer Button - Intercom Style */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Bubble Tag */}
        <div className="absolute -top-12 right-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
          AI Deal Analyzer
          {/* Arrow pointing down */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
        
        <button
          onClick={() => setShowDealAnalyzer(!showDealAnalyzer)}
          className={`group relative w-16 h-16 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
            showDealAnalyzer 
              ? 'bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] shadow-[#5B9BD5]/30' 
              : 'bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] shadow-[#5B9BD5]/30 hover:shadow-[#5B9BD5]/50'
          }`}
          title="AI Deal Analyzer"
        >
          <div className="absolute inset-0 rounded-full bg-white/10 group-hover:bg-white/20 transition-all duration-300" />
          {showDealAnalyzer ? (
            <Sparkles className="w-10 h-10 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          ) : (
            <Calculator className="w-10 h-10 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          )}
          
          {/* Animated pulse ring */}
          {!showDealAnalyzer && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] animate-ping opacity-20" />
          )}
        </button>
        
        {/* Permanent Label */}
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-gray-600 text-xs font-medium whitespace-nowrap">
          AI Deal Analyzer
        </div>
      </div>
    </div>
  );
};