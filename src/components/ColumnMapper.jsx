import { useState, useEffect, useMemo } from 'react';
import { detectColumns } from '../utils/columnDetector';

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Employee Name (combined)' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'filingStatus', label: 'Filing Status' },
  { key: 'annualGross', label: 'Annual Gross Wages' },
  { key: 'payType', label: 'Pay Type (Hourly/Salary)' },
];

const OPTIONAL_FIELDS = [
  { key: 'existingDeductions', label: 'Existing Pre-Tax Deductions' },
  { key: 'department', label: 'Department' },
  { key: 'location', label: 'Location' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'employeeId', label: 'Employee ID' },
];

export default function ColumnMapper({ headers, dataRows, onNext, onBack }) {
  const autoDetected = useMemo(() => detectColumns(headers), [headers]);
  const [mappings, setMappings] = useState(autoDetected);
  const [wageType, setWageType] = useState('annual'); // annual | per-period
  const [deductionType, setDeductionType] = useState('annual'); // annual | per-period

  useEffect(() => {
    setMappings(autoDetected);
  }, [autoDetected]);

  const setMapping = (field, value) => {
    setMappings((prev) => {
      const next = { ...prev };
      if (value === '') {
        delete next[field];
      } else {
        next[field] = Number(value);
      }
      return next;
    });
  };

  // Validation: need name (combined OR first+last), filingStatus, annualGross, payType
  const hasName = mappings.name !== undefined || (mappings.firstName !== undefined && mappings.lastName !== undefined);
  const hasRequired = hasName && mappings.filingStatus !== undefined && mappings.annualGross !== undefined && mappings.payType !== undefined;

  // Sample data for preview
  const sampleRows = dataRows.slice(0, 3);

  const getSampleValues = (colIdx) => {
    if (colIdx === undefined || colIdx === '') return [];
    return sampleRows.map((row) => String(row[colIdx] ?? '')).filter(Boolean);
  };

  const renderFieldMapping = (field) => (
    <div key={field.key} className="flex items-start gap-4 py-3 border-b border-gray-100">
      <div className="w-48 flex-shrink-0">
        <span className="text-sm font-medium text-gray-700">{field.label}</span>
      </div>
      <div className="flex-1">
        <select
          value={mappings[field.key] ?? ''}
          onChange={(e) => setMapping(field.key, e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A395C] outline-none"
        >
          <option value="">— Not mapped —</option>
          {headers.map((h, i) => (
            <option key={i} value={i}>
              {String(h)}
            </option>
          ))}
        </select>
        {mappings[field.key] !== undefined && (
          <div className="mt-1 text-xs text-gray-400">
            Sample: {getSampleValues(mappings[field.key]).join(', ') || '(empty)'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-[#1A395C] mb-2">Map Columns</h2>
      <p className="text-gray-500 text-sm mb-6">
        Map your census columns to the required fields. Auto-detected mappings are pre-filled.
      </p>

      <div className="bg-white border rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-[#1A395C] uppercase tracking-wide mb-3">
          Required Fields
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Map either "Employee Name" (combined) OR both "First Name" and "Last Name"
        </p>
        {REQUIRED_FIELDS.map(renderFieldMapping)}

        <div className="mt-4 flex gap-6">
          <div>
            <label className="text-xs font-medium text-gray-600">Wage amounts are:</label>
            <div className="flex gap-3 mt-1">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="wageType"
                  value="annual"
                  checked={wageType === 'annual'}
                  onChange={() => setWageType('annual')}
                />
                Annual
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="wageType"
                  value="per-period"
                  checked={wageType === 'per-period'}
                  onChange={() => setWageType('per-period')}
                />
                Per pay period
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Deduction amounts are:</label>
            <div className="flex gap-3 mt-1">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="deductionType"
                  value="annual"
                  checked={deductionType === 'annual'}
                  onChange={() => setDeductionType('annual')}
                />
                Annual
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="deductionType"
                  value="per-period"
                  checked={deductionType === 'per-period'}
                  onChange={() => setDeductionType('per-period')}
                />
                Per pay period
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[#1A395C] uppercase tracking-wide mb-3">
          Optional Fields
        </h3>
        {OPTIONAL_FIELDS.map(renderFieldMapping)}
      </div>

      {!hasRequired && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          Please map all required fields: Employee Name (or First + Last), Filing Status, Annual Gross Wages, and Pay Type.
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
          onClick={() => onNext({ mappings, wageType, deductionType })}
          disabled={!hasRequired}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            hasRequired
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
