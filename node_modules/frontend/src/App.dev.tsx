import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FileUpload } from './components/FileUpload';
import { PricingDisplay } from './components/PricingDisplay';
import type { PricingData } from './components/PricingDisplay';
import { PriceUpdater } from './pages/PriceUpdater';
import Login from './pages/Login';
import { FileSpreadsheet, Globe, Upload, LogOut, User } from 'lucide-react';

// Development version - No authentication required
function HomePage() {
  const [pricingData, setPricingData] = useState<PricingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mock user for development
  const mockUser = { email: 'maor@monogoto.io (Dev Mode)' };
  const signOut = () => {
    alert('Sign out clicked - In dev mode, just refresh the page');
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', 'a1');

    try {
      const response = await fetch('http://localhost:3001/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setPricingData(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DealDesk</h1>
                <p className="text-sm text-gray-500">Operator Pricing Analysis Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/price-updater"
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Price Updater</span>
              </Link>
              
              {/* Always show user info in dev mode */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{mockUser.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FileSpreadsheet className="w-4 h-4" />
                <span>MVP v1.0 (DEV)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dev Mode Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <p className="text-sm text-yellow-800">
            ⚠️ Development Mode - Authentication bypassed. Use App.tsx for production.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Pricing Data
            </h2>
            <FileUpload onFileUpload={handleFileUpload} />
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Display Section */}
        {(pricingData.length > 0 || isLoading) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <PricingDisplay data={pricingData} isLoading={isLoading} />
          </div>
        )}

        {/* Info Section */}
        {pricingData.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md mx-auto">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Get Started
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload your operator pricing file to begin analysis. 
                Currently supporting A1 Telekom Austria format.
              </p>
              <div className="text-xs text-gray-400">
                Supported formats: Excel (.xlsx, .xls), CSV
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>© 2024 Monogoto - DealDesk Platform (Development Mode)</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/price-updater" element={<PriceUpdater />} />
      </Routes>
    </Router>
  );
}

export default App;