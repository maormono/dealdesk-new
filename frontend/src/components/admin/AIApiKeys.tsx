import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface AIServiceConfig {
  name: string;
  description: string;
  model: string;
  apiKeyEnvVar: string;
  apiKeyValue: string;
  status: 'active' | 'error' | 'unknown';
  lastChecked?: Date;
  file: string;
  line: number;
}

export const AIApiKeys: React.FC = () => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);
  const [services, setServices] = useState<AIServiceConfig[]>([]);

  // Get the API key from environment
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  useEffect(() => {
    // Initialize services configuration
    const aiServices: AIServiceConfig[] = [
      {
        name: 'AI Pricing Advisor',
        description: 'Chatbot on Network Pricing Database page - answers pricing questions',
        model: 'gemini-2.0-flash-exp',
        apiKeyEnvVar: 'VITE_GEMINI_API_KEY',
        apiKeyValue: geminiApiKey,
        status: 'unknown',
        file: 'frontend/src/services/aiService.ts',
        line: 14
      },
      {
        name: 'Enhanced Deal Service',
        description: 'Part of Deal Review analysis - provides AI recommendations',
        model: 'gemini-2.5-flash',
        apiKeyEnvVar: 'VITE_GEMINI_API_KEY',
        apiKeyValue: geminiApiKey,
        status: 'unknown',
        file: 'frontend/src/services/enhancedDealService.ts',
        line: 49
      },
      {
        name: 'Comprehensive Deal Service',
        description: 'Part of Deal Review analysis - comprehensive deal evaluation',
        model: 'gemini-2.0-flash-exp',
        apiKeyEnvVar: 'VITE_GEMINI_API_KEY',
        apiKeyValue: geminiApiKey,
        status: 'unknown',
        file: 'frontend/src/services/comprehensiveDealService.ts',
        line: 502
      }
    ];
    setServices(aiServices);
  }, [geminiApiKey]);

  const maskApiKey = (key: string): string => {
    if (!key) return '(not set)';
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  const toggleKeyVisibility = (serviceName: string) => {
    setShowKeys(prev => ({ ...prev, [serviceName]: !prev[serviceName] }));
  };

  const checkApiKey = async () => {
    setChecking(true);

    try {
      // Test the Gemini API with a simple request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "OK" if you can read this.' }] }]
          })
        }
      );

      const isWorking = response.ok;
      const now = new Date();

      setServices(prev => prev.map(service => ({
        ...service,
        status: isWorking ? 'active' : 'error',
        lastChecked: now
      })));

    } catch (error) {
      console.error('API check error:', error);
      const now = new Date();
      setServices(prev => prev.map(service => ({
        ...service,
        status: 'error',
        lastChecked: now
      })));
    } finally {
      setChecking(false);
    }
  };

  const getStatusBadge = (status: AIServiceConfig['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            <XCircle className="w-3 h-3" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            Unknown
          </span>
        );
    }
  };

  const getModelBadge = (model: string) => {
    const isExperimental = model.includes('exp');
    const isInvalid = model === 'gemini-2.5-flash'; // This model doesn't exist

    if (isInvalid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          {model} (Invalid)
        </span>
      );
    }

    if (isExperimental) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          {model}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
        {model}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">AI API Keys</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage API keys and models for AI-powered features
          </p>
        </div>
        <button
          onClick={checkApiKey}
          disabled={checking}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Test API Key'}
        </button>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Configuration Issues Detected</h4>
            <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
              <li><code className="bg-yellow-100 px-1 rounded">gemini-2.5-flash</code> is not a valid model name - should be <code className="bg-yellow-100 px-1 rounded">gemini-1.5-flash</code> or <code className="bg-yellow-100 px-1 rounded">gemini-2.0-flash</code></li>
              <li><code className="bg-yellow-100 px-1 rounded">gemini-2.0-flash-exp</code> is experimental and may become unavailable</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Key Info */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Key className="w-5 h-5 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Gemini API Key</h4>
        </div>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-sm font-mono text-gray-700">
            {showKeys['main'] ? geminiApiKey : maskApiKey(geminiApiKey)}
          </code>
          <button
            onClick={() => toggleKeyVisibility('main')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={showKeys['main'] ? 'Hide' : 'Show'}
          >
            {showKeys['main'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Environment variable: <code className="bg-gray-100 px-1 rounded">VITE_GEMINI_API_KEY</code> (defined in <code className="bg-gray-100 px-1 rounded">frontend/.env</code>)
        </p>
      </div>

      {/* Services Table */}
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File Location
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {services.map((service) => (
              <tr key={service.name} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">{service.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{service.description}</div>
                </td>
                <td className="px-4 py-4">
                  {getModelBadge(service.model)}
                </td>
                <td className="px-4 py-4">
                  {getStatusBadge(service.status)}
                  {service.lastChecked && (
                    <div className="text-xs text-gray-400 mt-1">
                      Checked: {service.lastChecked.toLocaleTimeString()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {service.file}:{service.line}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Recommended Models</h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <strong>Stable models:</strong>
            <ul className="list-disc list-inside mt-1">
              <li><code className="bg-blue-100 px-1 rounded">gemini-2.0-flash</code> - Fast, good quality</li>
              <li><code className="bg-blue-100 px-1 rounded">gemini-1.5-flash</code> - Reliable fallback</li>
              <li><code className="bg-blue-100 px-1 rounded">gemini-1.5-pro</code> - Highest quality</li>
            </ul>
          </div>
          <div>
            <strong>To update:</strong>
            <ol className="list-decimal list-inside mt-1">
              <li>Edit the service file at the indicated location</li>
              <li>Change the model name in the configuration</li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
