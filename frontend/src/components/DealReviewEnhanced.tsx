import React, { useState, useRef, useEffect } from 'react';
import {
  Calculator,
  Send,
  Loader2,
  Maximize2,
  Minimize2,
  Maximize
} from 'lucide-react';
import { ComprehensiveDealService } from '../services/comprehensiveDealService';
import type { DealRequestMandatory } from '../services/comprehensiveDealService';
import { DealEvaluationService } from '../services/dealEvaluationService';
import { EnhancedDealService } from '../services/enhancedDealService';
import type { DealRequest } from '../config/dealConfig';
import type { DealEvaluation } from '../config/dealConfig';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  dealData?: Partial<DealRequestMandatory>;
}

type ExpandState = 'normal' | 'half' | 'full';

interface DealReviewEnhancedProps {
  onExpandToggle?: () => void;
  expandState?: ExpandState;
}

export const DealReviewEnhanced: React.FC<DealReviewEnhancedProps> = ({ onExpandToggle, expandState = 'normal' }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `I'll help you analyze your deal profitability. To provide accurate pricing, I need the following information:

**Mandatory Requirements:**
📱 Number of SIM cards
📊 Monthly data per SIM (MB or GB)
🌍 Countries where SIMs will operate
🔗 Number of networks required per country
📅 Commitment period (if any)

**Example:** "1000 SIMs with 1GB in UK (2 networks) and Belgium (1 network), 24-month commitment"`,
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<Partial<DealRequestMandatory>>({});
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const dealService = new ComprehensiveDealService();
  const evaluationService = new DealEvaluationService();
  const enhancedService = new EnhancedDealService();
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
      setShouldAutoScroll(false);
    }
  }, [messages, shouldAutoScroll]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    
    console.log('🚀 DealReviewEnhanced - Processing input:', input);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShouldAutoScroll(true);
    
    try {
      // Parse user input
      const parsedDeal = dealService.parseUserInput(input);

      // Merge with existing deal data
      const updatedDeal = { ...currentDeal, ...parsedDeal };
      setCurrentDeal(updatedDeal);

      // Validate mandatory fields
      const validation = dealService.validateMandatoryFields(updatedDeal);
      
      if (!validation.isValid) {
        // Show what's missing
        const missingFieldsMessage: Message = {
          id: Date.now().toString() + '_missing',
          role: 'assistant',
          content: formatMissingFieldsMessage(validation.missingFields, updatedDeal),
          timestamp: new Date()
        };
        setShouldAutoScroll(true);
        setMessages(prev => [...prev, missingFieldsMessage]);
      } else {
        // All fields present - proceed with analysis using all 3 services (same as form)
        const statusMessage: Message = {
          id: Date.now().toString() + '_status',
          role: 'system',
          content: '🔍 Analyzing deal with all pricing services...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, statusMessage]);

        // Convert to DealRequest format for basic and enhanced services
        const dealRequest: DealRequest = {
          simQuantity: updatedDeal.simCount || 0,
          countries: updatedDeal.countries || [],
          carriers: [],
          monthlyDataPerSim: (updatedDeal.dataPerMonth || 0) / 1024, // Convert MB to GB
          monthlySmsPerSim: 0,
          duration: updatedDeal.commitmentMonths || 12,
          proposedPricePerSim: 2, // Default price, will be calculated
          currency: 'USD',
          isNewCustomer: true,
          expectedUsagePattern: 'low',
          requiresIoT: false,
          usagePercentages: {}
        };

        // Prepare comprehensive deal request
        const comprehensiveDeal: DealRequestMandatory = {
          simCount: updatedDeal.simCount || 0,
          dataPerMonth: updatedDeal.dataPerMonth || 0,
          countries: updatedDeal.countries || [],
          networksPerCountry: updatedDeal.networksPerCountry ||
            (updatedDeal.countries || []).reduce((acc: Record<string, number>, country: string) => {
              acc[country] = 2; // Default to 2 networks per country for redundancy
              return acc;
            }, {} as Record<string, number>),
          commitmentMonths: updatedDeal.commitmentMonths || 12,
          technology: ['3G', '4G', '5G']
        };

        try {
          // Use all three services in parallel (same as DealReviewForm)
          const [basicResult, enhancedResult, comprehensiveResult] = await Promise.all([
            evaluationService.evaluateDeal(dealRequest),
            enhancedService.analyzeDeal({
              simCount: dealRequest.simQuantity,
              countries: dealRequest.countries,
              dataPerSim: dealRequest.monthlyDataPerSim * 1024, // Convert GB to MB
              pricingModel: 'payAsYouGo',
              usagePercentages: {},
              contractLength: dealRequest.duration,
              requestedPrice: dealRequest.proposedPricePerSim
            }),
            dealService.evaluateDeal(comprehensiveDeal)
          ]);

          // Format the combined analysis response
          const analysisContent = formatCombinedAnalysis(basicResult, enhancedResult, comprehensiveResult, dealRequest);

          const analysisMessage: Message = {
            id: Date.now().toString() + '_analysis',
            role: 'assistant',
            content: analysisContent,
            timestamp: new Date(),
            dealData: updatedDeal
          };
          setShouldAutoScroll(true);
          setMessages(prev => prev.filter(m => m.id !== statusMessage.id).concat(analysisMessage));
        } catch (error) {
          console.error('Error in combined analysis:', error);
          const errorMessage: Message = {
            id: Date.now().toString() + '_error',
            role: 'assistant',
            content: 'Unable to complete full analysis. Please try again.',
            timestamp: new Date()
          };
          setShouldAutoScroll(true);
          setMessages(prev => prev.filter(m => m.id !== statusMessage.id).concat(errorMessage));
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: 'An error occurred while analyzing your deal. Please try again.',
        timestamp: new Date()
      };
      setShouldAutoScroll(true);
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const formatMissingFieldsMessage = (
    missingFields: string[], 
    currentData: Partial<DealRequestMandatory>
  ): string => {
    let message = `I need a few more details to analyze your deal:\n\n`;
    
    // Show what we have
    if (Object.keys(currentData).length > 0) {
      message += `**✅ Information Received:**\n`;
      if (currentData.simCount) {
        message += `• SIM cards: ${currentData.simCount}\n`;
      }
      if (currentData.dataPerMonth) {
        const gb = (currentData.dataPerMonth / 1000).toFixed(2);
        message += `• Data: ${gb} GB per month\n`;
      }
      if (currentData.countries && currentData.countries.length > 0) {
        message += `• Countries: ${currentData.countries.join(', ')}\n`;
      }
      if (currentData.networksPerCountry && Object.keys(currentData.networksPerCountry).length > 0) {
        message += `• Networks: `;
        const networkInfo = Object.entries(currentData.networksPerCountry)
          .map(([country, count]) => `${country} (${count})`)
          .join(', ');
        message += `${networkInfo}\n`;
      }
      if (currentData.commitmentMonths) {
        message += `• Commitment: ${currentData.commitmentMonths} months\n`;
      }
      message += '\n';
    }
    
    // Show what's missing
    message += `**❌ Still Need:**\n`;
    missingFields.forEach(field => {
      message += `• ${field}\n`;
    });
    
    message += `\n**Example:** "500 SIMs with 2GB in France with 2 networks, 12-month commitment"`;
    
    return message;
  };
  
  
  const getHeightClass = () => {
    switch (expandState) {
      case 'normal': return 'h-[600px]';
      case 'half': return 'h-[85vh] min-h-[700px]';
      case 'full': return 'fixed inset-0 z-50';
      default: return 'h-[600px]';
    }
  };

  const getExpandIcon = () => {
    switch (expandState) {
      case 'normal': return <Maximize2 className="w-4 h-4 text-gray-600" />;
      case 'half': return <Maximize className="w-4 h-4 text-gray-600" />;
      case 'full': return <Minimize2 className="w-4 h-4 text-gray-600" />;
      default: return <Maximize2 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getExpandTooltip = () => {
    switch (expandState) {
      case 'normal': return 'Expand to half width';
      case 'half': return 'Expand to full screen';
      case 'full': return 'Return to normal size';
      default: return 'Expand';
    }
  };

  return (
    <div className={`flex flex-col ${getHeightClass()} bg-white rounded-lg shadow-sm border border-gray-200`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Deal Analyzer</h3>
              <p className="text-xs text-gray-500">Real-Time Operator Pricing Analysis</p>
            </div>
          </div>
          
          {/* Expand/Collapse Button */}
          {onExpandToggle && (
            <button
              onClick={onExpandToggle}
              className="p-1 hover:bg-white/50 rounded-lg transition-colors"
              title={getExpandTooltip()}
            >
              {getExpandIcon()}
            </button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-[#5B9BD5] text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-4" 
                   dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
              
              {message.dealData && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs opacity-75">
                  Deal ID: {message.id.substring(0, 8)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#5B9BD5]" />
                <span className="text-sm leading-4 text-gray-600">Analyzing deal with real operator data...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1000 SIMs with 1GB in UK (2 networks) and Belgium (1 network), 24-month commitment"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B9BD5]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-[#5B9BD5] text-white rounded-lg hover:bg-[#4A8BC2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function to format combined analysis from all 3 services
function formatCombinedAnalysis(
  basicResult: DealEvaluation,
  enhancedResult: any,
  comprehensiveResult: any,
  dealRequest: DealRequest
): string {
  const currencySymbol = dealRequest.currency === 'USD' ? '$' : '€';
  const verdict = basicResult.verdict.toUpperCase();
  const verdictEmoji = verdict === 'APPROVED' ? '✅' : verdict === 'NEGOTIABLE' ? '⚠️' : '❌';

  let content = `## ${verdictEmoji} Deal Analysis: ${verdict}\n\n`;

  // Deal Overview
  content += `**Deal Overview:** ${dealRequest.simQuantity} SIMs × ${dealRequest.monthlyDataPerSim < 1 ? (dealRequest.monthlyDataPerSim * 1024).toFixed(0) + ' MB' : dealRequest.monthlyDataPerSim.toFixed(2) + ' GB'}/month across ${dealRequest.countries.join(', ')}\n\n`;

  // Pricing Structure from Enhanced Service
  if (enhancedResult?.payAsYouGo) {
    const payg = enhancedResult.payAsYouGo;
    content += `### 💰 Pricing Structure\n`;
    content += `• **Active SIM Fee:** ${currencySymbol}${payg.activeSimFee?.toFixed(2) || '0.35'}/month\n`;
    content += `• **Data Rate:** ${currencySymbol}${(payg.dataFee * 1000)?.toFixed(4) || '0.00'}/GB\n`;
    content += `• **List Price per SIM:** ${currencySymbol}${payg.listPrice?.toFixed(4) || '0.00'}/month\n`;
    if (payg.maxAllowedDiscount > 0) {
      content += `• **Max Allowed Discount:** ${payg.maxAllowedDiscount}%\n`;
    }
    content += `\n`;
  }

  // Profitability from Basic Service
  content += `### 📊 Profitability Analysis\n`;
  content += `• **Profit Margin:** ${(basicResult.profitMargin * 100).toFixed(1)}%\n`;
  content += `• **Gross Profit per SIM:** ${currencySymbol}${basicResult.grossProfitPerSim.toFixed(4)}\n`;
  content += `• **Total Monthly Profit:** ${currencySymbol}${basicResult.totalMonthlyProfit.toFixed(2)}\n`;
  content += `• **Risk Score:** ${basicResult.riskScore}/100\n\n`;

  // Cost Breakdown
  content += `### 💵 Cost Breakdown per SIM\n`;
  content += `• **Carrier Data Cost:** ${currencySymbol}${basicResult.carrierDataCost.toFixed(4)}\n`;
  content += `• **IMSI Cost:** ${currencySymbol}${basicResult.carrierImsiCost.toFixed(4)}\n`;
  content += `• **Platform Fees:** ${currencySymbol}${basicResult.platformFees.toFixed(4)}\n`;
  content += `• **Total Cost per SIM:** ${currencySymbol}${basicResult.totalCostPerSim.toFixed(4)}\n\n`;

  // Network Selection
  if (basicResult.carrierOptions && basicResult.carrierOptions.length > 0) {
    content += `### 🌐 Selected Networks\n`;
    basicResult.carrierOptions.forEach(carrier => {
      content += `• **${carrier.country}:** ${carrier.carrier} (${currencySymbol}${(carrier.dataRate * 1024).toFixed(2)}/GB)\n`;
    });
    content += `\n`;
  }

  // Recommended Price if not approved
  if (basicResult.recommendedPrice && basicResult.verdict !== 'approved') {
    content += `### 💡 Recommendation\n`;
    content += `• **Recommended Price:** ${currencySymbol}${basicResult.recommendedPrice.toFixed(2)}/SIM/month\n`;
    content += `• This price ensures minimum profitability requirements are met.\n\n`;
  }

  // Reasoning from Enhanced Service
  if (enhancedResult?.reasoning && enhancedResult.reasoning.length > 0) {
    content += `### 📝 Business Justification\n`;
    enhancedResult.reasoning.forEach((reason: string) => {
      content += `✓ ${reason}\n`;
    });
    content += `\n`;
  }

  // AI Suggested Pricing from Comprehensive Service
  if (comprehensiveResult?.suggestedPricing) {
    content += `### 🤖 AI Suggested Pricing\n`;
    content += `• **Range:** ${currencySymbol}${comprehensiveResult.suggestedPricing.min?.toFixed(2) || '0.00'} - ${currencySymbol}${comprehensiveResult.suggestedPricing.max?.toFixed(2) || '0.00'}/SIM/month\n\n`;
  }

  // Warnings
  const allWarnings = [
    ...(enhancedResult?.warnings || []),
    ...(comprehensiveResult?.warnings || [])
  ];
  if (allWarnings.length > 0) {
    content += `### ⚠️ Warnings\n`;
    allWarnings.forEach((warning: string) => {
      content += `• ${warning}\n`;
    });
    content += `\n`;
  }

  // Contract Summary
  const totalMonthly = dealRequest.simQuantity * (enhancedResult?.payAsYouGo?.listPrice || basicResult.totalCostPerSim * 1.5);
  const contractValue = totalMonthly * dealRequest.duration;
  content += `### 📋 Contract Summary\n`;
  content += `• **Monthly Revenue:** ${currencySymbol}${totalMonthly.toFixed(2)}\n`;
  content += `• **Contract Value (${dealRequest.duration} months):** ${currencySymbol}${contractValue.toFixed(2)}\n`;

  return content;
}

// Helper function to format message content with Markdown-like styling
function formatMessageContent(content: string): string {
  return content
    // Headers - minimal spacing, smaller font
    .replace(/### (.*?)$/gm, '<h3 class="text-sm leading-4 font-semibold mt-1 mb-0.5 text-gray-800">$1</h3>')
    .replace(/## (.*?)$/gm, '<h2 class="text-sm leading-4 font-bold mt-2 mb-0.5 text-gray-900">$1</h2>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-sm leading-4">$1</strong>')
    // Replace grid with very compact list format - uppercase labels
    .replace(/<div class="pricing-grid">/g, '<div class="space-y-0 mb-1">')
    .replace(/<div class="pricing-card">/g, '<div class="text-sm leading-4">')
    .replace(/<span class="label">/g, '<span class="font-semibold text-gray-800 uppercase text-sm leading-4">')
    .replace(/<span class="value">/g, '<span class="font-semibold text-gray-900 text-sm leading-4">')
    .replace(/<span class="value success">/g, '<span class="font-semibold text-green-600 text-sm leading-4">')
    .replace(/<span class="value accent">/g, '<span class="font-semibold text-blue-600 text-sm leading-4">')
    .replace(/<span class="description">/g, '<span class="text-sm leading-4 text-gray-500 ml-2">(')
    // Optimization section - ultra compact
    .replace(/<div class="optimization-section">/g, '<div class="mb-0.5">')
    .replace(/<div class="optimization-grid">/g, '<div class="text-sm leading-4 space-y-0">')
    .replace(/<div class="region-card">/g, '<div class="flex justify-between items-center text-sm leading-4">')
    .replace(/<div class="region-name">/g, '<div class="font-medium text-gray-700 text-sm leading-4">')
    .replace(/<div class="region-percentage">/g, '<div class="font-semibold text-gray-900 text-sm leading-4">')
    .replace(/<div class="optimization-note">/g, '<div class="text-sm leading-4 text-gray-600">')
    .replace(/<span class="note-icon">/g, '<span class="text-blue-500">')
    .replace(/<span class="note-text">/g, '<span>')
    // Justification and assumptions - ultra compact
    .replace(/<div class="justification-list">/g, '<div class="space-y-0 mb-1">')
    .replace(/<div class="justification-item">/g, '<div class="flex items-start gap-1 text-sm text-gray-700 leading-4">')
    .replace(/<div class="assumptions-list">/g, '<div class="space-y-0 mb-1">')
    .replace(/<div class="assumption-item">/g, '<div class="flex items-start gap-1 text-sm text-gray-600 leading-4">')
    // Deal status card - ultra compact
    .replace(/<div class="deal-status">/g, '<div class="mt-1 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded border border-green-200">')
    .replace(/<div class="status-icon">/g, '<div class="text-lg text-center mb-0.5">')
    .replace(/<div class="status-grid">/g, '<div class="grid grid-cols-3 gap-1 text-center text-sm leading-4">')
    // Network cards - ultra compact
    .replace(/<div class="network-card">/g, '<div class="p-1 mb-0.5 bg-white rounded border border-gray-200">')
    .replace(/<span class="preferred-badge">/g, '<span class="inline-block px-1 py-0.5 text-sm leading-4 bg-green-100 text-green-700 rounded">')
    // Lists - ultra compact
    .replace(/• (.*?)$/gm, '<li class="ml-1 text-sm leading-4">• $1</li>')
    .replace(/✓ (.*?)$/gm, '<li class="ml-1 text-sm leading-4 text-green-600">✓ $1</li>')
    .replace(/→ (.*?)$/gm, '<div class="ml-1 text-sm leading-4 text-gray-600">→ $1</div>')
    // Status icons
    .replace(/✅/g, '<span class="text-green-600">✅</span>')
    .replace(/❌/g, '<span class="text-red-600">❌</span>')
    .replace(/⚠️/g, '<span class="text-yellow-600">⚠️</span>')
    // Line breaks
    .replace(/\n/g, '<br>');
}