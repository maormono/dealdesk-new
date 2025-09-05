import React, { useState } from 'react';
import { MessageCircle, FileText, Zap } from 'lucide-react';
import { NavigationHeader } from '../components/NavigationHeader';
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <NavigationHeader />
      
      {/* Main Content - Matching Networks Database structure */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-6">Deal Review</h2>
          
          {/* Tab Navigation - Monogoto Segmented Control */}
          <div className="mb-6">
            <div className="inline-flex p-1 space-x-1 bg-gray-50 rounded-xl">
              <button
                onClick={() => setActiveTab('enhanced')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
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
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
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
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${
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

          {/* Tab Content */}
          <div className="min-h-[600px]">
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
                      className="mt-4 px-3 py-1.5 bg-[#5B9BD5]/10 text-[#5B9BD5] rounded-lg hover:bg-[#5B9BD5]/20 active:scale-95 transition-all text-sm border border-[#5B9BD5]/20"
                    >
                      Continue with AI Assistant to refine this deal →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};