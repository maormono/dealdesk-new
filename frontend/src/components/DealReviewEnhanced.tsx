import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Users,
  Globe,
  Wifi,
  Calendar,
  Database
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
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Quick action buttons
  const quickActions = [
    { label: '1000 SIMs', value: '1000 SIMs' },
    { label: '1GB/month', value: '1GB per month' },
    { label: 'UK + Belgium', value: 'UK and Belgium' },
    { label: '2 networks each', value: '2 networks in each country' },
    { label: '24-month deal', value: '24 month commitment' }
  ];
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] rounded-xl">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Deal Analyzer v2</h2>
              <p className="text-sm text-gray-500">Real-time operator pricing analysis</p>
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2 text-green-600">
              <Database className="w-4 h-4" />
              <span>Database Connected</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <Wifi className="w-4 h-4" />
              <span>AI Ready</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Current Deal Summary */}
      {Object.keys(currentDeal).length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <span className="font-medium">Current Deal Parameters: </span>
              {currentDeal.simCount && <span>{currentDeal.simCount} SIMs • </span>}
              {currentDeal.dataPerMonth && <span>{(currentDeal.dataPerMonth / 1000).toFixed(1)}GB • </span>}
              {currentDeal.countries && <span>{currentDeal.countries.join(', ')} • </span>}
              {currentDeal.commitmentMonths && <span>{currentDeal.commitmentMonths} months</span>}
            </div>
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-[#5B9BD5] text-white'
                  : message.role === 'system'
                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap" 
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
                <span className="text-gray-600">Analyzing deal with real operator data...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Quick add:</span>
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => setInput(prev => prev ? `${prev} ${action.value}` : action.value)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="E.g., '1000 SIMs with 1GB in UK (2 networks) and Belgium (1 network), 24-month commitment'"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-[#5B9BD5] to-[#9B7BB6] text-white rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to format message content with Markdown-like styling
function formatMessageContent(content: string): string {
  return content
    // Headers - minimal spacing, smaller font
    .replace(/### (.*?)$/gm, '<h3 class="text-sm font-semibold mt-1 mb-0.5 text-gray-800">$1</h3>')
    .replace(/## (.*?)$/gm, '<h2 class="text-sm font-bold mt-2 mb-0.5 text-gray-900">$1</h2>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-sm">$1</strong>')
    // Replace grid with very compact list format - uppercase labels
    .replace(/<div class="pricing-grid">/g, '<div class="space-y-0 mb-1">')
    .replace(/<div class="pricing-card">/g, '<div class="text-sm leading-tight">')
    .replace(/<span class="label">/g, '<span class="font-semibold text-gray-800 uppercase">')
    .replace(/<span class="value">/g, '<span class="font-semibold text-gray-900">')
    .replace(/<span class="value success">/g, '<span class="font-semibold text-green-600">')
    .replace(/<span class="value accent">/g, '<span class="font-semibold text-blue-600">')
    .replace(/<span class="description">/g, '<span class="text-sm text-gray-500 ml-2">(')
    // Optimization section - ultra compact
    .replace(/<div class="optimization-section">/g, '<div class="mb-0.5">')
    .replace(/<div class="optimization-grid">/g, '<div class="text-sm space-y-0">')
    .replace(/<div class="region-card">/g, '<div class="flex justify-between items-center text-sm">')
    .replace(/<div class="region-name">/g, '<div class="font-medium text-gray-700">')
    .replace(/<div class="region-percentage">/g, '<div class="font-semibold text-gray-900">')
    .replace(/<div class="optimization-note">/g, '<div class="text-xs text-gray-600">')
    .replace(/<span class="note-icon">/g, '<span class="text-blue-500">')
    .replace(/<span class="note-text">/g, '<span>')
    // Justification and assumptions - ultra compact
    .replace(/<div class="justification-list">/g, '<div class="space-y-0 mb-1">')
    .replace(/<div class="justification-item">/g, '<div class="flex items-start gap-1 text-sm text-gray-700 leading-tight">')
    .replace(/<div class="assumptions-list">/g, '<div class="space-y-0 mb-1">')
    .replace(/<div class="assumption-item">/g, '<div class="flex items-start gap-1 text-sm text-gray-600 leading-tight">')
    // Deal status card - ultra compact
    .replace(/<div class="deal-status">/g, '<div class="mt-1 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded border border-green-200">')
    .replace(/<div class="status-icon">/g, '<div class="text-lg text-center mb-0.5">')
    .replace(/<div class="status-grid">/g, '<div class="grid grid-cols-3 gap-1 text-center text-sm">')
    // Network cards - ultra compact
    .replace(/<div class="network-card">/g, '<div class="p-1 mb-0.5 bg-white rounded border border-gray-200">')
    .replace(/<span class="preferred-badge">/g, '<span class="inline-block px-1 py-0.5 text-xs bg-green-100 text-green-700 rounded">')
    // Lists - ultra compact
    .replace(/• (.*?)$/gm, '<li class="ml-1 text-sm leading-tight">• $1</li>')
    .replace(/✓ (.*?)$/gm, '<li class="ml-1 text-sm text-green-600 leading-tight">✓ $1</li>')
    .replace(/→ (.*?)$/gm, '<div class="ml-1 text-sm text-gray-600 leading-tight">→ $1</div>')
    // Status icons
    .replace(/✅/g, '<span class="text-green-600">✅</span>')
    .replace(/❌/g, '<span class="text-red-600">❌</span>')
    .replace(/⚠️/g, '<span class="text-yellow-600">⚠️</span>')
    // Line breaks
    .replace(/\n/g, '<br>');
}