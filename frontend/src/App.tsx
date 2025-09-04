import { useState, useRef, useEffect } from 'react';
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
import { FileSpreadsheet, Globe, Upload, LogOut, Bot, Calculator, Shield, Book, X, ArrowLeft } from 'lucide-react';
import monogotoLogo from './assets/monogoto-logo.svg';
import { NotesDictionary } from './components/NotesDisplay';

function HomePage() {
  const { user, signOut } = useAuth();
  const { userRole, isAdmin } = useUser();
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotesDictionary, setShowNotesDictionary] = useState(false);
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('USD');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
              {/* Return to Monogoto OS button */}
              <a
                href="https://monogoto-os.netlify.app/dashboard"
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                title="Return to Monogoto OS"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Monogoto OS</span>
              </a>
              <div className="h-6 w-px bg-gray-200" />
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
                <div className="relative" ref={dropdownRef}>
                  {/* User Avatar */}
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:from-blue-600 hover:to-purple-700 transition-colors"
                    title="User Menu"
                  >
                    <span className="text-sm font-medium">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </button>
                  {isAdmin && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center pointer-events-none">
                      <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  
                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{userRole?.role || 'User'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowNotesDictionary(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                      >
                        <Book className="w-4 h-4" />
                        <span>Notes Dictionary & Legend</span>
                      </button>
                      <div className="border-t border-gray-100" />
                      <button
                        onClick={() => {
                          signOut();
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
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
              <AIAdvisor currency={currency} />
            </div>
          )}
          
          {/* Pricing Table - Full width */}
          <div className={showAIAdvisor ? 'xl:col-span-3' : 'w-full'}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-6">Network Pricing Database</h2>
              <PricingTable currency={currency} onCurrencyChange={setCurrency} />
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
      
      {/* Notes Dictionary Modal */}
      {showNotesDictionary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto relative">
            <button
              onClick={() => setShowNotesDictionary(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <NotesDictionary />
            </div>
          </div>
        </div>
      )}
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
