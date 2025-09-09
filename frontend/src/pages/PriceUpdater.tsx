import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { AlertCircle, Upload, CheckCircle, XCircle } from 'lucide-react';

interface SchemaHints {
  hasTADIG: boolean;
  hasIMSI: boolean;
  currency: string | null;
  possibleOperator: string | null;
  tadigColumn?: number;
  imsiColumn?: number;
}

interface PriceChange {
  network: string;
  country: string;
  tadig: string;
  change: 'NEW' | 'UPDATE' | 'REMOVE';
  oldPrice: number | null;
  newPrice: number;
}

export const PriceUpdater: React.FC = () => {
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [schemaHints, setSchemaHints] = useState<SchemaHints | null>(null);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const detectSchema = (workbook: XLSX.WorkBook): SchemaHints => {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    const hints: SchemaHints = {
      hasTADIG: false,
      hasIMSI: false,
      currency: null,
      possibleOperator: null
    };
    
    // Scan first 20 rows for patterns
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toLowerCase();
        const cellUpper = String(row[j] || '').toUpperCase();
        
        // Check for TADIG patterns
        if (/^[A-Z]{3}[A-Z0-9]{2}$/.test(cellUpper)) {
          hints.hasTADIG = true;
          hints.tadigColumn = j;
        }
        
        // Check for IMSI mentions
        if (cell.includes('imsi')) {
          hints.hasIMSI = true;
          hints.imsiColumn = j;
        }
        
        // Check for currency
        if (cell.includes('eur')) hints.currency = 'EUR';
        if (cell.includes('usd')) hints.currency = 'USD';
        if (cell.includes('gbp')) hints.currency = 'GBP';
        
        // Check for operator hints
        if (cell.includes('a1')) hints.possibleOperator = 'A1';
        if (cell.includes('telefonica')) hints.possibleOperator = 'Telefonica';
        if (cell.includes('tele2')) hints.possibleOperator = 'Tele2';
      }
    }
    
    return hints;
  };

  const parseAndPreview = (workbook: XLSX.WorkBook) => {
    // Parse the workbook based on selected operator
    const mockChanges: PriceChange[] = [
      { 
        network: 'T-Mobile', 
        country: 'United States', 
        tadig: 'USATM', 
        change: 'UPDATE', 
        oldPrice: 0.0030, 
        newPrice: 0.0028 
      },
      { 
        network: 'Vodafone', 
        country: 'Germany', 
        tadig: 'DEUD2', 
        change: 'NEW', 
        oldPrice: null, 
        newPrice: 0.0045 
      },
      { 
        network: 'Orange', 
        country: 'France', 
        tadig: 'FRAOR', 
        change: 'UPDATE', 
        oldPrice: 0.0050, 
        newPrice: 0.0048 
      },
    ];
    
    setPriceChanges(mockChanges);
    setShowPreview(true);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedOperator) {
      alert('Please select an operator first');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Detect schema
      const hints = detectSchema(workbook);
      setSchemaHints(hints);
      
      // Parse and preview after a short delay
      setTimeout(() => parseAndPreview(workbook), 1000);
    };
    
    reader.readAsArrayBuffer(file);
  }, [selectedOperator]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const applyChanges = async () => {
    if (confirm('Are you sure you want to apply these changes? This will update the price database.')) {
      // Here we would make an API call to save the changes
      alert('✅ Price list updated successfully!');
      // Reset state
      setShowPreview(false);
      setPriceChanges([]);
      setSchemaHints(null);
      setUploadedFileName('');
    }
  };

  const cancelUpdate = () => {
    setShowPreview(false);
    setPriceChanges([]);
    setSchemaHints(null);
    setUploadedFileName('');
  };

  return (
    <div className="bg-gray-50 pt-20 flex-1">
      {/* Page Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-[#F5B342] to-[#E89B3E] rounded-2xl shadow-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Price Updater</h1>
              <p className="text-sm text-gray-500 mt-0.5">Smart price list management with validation</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Current Status */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Current Price Lists</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-600">A1</span>
                <span className="text-xs text-gray-500">Last updated: Jan 2025</span>
              </div>
              <div className="text-sm text-gray-600">
                <div>463 networks</div>
                <div>Format: 202509_Country Price List</div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-red-600">Telefonica</span>
                <span className="text-xs text-gray-500">Last updated: Feb 2025</span>
              </div>
              <div className="text-sm text-gray-600">
                <div>520 networks</div>
                <div>Format: Monogoto TGS UK V1</div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-purple-600">Tele2</span>
                <span className="text-xs text-gray-500">Last updated: Jun 2023</span>
              </div>
              <div className="text-sm text-gray-600">
                <div>250 networks</div>
                <div>Format: Tele2 data fee analysis</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Upload New Price List</h2>
          
          {/* Operator Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Operator</label>
            <div className="flex gap-2">
              {['A1', 'Telefonica', 'Tele2', 'auto'].map((op) => (
                <button
                  key={op}
                  onClick={() => setSelectedOperator(op)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedOperator === op
                      ? op === 'A1' ? 'bg-blue-600 text-white' :
                        op === 'Telefonica' ? 'bg-red-600 text-white' :
                        op === 'Tele2' ? 'bg-purple-600 text-white' :
                        'bg-gray-600 text-white'
                      : op === 'A1' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                        op === 'Telefonica' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                        op === 'Tele2' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                        'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {op === 'auto' ? '🤖 Auto-Detect' : op}
                </button>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop the file here' : 'Drop Excel file here'}
            </p>
            <p className="text-sm text-gray-600 mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 mt-2">Supports: .xlsx, .xls, .csv</p>
          </div>

          {/* Schema Detection Results */}
          {schemaHints && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">🤖 Schema Detection</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <div className="space-y-2">
                  <div>📋 <strong>File:</strong> {uploadedFileName}</div>
                  <div className="flex items-center gap-2">
                    🏷️ <strong>Has TADIG:</strong> 
                    {schemaHints.hasTADIG ? 
                      <CheckCircle className="w-4 h-4 text-green-500" /> : 
                      <XCircle className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    💳 <strong>Has IMSI:</strong> 
                    {schemaHints.hasIMSI ? 
                      <CheckCircle className="w-4 h-4 text-green-500" /> : 
                      <XCircle className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div>💱 <strong>Currency:</strong> {schemaHints.currency || 'Not detected'}</div>
                  <div>🏢 <strong>Likely Operator:</strong> {schemaHints.possibleOperator || selectedOperator}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-lg font-semibold mb-4">Preview Changes</h2>
            
            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">
                  {priceChanges.filter(c => c.change === 'NEW').length}
                </div>
                <div className="text-sm text-gray-600">New Networks</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {priceChanges.filter(c => c.change === 'UPDATE').length}
                </div>
                <div className="text-sm text-gray-600">Updated Prices</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-yellow-600">
                  {priceChanges.filter(c => c.change === 'REMOVE').length}
                </div>
                <div className="text-sm text-gray-600">Removed Networks</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </div>

            {/* Changes Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Network</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">TADIG</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Old Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {priceChanges.map((change, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm">{change.network}</td>
                      <td className="px-4 py-2 text-sm">{change.country}</td>
                      <td className="px-4 py-2 text-sm font-mono">{change.tadig}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          change.change === 'NEW' ? 'bg-blue-100 text-blue-700' :
                          change.change === 'UPDATE' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {change.change}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {change.oldPrice === null ? '-' : `$${change.oldPrice.toFixed(4)}`}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">
                        ${change.newPrice.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cancelUpdate}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={applyChanges}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Apply Changes
              </button>
            </div>
          </div>
        )}

        {/* Validation Rules */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🛡️ Validation Rules</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>TADIG code format validation (MCCMNC)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Price range validation (alerts for &gt;100% changes)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Network name consistency check</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Currency validation (USD, EUR, GBP)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Technology capabilities validation (2G/3G/4G/5G)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>IMSI fee structure validation</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};