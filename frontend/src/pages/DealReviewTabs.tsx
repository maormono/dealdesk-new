import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calculator, Sparkles, ArrowLeft } from 'lucide-react';
import { DealReviewForm } from '../components/DealReviewForm';
import { DealReviewEnhanced } from '../components/DealReviewEnhanced';
import { DealList } from '../components/DealList';
import { useAuth } from '../contexts/AuthContext';
import { dealPersistenceService } from '../services/dealPersistenceService';
import type { DealRequest, DealEvaluation, SavedDeal } from '../config/dealConfig';
import { formatDealId } from '../config/dealConfig';
import '../styles/monogoto-theme.css';

type ExpandState = 'normal' | 'half' | 'full';
type ViewMode = 'list' | 'form';

export const DealReviewTabs: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get URL parameters
  const urlDealId = searchParams.get('dealId');
  const fromSource = searchParams.get('from');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentDealId, setCurrentDealId] = useState<string | null>(null);
  const [currentDeal, setCurrentDeal] = useState<SavedDeal | null>(null);
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);

  // Existing state for form/analyzer
  const [sharedDeal, setSharedDeal] = useState<Partial<DealRequest> | undefined>();
  const [sharedEvaluation, setSharedEvaluation] = useState<DealEvaluation | undefined>();
  const [showDealAnalyzer, setShowDealAnalyzer] = useState(false);
  const [analyzerExpandState, setAnalyzerExpandState] = useState<ExpandState>('normal');

  // Fetch user's deals on mount
  const fetchDeals = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingDeals(true);
    try {
      const userDeals = await dealPersistenceService.getUserDeals(user.id);
      setDeals(userDeals);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setIsLoadingDeals(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Load deal from URL parameter (e.g., when coming from audit)
  useEffect(() => {
    const loadDealFromUrl = async () => {
      // Load if we have a URL dealId and it's different from current deal
      if (urlDealId && urlDealId !== currentDealId) {
        try {
          const deal = await dealPersistenceService.getDealById(urlDealId);
          if (deal) {
            setCurrentDealId(deal.id);
            setCurrentDeal(deal);
            setSharedDeal(deal.deal_request);
            if (deal.basic_evaluation) {
              setSharedEvaluation(deal.basic_evaluation);
            }
            setViewMode('form');
          }
        } catch (error) {
          console.error('Error loading deal from URL:', error);
        }
      }
    };
    loadDealFromUrl();
  }, [urlDealId, currentDealId]);

  // Create a new deal
  const handleCreateNewDeal = async () => {
    if (!user?.id || !user?.email) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Create initial deal request with defaults
      const initialRequest: DealRequest = {
        simQuantity: 1000,
        countries: [],
        carriers: [],
        monthlyDataPerSim: 1,
        duration: 12,
        proposedPricePerSim: 2,
        currency: 'USD',
        isNewCustomer: true,
        expectedUsagePattern: 'low',
        requiresIoT: false,
      };

      const newDeal = await dealPersistenceService.createDeal(initialRequest, user.id, user.email);
      setCurrentDealId(newDeal.id);
      setCurrentDeal(newDeal);
      setSharedDeal(newDeal.deal_request);
      setViewMode('form');

      // Refresh deals list
      fetchDeals();
    } catch (error) {
      console.error('Error creating deal:', error);
    }
  };

  // Select an existing deal to edit
  const handleSelectDeal = (deal: SavedDeal) => {
    setCurrentDealId(deal.id);
    setCurrentDeal(deal);
    setSharedDeal(deal.deal_request);
    if (deal.basic_evaluation) {
      setSharedEvaluation(deal.basic_evaluation);
    }
    setViewMode('form');
  };

  // Go back to list view or audit (if coming from audit)
  const handleBackToList = () => {
    // If we came from audit, navigate back to admin audit tab
    if (fromSource === 'audit') {
      navigate('/admin?tab=audit');
      return;
    }

    // Clear URL params when going back to list
    setSearchParams({});
    setViewMode('list');
    setCurrentDealId(null);
    setCurrentDeal(null);
    setSharedDeal(undefined);
    setSharedEvaluation(undefined);
    fetchDeals(); // Refresh list
  };

  // Handler for when form evaluation is complete
  const handleFormEvaluation = (evaluation: DealEvaluation, deal: DealRequest) => {
    setSharedEvaluation(evaluation);
    setSharedDeal(deal);
  };

  // Handler for saving deal after evaluation
  const handleDealSaved = (savedDeal: SavedDeal) => {
    setCurrentDeal(savedDeal);
    if (savedDeal.basic_evaluation) {
      setSharedEvaluation(savedDeal.basic_evaluation);
    }
    // Update the deals list with the new/updated deal
    setDeals(prevDeals => {
      const existingIndex = prevDeals.findIndex(d => d.id === savedDeal.id);
      if (existingIndex >= 0) {
        const newDeals = [...prevDeals];
        newDeals[existingIndex] = savedDeal;
        return newDeals;
      }
      return [savedDeal, ...prevDeals];
    });
  };

  // Handler for 3-stage expanding/collapsing the analyzer
  const handleAnalyzerExpandToggle = () => {
    setAnalyzerExpandState(prev => {
      switch (prev) {
        case 'normal': return 'half';
        case 'half': return 'full';
        case 'full': return 'normal';
        default: return 'normal';
      }
    });
  };

  return (
    <div className="bg-gray-50 pt-20 flex-1">
      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <DealList
              deals={deals}
              onSelectDeal={handleSelectDeal}
              onCreateNew={handleCreateNewDeal}
              isLoading={isLoadingDeals}
            />
          </div>
        )}

        {/* Form View */}
        {viewMode === 'form' && (
          <div className={showDealAnalyzer ? `grid grid-cols-1 ${analyzerExpandState === 'half' ? 'xl:grid-cols-2' : 'xl:grid-cols-4'} gap-6` : ''}>
            {/* Deal Review Form - Full width when closed, responsive when open */}
            <div className={showDealAnalyzer ? (analyzerExpandState === 'half' ? 'xl:col-span-1' : 'xl:col-span-3') : 'w-full'}>
              {analyzerExpandState !== 'full' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  {/* Header with Back button and Deal ID */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleBackToList}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {fromSource === 'audit' ? 'Back to Audit' : 'Back to Deals'}
                      </button>
                      {currentDealId && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">|</span>
                          <span className="font-mono text-sm font-semibold text-[#5B9BD5] bg-[#5B9BD5]/10 px-3 py-1 rounded-lg">
                            {formatDealId(currentDealId)}
                          </span>
                          {currentDeal?.status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              currentDeal.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                              currentDeal.status === 'evaluated' ? 'bg-blue-100 text-blue-700' :
                              currentDeal.status === 'finalized' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {currentDeal.status.charAt(0).toUpperCase() + currentDeal.status.slice(1)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Deal Review</h2>
                  </div>

                  {/* Content */}
                  <div className="min-h-[600px]">
                    <div className="h-full overflow-y-auto">
                      <DealReviewForm
                        key={currentDealId || 'new'}
                        initialDeal={sharedDeal}
                        initialEvaluation={currentDeal?.basic_evaluation}
                        initialEnhancedAnalysis={currentDeal?.enhanced_analysis}
                        dealId={currentDealId || undefined}
                        onEvaluation={handleFormEvaluation}
                        onDealSaved={handleDealSaved}
                        onExpandToggle={handleAnalyzerExpandToggle}
                        isExpanded={analyzerExpandState !== 'normal'}
                        onCreateNewDeal={handleCreateNewDeal}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Deal Analyzer Panel - Right side */}
            {showDealAnalyzer && (
              <div className={analyzerExpandState === 'half' ? 'xl:col-span-1' : 'xl:col-span-1'}>
                <DealReviewEnhanced
                  onExpandToggle={handleAnalyzerExpandToggle}
                  expandState={analyzerExpandState}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Deal Analyzer Button - Intercom Style (only show in form view) */}
      {viewMode === 'form' && (
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
      )}
    </div>
  );
};
