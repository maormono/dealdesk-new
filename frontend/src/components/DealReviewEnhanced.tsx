import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, 
  Send, 
  Loader2
} from 'lucide-react';
import { ComprehensiveDealService } from '../services/comprehensiveDealService';
import type { DealRequestMandatory } from '../services/comprehensiveDealService';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  dealData?: Partial<DealRequestMandatory>;
}

export const DealReviewEnhanced: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `🚀 **ENHANCED AI ANALYZER v2** - This component uses the FIXED parsing logic!

I'll help you analyze your deal profitability. To provide accurate pricing, I need the following information:

**Mandatory Requirements:**
• 📱 **Number of SIM cards**
• 📊 **Monthly data per SIM** (MB or GB)
• 🌍 **Countries** where SIMs will operate
• 🔗 **Number of networks** required per country
• 📅 **Commitment period** (if any)

**Example:** "100 sims 10 mb/mo. Israel all networks 24 mo. deal"

✅ **Fixed Issues:** Now correctly parses "Israel", "all networks", and "mo." commitment periods.`,
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<Partial<DealRequestMandatory>>({});
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const dealService = useRef(new ComprehensiveDealService());
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
      const parsedDeal = dealService.current.parseUserInput(input);
      
      // Merge with existing deal data
      const updatedDeal = { ...currentDeal, ...parsedDeal };
      setCurrentDeal(updatedDeal);
      
      // Validate mandatory fields
      const validation = dealService.current.validateMandatoryFields(updatedDeal);
      
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
        // All fields present - proceed with analysis
        const statusMessage: Message = {
          id: Date.now().toString() + '_status',
          role: 'system',
          content: '🔍 Querying operator database for pricing...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, statusMessage]);
        
        // Evaluate the deal
        const result = await dealService.current.evaluateDeal(updatedDeal);
        
        if (result.isValid && result.recommendation) {
          const analysisMessage: Message = {
            id: Date.now().toString() + '_analysis',
            role: 'assistant',
            content: result.recommendation,
            timestamp: new Date(),
            dealData: updatedDeal
          };
          setShouldAutoScroll(true);
          setMessages(prev => prev.filter(m => m.id !== statusMessage.id).concat(analysisMessage));
        } else {
          const errorMessage: Message = {
            id: Date.now().toString() + '_error',
            role: 'assistant',
            content: result.warnings?.join('\n') || 'Unable to analyze deal. Please try again.',
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
  
  
  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] rounded-lg">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Deal Analyzer</h3>
            <p className="text-xs text-gray-500">Real-Time Operator Pricing Analysis</p>
          </div>
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
            placeholder="E.g., '1000 SIMs with 1GB in UK (2 networks) and Belgium (1 network), 24-month commitment'"
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