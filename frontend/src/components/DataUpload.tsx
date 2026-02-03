import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, History, CheckCircle, Clock, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface UploadInfo {
  id: number;
  filename: string;
  record_count: number;
  uploaded_by: string;
  uploaded_at: string;
  is_active?: boolean;
  storage_path?: string;
}

interface DataUploadProps {
  onDataLoaded?: () => void;
}

export const DataUpload: React.FC<DataUploadProps> = ({ onDataLoaded }) => {
  const [uploadHistory, setUploadHistory] = useState<UploadInfo[]>([]);
  const [activeUpload, setActiveUpload] = useState<UploadInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    // Load all upload history
    const { data, error } = await supabase
      .from('data_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (data && !error) {
      setUploadHistory(data);
      // Find active upload (most recent or marked as active)
      const active = data.find(u => u.is_active) || data[0] || null;
      setActiveUpload(active);
    } else {
      setUploadHistory([]);
      setActiveUpload(null);
    }
  };

  // Parse price string like "$0.108" to number
  const parsePrice = (value: any): number => {
    if (!value || value === '-' || value === '') return 0;
    const strValue = String(value).trim();
    const numericStr = strValue.replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(numericStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Check for checkmark
  const hasCheckmark = (value: any): boolean => {
    if (!value) return false;
    const strValue = String(value).trim();
    return strValue.includes('✓') || strValue.includes('✔') || strValue.toLowerCase() === 'yes' || strValue === '1';
  };

  // Check for double checkmark
  const hasDoubleCheckmark = (value: any): boolean => {
    if (!value) return false;
    const strValue = String(value).trim();
    return strValue.includes('✓✓') || strValue.includes('✔✔') || strValue === '2';
  };

  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Try to find the right sheet
          let sheet = workbook.Sheets['Network Pricing'];
          if (!sheet) {
            // Fall back to first sheet
            const firstSheetName = workbook.SheetNames[0];
            sheet = workbook.Sheets[firstSheetName];
          }

          if (!sheet) {
            reject(new Error('No valid sheet found in file'));
            return;
          }

          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          const records: any[] = [];

          let currentCountry = '';
          let currentNetwork = '';
          let currentTadig = '';

          // Skip header row
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            // Update current values if present
            if (row[0] && String(row[0]).trim()) currentCountry = String(row[0]).trim();
            if (row[1] && String(row[1]).trim()) currentNetwork = String(row[1]).trim();
            if (row[2] && String(row[2]).trim()) currentTadig = String(row[2]).trim();

            const identity = row[3] ? String(row[3]).trim() : '';
            if (!identity) continue;

            records.push({
              country: currentCountry,
              network_name: currentNetwork,
              tadig: currentTadig,
              identity: identity,
              data_per_mb: parsePrice(row[4]),
              sms_cost: parsePrice(row[5]),
              imsi_cost: parsePrice(row[6]),
              gsm: hasCheckmark(row[7]),
              gprs_2g: hasCheckmark(row[7]),
              umts_3g: hasCheckmark(row[8]),
              lte_4g: hasCheckmark(row[9]),
              lte_5g: hasCheckmark(row[10]),
              lte_m: hasCheckmark(row[11]),
              lte_m_double: hasDoubleCheckmark(row[11]),
              nb_iot: hasCheckmark(row[12]),
              nb_iot_double: hasDoubleCheckmark(row[12]),
              notes: row[13] ? String(row[13]).trim() : ''
            });
          }

          resolve(records);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse the Excel file
      const records = await parseExcelFile(file);

      if (records.length === 0) {
        throw new Error('No valid records found in file');
      }

      // Clear existing pricing data (but keep upload history!)
      await supabase.from('network_pricing').delete().gte('id', 0);

      // Mark all previous uploads as inactive
      await supabase
        .from('data_uploads')
        .update({ is_active: false })
        .gte('id', 0);

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('network_pricing')
          .insert(batch);

        if (insertError) {
          throw new Error(`Failed to insert batch: ${insertError.message}`);
        }
      }

      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();

      // Upload the original file to Supabase Storage for future audit
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storagePath = `${user?.id || 'unknown'}/${timestamp}_${file.name}`;

      const { error: storageError } = await supabase.storage
        .from('pricing-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        console.warn('Failed to store original file (audit copy):', storageError.message);
        // Continue anyway - the data is still saved, just the original file won't be downloadable
      }

      // Record the new upload as active with storage path
      const { error: uploadError } = await supabase
        .from('data_uploads')
        .insert({
          filename: file.name,
          record_count: records.length,
          uploaded_by: user?.email || 'unknown',
          is_active: true,
          storage_path: storageError ? null : storagePath
        });

      if (uploadError) {
        console.error('Failed to record upload:', uploadError);
      }

      setSuccess(`Successfully uploaded ${records.length} records from ${file.name}`);
      await loadUploadHistory();
      onDataLoaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const handleDownloadFile = async (upload: UploadInfo) => {
    if (!upload.storage_path) {
      setError('Original file not available for download');
      return;
    }

    try {
      const { data, error: downloadError } = await supabase.storage
        .from('pricing-files')
        .download(upload.storage_path);

      if (downloadError) {
        throw new Error(downloadError.message);
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = upload.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Active Data */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activeUpload ? (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{activeUpload.filename}</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Active</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {activeUpload.record_count} records • Uploaded {formatDate(activeUpload.uploaded_at)}
                    {activeUpload.uploaded_by && ` by ${activeUpload.uploaded_by}`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">No data loaded</div>
                  <div className="text-xs text-gray-400">Upload an Excel file to get started</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Upload button */}
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
              isUploading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}>
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isUploading ? 'Uploading...' : (activeUpload ? 'Update Data' : 'Upload File')}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">
            <Check className="w-4 h-4" />
            {success}
          </div>
        )}
      </div>

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">Upload History</h4>
            <span className="text-xs text-gray-400">({uploadHistory.length} uploads)</span>
          </div>
          <div className="space-y-2">
            {uploadHistory.map((upload, index) => (
              <div
                key={upload.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  index === 0
                    ? 'bg-green-50/50 border-green-200'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {index === 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${index === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                        {upload.filename}
                      </span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {upload.record_count.toLocaleString()} records
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{formatDate(upload.uploaded_at)}</div>
                    <div className="text-xs text-gray-400">{upload.uploaded_by}</div>
                  </div>
                  {upload.storage_path && (
                    <button
                      onClick={() => handleDownloadFile(upload)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download original file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
