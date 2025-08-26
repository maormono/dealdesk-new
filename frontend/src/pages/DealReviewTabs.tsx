import React, { useState } from 'react';
import { Calculator, MessageCircle, FileText, ChartBar, TrendingUp, Zap } from 'lucide-react';
import { DealReview } from './DealReview';
import { DealReviewForm } from '../components/DealReviewForm';
import { DealReviewEnhanced } from '../components/DealReviewEnhanced';
import type { DealRequest, DealEvaluation } from '../config/dealConfig';
import '../styles/monogoto-theme.css';

export const DealReviewTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'enhanced' | 'chat' | 'form'>('enhanced');
  const [sharedDeal, setSharedDeal] = useState<Partial<DealRequest> | undefined>();
  const [sharedEvaluation, setSharedEvaluation] = useState<DealEvaluation | undefined>();

  // Handler for when form evaluation is complete
  const handleFormEvaluation = (evaluation: DealEvaluation, deal: DealRequest) => {
    setSharedEvaluation(evaluation);
    setSharedDeal(deal);
  };

  // Handler for switching from form to chat with context
  const switchToChat = () => {
    setActiveTab('chat');
    // Deal context will be passed through sharedDeal state
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Tabs - Monogoto Apple Style */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] rounded-2xl shadow-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Deal Review</h1>
                <p className="text-sm text-gray-500 mt-0.5">Analyze profitability & optimize pricing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#5B9BD5]/10 rounded-full">
                <ChartBar className="w-4 h-4 text-[#5B9BD5]" />
                <span className="text-xs font-medium text-[#5B9BD5]">Analytics</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5B342]/10 rounded-full">
                <TrendingUp className="w-4 h-4 text-[#F5B342]" />
                <span className="text-xs font-medium text-[#F5B342]">Insights</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation - Monogoto Segmented Control */}
        <div className="px-8 pb-4">
          <div className="inline-flex p-1 space-x-1 bg-gray-50 rounded-xl">
            <button
              onClick={() => setActiveTab('enhanced')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'enhanced'
                  ? 'bg-white text-[#5B9BD5] shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Smart Analyzer</span>
              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">NEW</span>
            </button>
            
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'chat'
                  ? 'bg-white text-[#5B9BD5] shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>AI Assistant</span>
            </button>
            
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'form'
                  ? 'bg-white text-[#5B9BD5] shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Structured Input</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'enhanced' ? (
          <div className="h-full">
            <DealReviewEnhanced />
          </div>
        ) : activeTab === 'chat' ? (
          <div className="h-full">
            <DealReview initialDeal={sharedDeal} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <DealReviewForm 
              initialDeal={sharedDeal}
              onEvaluation={handleFormEvaluation}
            />
            
            {sharedEvaluation && (
              <div className="px-6 pb-4">
                <button
                  onClick={switchToChat}
                  className="mt-4 px-5 py-2.5 bg-[#5B9BD5]/10 text-[#5B9BD5] rounded-xl hover:bg-[#5B9BD5]/20 active:scale-95 transition-all text-sm font-medium border border-[#5B9BD5]/20"
                >
                  Continue with AI Assistant to refine this deal →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};