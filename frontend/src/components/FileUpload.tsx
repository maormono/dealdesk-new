import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  accept = '.xlsx,.xls,.csv',
  maxSize = 10 * 1024 * 1024, // 10MB
}) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFile(file);
    setUploadStatus('uploading');
    setErrorMessage('');

    try {
      await onFileUpload(file);
      setUploadStatus('success');
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize,
    multiple: false,
  });

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadedFile(null);
    setErrorMessage('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
          {
            'border-gray-300 hover:border-primary-400 bg-gray-50 hover:bg-primary-50': 
              uploadStatus === 'idle' && !isDragActive,
            'border-primary-500 bg-primary-50': isDragActive,
            'border-green-500 bg-green-50': uploadStatus === 'success',
            'border-red-500 bg-red-50': uploadStatus === 'error',
            'border-blue-500 bg-blue-50': uploadStatus === 'uploading',
          }
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {uploadStatus === 'idle' && (
            <>
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop your pricing file'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to select a file
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports: Excel (.xlsx, .xls) and CSV files (max {maxSize / 1024 / 1024}MB)
                </p>
              </div>
            </>
          )}

          {uploadStatus === 'uploading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="text-lg font-medium text-primary-700">
                Uploading {uploadedFile?.name}...
              </p>
            </>
          )}

          {uploadStatus === 'success' && uploadedFile && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600" />
              <div>
                <p className="text-lg font-medium text-green-700">
                  Successfully uploaded!
                </p>
                <div className="flex items-center justify-center mt-2 space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">{uploadedFile.name}</span>
                </div>
              </div>
            </>
          )}

          {uploadStatus === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-600" />
              <div>
                <p className="text-lg font-medium text-red-700">
                  Upload failed
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {errorMessage}
                </p>
              </div>
            </>
          )}
        </div>

        {(uploadStatus === 'success' || uploadStatus === 'error') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetUpload();
            }}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
};