import { useState, useRef, useCallback } from 'react';
import { parseCSV } from '../parsers/csvParser';
import { parseExcel } from '../parsers/excelParser';
import { parsePDF } from '../parsers/pdfParser';

export default function FileUpload({ onNext, onBack }) {
  const [rawData, setRawData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [headerRow, setHeaderRow] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setError('');
    setFileName(file.name);

    try {
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

      // Filter out completely empty rows
      const filtered = data.filter(row =>
        Array.isArray(row) ? row.some(cell => String(cell).trim() !== '') : false
      );

      setRawData(filtered);
      setHeaderRow(0);
    } catch (err) {
      setError(err.message || 'Failed to parse file');
      setRawData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const previewRows = rawData ? rawData.slice(0, 15) : [];

  const handleNext = () => {
    if (!rawData) return;
    const headers = rawData[headerRow];
    const dataRows = rawData.slice(headerRow + 1);
    onNext({ headers, dataRows, headerRow, fileName });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-[#1A395C] mb-6">Upload Census Data</h2>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-[#1A395C] bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.pdf"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-600 font-medium">
          {loading ? 'Parsing file...' : 'Drag & drop a file here, or click to browse'}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          Supports CSV, Excel (.xlsx/.xls), and PDF
        </p>
        {fileName && (
          <p className="text-[#1A395C] font-medium mt-3">{fileName}</p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Preview & header row selector */}
      {rawData && rawData.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-4 mb-3">
            <label className="text-sm font-medium text-gray-700">
              Header Row:
            </label>
            <select
              value={headerRow}
              onChange={(e) => setHeaderRow(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A395C] outline-none"
            >
              {previewRows.map((_, i) => (
                <option key={i} value={i}>
                  Row {i + 1}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              Click the row that contains column headers
            </span>
          </div>

          <div className="border rounded-lg overflow-auto max-h-96">
            <table className="min-w-full text-sm">
              <tbody>
                {previewRows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={`cursor-pointer transition-colors ${
                      rowIdx === headerRow
                        ? 'bg-[#1A395C] text-white font-semibold'
                        : rowIdx < headerRow
                        ? 'bg-gray-100 text-gray-400'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setHeaderRow(rowIdx)}
                  >
                    <td className="px-2 py-1.5 text-xs w-10 text-center border-r border-gray-200">
                      {rowIdx + 1}
                    </td>
                    {(Array.isArray(row) ? row : [row]).map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-3 py-1.5 border-r border-gray-200 whitespace-nowrap"
                      >
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Showing first {previewRows.length} rows. Total rows: {rawData.length}.
            Click a row to set it as the header row.
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          disabled={!rawData}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            rawData
              ? 'bg-[#1A395C] text-white hover:bg-[#142d49]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
