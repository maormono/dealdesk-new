import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface UploadInfo {
  id: number;
  filename: string;
  record_count: number;
  uploaded_by: string;
  uploaded_at: string;
}

interface DataUploadProps {
  onDataLoaded?: () => void;
}

export const DataUpload: React.FC<DataUploadProps> = ({ onDataLoaded }) => {
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUploadInfo();
  }, []);

  const loadUploadInfo = async () => {
    const { data, error } = await supabase
      .from('data_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      setUploadInfo(data);
    } else {
      setUploadInfo(null);
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

      // Clear existing data
      await supabase.from('network_pricing').delete().gte('id', 0);
      await supabase.from('data_uploads').delete().gte('id', 0);

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

      // Record the upload
      const { error: uploadError } = await supabase
        .from('data_uploads')
        .insert({
          filename: file.name,
          record_count: records.length,
          uploaded_by: user?.email || 'unknown'
        });

      if (uploadError) {
        console.error('Failed to record upload:', uploadError);
      }

      setSuccess(`Successfully uploaded ${records.length} records from ${file.name}`);
      await loadUploadInfo();
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

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all pricing data?')) return;

    setIsClearing(true);
    setError(null);
    setSuccess(null);

    try {
      await supabase.from('network_pricing_v2').delete().gte('id', 0);
      await supabase.from('data_uploads').delete().gte('id', 0);

      setUploadInfo(null);
      setSuccess('All data cleared');
      onDataLoaded?.();
    } catch (err) {
      setError('Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Current file info */}
          {uploadInfo ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{uploadInfo.filename}</div>
                <div className="text-xs text-gray-500">
                  {uploadInfo.record_count} records • Uploaded {formatDate(uploadInfo.uploaded_at)}
                  {uploadInfo.uploaded_by && ` by ${uploadInfo.uploaded_by}`}
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
              {isUploading ? 'Uploading...' : (uploadInfo ? 'Replace Data' : 'Upload File')}
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

          {/* Clear button */}
          {uploadInfo && (
            <button
              onClick={handleClearData}
              disabled={isClearing}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isClearing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {isClearing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Clear</span>
            </button>
          )}
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
  );
};
