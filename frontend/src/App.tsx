import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { FileUpload } from './components/FileUpload';
import { PricingTable } from './components/PricingTable';
import { AIAdvisor } from './components/AIAdvisor';
import { AIAdvisorAdvanced } from './components/AIAdvisorAdvanced';
import { PriceUpdater } from './pages/PriceUpdater';
import { DealReviewTabs } from './pages/DealReviewTabs';
import { UserManagement } from './pages/UserManagement';
import { Admin } from './pages/Admin';
import LoginSimple from './pages/LoginSimple';
import LoginCustom from './pages/LoginCustom';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import AuthHandler from './components/AuthHandler';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { FileSpreadsheet, Globe, Upload, LogOut, Bot, Calculator, Shield, DollarSign } from 'lucide-react';
import monogotoLogo from './assets/monogoto-logo.svg';

function HomePage() {
  const { user, signOut } = useAuth();
  const { userRole, isAdmin, isSales } = useUser();
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  
  // Debug logging
  console.log('Current user:', user?.email);
  console.log('User role:', userRole);
  console.log('Is admin?:', isAdmin);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Apple Style */}
      <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={monogotoLogo} alt="Monogoto" className="h-8" />
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">DealDesk</h1>
                <p className="text-sm text-gray-500">Operator Pricing Analysis Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAIAdvisor(!showAIAdvisor)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  showAIAdvisor 
                    ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>AI Advisor</span>
              </button>
              <Link 
                to="/deal-review"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all border border-gray-200 whitespace-nowrap"
              >
                <Calculator className="w-4 h-4" />
                <span>Deal Review</span>
              </Link>
              <Link 
                to="/price-updater"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all border border-gray-200 whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>Price Updater</span>
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin"
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-medium transition-all border border-slate-300"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
              {user && (
                <div className="flex items-center space-x-3">
                  {/* User Avatar with Role Badge */}
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      isAdmin ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                      isSales ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                      'bg-gradient-to-br from-gray-500 to-gray-600'
                    }`}>
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {isAdmin && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center" title="Admin">
                        <Shield className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {isSales && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center" title="Sales">
                        <DollarSign className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  {/* Sign Out Button */}
                  <button
                    onClick={signOut}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className={showAIAdvisor ? 'grid grid-cols-1 xl:grid-cols-4 gap-6' : ''}>
          {/* AI Advisor Panel */}
          {showAIAdvisor && (
            <div className="xl:col-span-1">
              <AIAdvisorAdvanced />
            </div>
          )}
          
          {/* Pricing Table - Full width */}
          <div className={showAIAdvisor ? 'xl:col-span-3' : 'w-full'}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-6">Network Pricing Database</h2>
              <PricingTable />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
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
                  <HomePage />
                </ProtectedRoute>
              </AuthHandler>
            } />
            <Route path="/price-updater" element={
              <ProtectedRoute>
                <PriceUpdater />
              </ProtectedRoute>
            } />
            <Route path="/deal-review" element={
              <ProtectedRoute>
                <DealReviewTabs />
              </ProtectedRoute>
            } />
            <Route path="/user-management" element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
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
