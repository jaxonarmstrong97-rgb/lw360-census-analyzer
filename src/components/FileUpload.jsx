import { useState, useRef, useCallback } from 'react';
import { parseCSV } from '../parsers/csvParser';
import { parseExcel } from '../parsers/excelParser';
import { parsePDF } from '../parsers/pdfParser';

const ANALYSIS_STEPS = [
  'Parsing file...',
  'Sending to AI for analysis...',
  'Detecting header row and columns...',
  'Mapping fields and validating...',
  'Done!',
];

export default function FileUpload({ onAnalysisComplete, onBack }) {
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | parsing | analyzing | done | error
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file) => {
    setFileName(file.name);
    setError('');
    setStatus('parsing');
    setAnalysisStep(0);

    try {
      // Stage 1: Parse raw file
      const ext = file.name.split('.').pop().toLowerCase();
      let data;

      if (ext === 'csv') {
        data = await parseCSV(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        data = await parseExcel(file);
      } else if (ext === 'pdf') {
        data = await parsePDF(file);
      } else {
        throw new Error(`Unsupported file type: .${ext}`);
      }

      // Filter completely empty rows
      const rawData = data.filter(row =>
        Array.isArray(row) ? row.some(cell => String(cell).trim() !== '') : false
      );

      if (rawData.length < 2) {
        throw new Error('File appears to be empty or has too few rows.');
      }

      setAnalysisStep(1);
      setStatus('analyzing');

      // Stage 2: Send to AI for full analysis
      const rowsToSend = rawData.slice(0, 25).map(row =>
        Array.isArray(row) ? row.map(c => String(c ?? '')) : [String(row)]
      );

      const res = await fetch('/api/analyze-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawRows: rowsToSend,
          fileName: file.name,
        }),
      });

      setAnalysisStep(2);

      if (!res.ok) {
        throw new Error('AI analysis service unavailable. You can still map columns manually.');
      }

      const aiResult = await res.json();
      setAnalysisStep(3);

      // Small delay for UX
      await new Promise(r => setTimeout(r, 300));
      setAnalysisStep(4);
      setStatus('done');

      // Pass everything to parent
      onAnalysisComplete({
        rawData,
        aiResult,
        fileName: file.name,
      });
    } catch (err) {
      setError(err.message || 'Failed to process file');
      setStatus('error');
    }
  }, [onAnalysisComplete]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isProcessing = status === 'parsing' || status === 'analyzing';

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-[#1A395C] mb-2">Upload Census File</h2>
      <p className="text-gray-500 text-sm mb-6">Drop your file and our AI will automatically detect the format, headers, and columns.</p>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-14 text-center transition-all ${
          isProcessing
            ? 'border-[#1A395C] bg-blue-50 cursor-wait'
            : isDragging
            ? 'border-[#1A395C] bg-blue-50 cursor-pointer'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.pdf"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />

        {status === 'idle' && (
          <>
            <div className="text-5xl mb-4">&#128193;</div>
            <p className="text-gray-600 font-medium text-lg">Drag & drop your census file</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
            <p className="text-gray-300 text-xs mt-3">CSV, Excel (.xlsx/.xls), or PDF</p>
          </>
        )}

        {isProcessing && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="w-10 h-10 text-[#1A395C] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-[#1A395C] font-semibold text-lg">Analyzing your census file...</p>
            <p className="text-gray-500 text-sm">{fileName}</p>

            {/* Progress steps */}
            <div className="max-w-sm mx-auto text-left space-y-1.5 mt-4">
              {ANALYSIS_STEPS.map((step, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${
                  i < analysisStep ? 'text-green-600' :
                  i === analysisStep ? 'text-[#1A395C] font-medium' :
                  'text-gray-300'
                }`}>
                  {i < analysisStep ? (
                    <span className="text-green-500">&#10003;</span>
                  ) : i === analysisStep ? (
                    <span className="animate-pulse">&#9679;</span>
                  ) : (
                    <span>&#9675;</span>
                  )}
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">&#9888;&#65039;</div>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-400 text-sm mt-2">Click to try another file</p>
          </>
        )}
      </div>

      {status !== 'idle' && !isProcessing && (
        <div className="mt-6 flex justify-start">
          <button
            onClick={() => { setStatus('idle'); setFileName(''); setError(''); }}
            className="px-5 py-2 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
          >
            Upload a different file
          </button>
        </div>
      )}
    </div>
  );
}
