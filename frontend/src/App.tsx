import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PricingTable } from './components/PricingTable';
import { AIAdvisor } from './components/AIAdvisor';
import { NavigationHeader } from './components/NavigationHeader';
import { DealReviewTabs } from './pages/DealReviewTabs';
import { UserManagement } from './pages/UserManagement';
import { Admin } from './pages/Admin';
import LoginSimple from './pages/LoginSimple';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import AuthHandler from './components/AuthHandler';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { FileSpreadsheet, Bot, Sparkles } from 'lucide-react';

function HomePage() {
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('USD');

  return (
    <div className="bg-gray-50 pt-20 flex-1">
      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={showAIAdvisor ? 'grid grid-cols-1 xl:grid-cols-4 gap-6' : ''}>
          {/* Pricing Table - Full width when closed, 3/4 when open */}
          <div className={showAIAdvisor ? 'xl:col-span-3' : 'w-full'}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-6">Network Pricing Database</h2>
              <PricingTable currency={currency} onCurrencyChange={setCurrency} />
            </div>
          </div>
          
          {/* AI Advisor Panel - Right side */}
          {showAIAdvisor && (
            <div className="xl:col-span-1">
              <AIAdvisor currency={currency} />
            </div>
          )}
        </div>
      </main>
      
      {/* Floating AI Advisor Button - Intercom Style */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Bubble Tag */}
        <div className="absolute -top-12 right-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
          AI Advisor
          {/* Arrow pointing down */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
        
        <button
          onClick={() => setShowAIAdvisor(!showAIAdvisor)}
          className={`group relative w-16 h-16 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
            showAIAdvisor 
              ? 'bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-500/30' 
              : 'bg-gradient-to-br from-pink-400 to-rose-500 shadow-pink-400/30 hover:shadow-pink-500/50'
          }`}
          title="AI Advisor"
        >
          <div className="absolute inset-0 rounded-full bg-white/10 group-hover:bg-white/20 transition-all duration-300" />
          {showAIAdvisor ? (
            <Sparkles className="w-10 h-10 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          ) : (
            <Bot className="w-10 h-10 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          )}
          
          {/* Animated pulse ring */}
          {!showAIAdvisor && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 animate-ping opacity-20" />
          )}
        </button>
        
        {/* Permanent Label */}
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-gray-600 text-xs font-medium whitespace-nowrap">
          AI Advisor
        </div>
      </div>
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Navigation Header */}
      <NavigationHeader />
      {/* Page Content */}
      {children}
      
      {/* Sticky Footer */}
      <footer className="mt-auto py-3 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto text-center text-xs text-gray-500">
          <div className="flex items-center justify-center space-x-4">
            <p>© 2025 Monogoto - DealDesk Platform</p>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>MVP v1.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <UserProvider>
          <Routes>
            <Route path="/login" element={<LoginSimple />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/confirm" element={<AuthCallback />} />
            <Route path="/auth/confirm-signup" element={<AuthCallback />} />
            <Route path="/auth/invite" element={<AuthCallback />} />
            <Route path="/" element={
              <AuthHandler>
                <ProtectedRoute>
                  <ProtectedLayout>
                    <HomePage />
                  </ProtectedLayout>
                </ProtectedRoute>
              </AuthHandler>
            } />
            <Route path="/deal-review" element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <DealReviewTabs />
                </ProtectedLayout>
              </ProtectedRoute>
            } />
            <Route path="/user-management" element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <UserManagement />
                </ProtectedLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <Admin />
                </ProtectedLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </UserProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
