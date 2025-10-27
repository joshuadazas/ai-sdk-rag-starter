'use client';

import { useState, useCallback } from 'react';

interface UploadResult {
  success: boolean;
  message: string;
  fileName?: string;
  policyNumber?: string;
  contentLength?: number;
  error?: string;
}

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          fileName: data.fileName,
          policyNumber: data.policyNumber,
          contentLength: data.contentLength,
        });
      } else {
        setResult({
          success: false,
          message: '',
          error: data.error || 'Upload failed',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: '',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleChange}
          accept=".txt,.md,.pdf"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="animate-spin mx-auto h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            <div className="space-y-1">
              <p className="text-sm text-gray-600 font-medium">Processing document...</p>
              <p className="text-xs text-gray-500">This may take 30-60 seconds for PDFs</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl">📄</div>
            <div>
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
              >
                Click to upload
              </label>
              <span className="text-gray-600"> or drag and drop</span>
            </div>
            <p className="text-xs text-gray-500">
              TXT, MD, or PDF files (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Result Message */}
      {result && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {result.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-xl">✓</span>
                <span className="font-medium text-green-900">
                  Document added successfully!
                </span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <strong>File:</strong> {result.fileName}
                </p>
                {result.policyNumber && (
                  <p>
                    <strong>Policy Number:</strong> {result.policyNumber}
                  </p>
                )}
                {result.contentLength && (
                  <p>
                    <strong>Content:</strong> {result.contentLength.toLocaleString()} characters extracted
                  </p>
                )}
                <p className="text-xs mt-2 text-green-600">{result.message}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">✕</span>
              <span className="text-red-900">{result.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Tip:</strong> Name files like "P-018-001 Policy Name.pdf" to auto-detect policy numbers</p>
        <p>📚 Uploaded documents are automatically embedded and made searchable</p>
      </div>
    </div>
  );
}
