// components/ExcelUpload.tsx
"use client"
import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload } from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  successCount: number;
  failedRows: Array<{
    row: number;
    errors: string[];
  }>;
}

const ExcelUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setResult(null);
      setDebugInfo('');
      
      const formData = new FormData();
      formData.append('file', file);

      setDebugInfo(prev => prev + '\nSending request...');
      
      const response = await fetch('/api/students/import', {
        method: 'POST',
        body: formData,
      });

      setDebugInfo(prev => prev + `\nResponse status: ${response.status}`);
      setDebugInfo(prev => prev + `\nResponse headers: ${JSON.stringify(Array.from(response.headers.entries()))}`);

      const responseText = await response.text();
      setDebugInfo(prev => prev + `\nResponse text: ${responseText.substring(0, 200)}...`);

      let data: ImportResult;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Upload failed with status ${response.status}`);
      }

      setResult(data);
    } catch (error: any) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        message: `Failed to process file: ${error.message}`,
        totalRows: 0,
        successCount: 0,
        failedRows: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isLoading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          id="excel-upload"
          disabled={isLoading}
        />
        <label
          htmlFor="excel-upload"
          className={`cursor-pointer block p-4 text-gray-600 ${isLoading ? 'cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-400" />
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <>
                <span className="font-medium">Click to upload Excel file</span>
                <span className="text-sm text-gray-500">or drag and drop</span>
                <span className="text-xs text-gray-400">(.xlsx or .xls)</span>
              </>
            )}
          </div>
        </label>
      </div>

      {debugInfo && (
        <Alert>
          <AlertTitle>Debug Information</AlertTitle>
          <AlertDescription>
            <pre className="whitespace-pre-wrap text-xs">{debugInfo}</pre>
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertTitle>Import Result</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <p>{result.message}</p>
              {result.totalRows > 0 && (
                <p className="mt-1">
                  Total Rows: {result.totalRows}, Successful: {result.successCount}
                </p>
              )}
            </div>
            {result.failedRows.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold">Failed Rows:</h4>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {result.failedRows.map((failure, index) => (
                    <div key={index} className="text-sm mt-1">
                      <p>Row {failure.row}:</p>
                      <ul className="list-disc ml-4">
                        {failure.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ExcelUpload;