import { useState, useMemo } from 'react';
import { normalizeFilingStatus, normalizePayType, parseNumericValue } from '../utils/columnDetector';
import { PAY_PERIODS } from '../engine/constants';

export default function SmartConfirmation({ rawData, aiResult, fileName, onGenerate, onAdjust, onBack }) {
  // Company setup fields — pre-filled from AI if available
  const [companyName, setCompanyName] = useState(aiResult.company_name || '');
  const [companyType, setCompanyType] = useState(aiResult.company_type || 'Private');
  const [payFrequency, setPayFrequency] = useState(aiResult.detected_pay_frequency || 'Biweekly');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // Mappings — allow overrides
  const [headerRow, setHeaderRow] = useState(aiResult.header_row ?? 0);
  const [mappings, setMappings] = useState(aiResult.mappings || {});
  const [wageFormat, setWageFormat] = useState(aiResult.wage_format || 'annual');
  const [deductionFormat, setDeductionFormat] = useState(aiResult.deduction_format || 'annual');

  // Derive headers and data rows from header_row
  const headers = rawData[headerRow] || [];
  const dataRows = rawData.slice(headerRow + 1).filter(row =>
    Array.isArray(row) && row.some(cell => {
      const s = String(cell).trim().toUpperCase();
      return s && !['TOTAL', 'SUBTOTAL', 'GRAND TOTAL', 'SUM', 'PAGE'].some(t => s.includes(t));
    })
  );

  // Parse employees from data rows using AI mappings
  const employees = useMemo(() => {
    const periods = PAY_PERIODS[payFrequency] || 12;
    const m = mappings;

    return dataRows.map((row, idx) => {
      // Name
      let name = '';
      if (m.employee_name !== null && m.employee_name !== undefined) {
        name = String(row[m.employee_name] || '').trim();
      } else if (m.employee_first_name != null && m.employee_last_name != null) {
        const first = String(row[m.employee_first_name] || '').trim();
        const last = String(row[m.employee_last_name] || '').trim();
        name = `${first} ${last}`.trim();
      }

      // Skip empty name rows
      if (!name) return null;

      // Filing status
      const rawFS = m.filing_status != null ? String(row[m.filing_status] || '').trim() : '';
      const filingStatus = normalizeFilingStatus(rawFS) || 'Single';
      const filingStatusWarning = rawFS && !normalizeFilingStatus(rawFS);

      // Pay type
      const rawPT = m.pay_type != null ? String(row[m.pay_type] || '').trim() : '';
      const payType = normalizePayType(rawPT);

      // Gross wages
      let annualGross = 0;
      if (wageFormat === 'hourly_rate' && m.hourly_rate != null) {
        const rate = parseNumericValue(row[m.hourly_rate]);
        const hours = m.hours_per_week != null ? parseNumericValue(row[m.hours_per_week]) : 40;
        annualGross = rate * hours * 52;
      } else if (m.gross_wages != null) {
        annualGross = parseNumericValue(row[m.gross_wages]);
        if (wageFormat === 'per_period') {
          annualGross = annualGross * periods;
        }
      }

      // Deductions — sum all detected deduction columns
      let existingPreTaxDeductions = 0;
      const dedCols = m.deduction_columns || [];
      for (const colIdx of dedCols) {
        let val = parseNumericValue(row[colIdx]);
        if (deductionFormat === 'per_period') val *= periods;
        else if (deductionFormat === 'monthly') val *= 12;
        existingPreTaxDeductions += val;
      }

      // Optional fields
      const department = m.department != null ? String(row[m.department] || '').trim() : '';
      const employeeId = m.employee_id != null ? String(row[m.employee_id] || '').trim() : '';
      const jobTitle = m.job_title != null ? String(row[m.job_title] || '').trim() : '';

      // Flags
      const flags = [];
      if (!name) flags.push('Missing name');
      if (filingStatusWarning) flags.push(`Unknown filing status: "${rawFS}"`);
      if (annualGross <= 0) flags.push('$0 wages');

      return {
        id: idx,
        name,
        filingStatus,
        filingStatusWarning,
        payType,
        annualGross,
        existingPreTaxDeductions,
        department,
        employeeId,
        jobTitle,
        flags,
      };
    }).filter(Boolean);
  }, [dataRows, mappings, wageFormat, deductionFormat, payFrequency]);

  // Mapping status for display
  const mappingRows = [
    {
      label: 'Employee Name',
      mapped: mappings.employee_name != null || (mappings.employee_first_name != null && mappings.employee_last_name != null),
      colName: mappings.employee_name != null
        ? String(headers[mappings.employee_name] || `Column ${mappings.employee_name}`)
        : mappings.employee_first_name != null
        ? `${String(headers[mappings.employee_first_name] || '')} + ${String(headers[mappings.employee_last_name] || '')}`
        : null,
      samples: employees.slice(0, 3).map(e => e.name),
      field: 'employee_name',
    },
    {
      label: 'Filing Status',
      mapped: mappings.filing_status != null,
      colName: mappings.filing_status != null ? String(headers[mappings.filing_status] || `Column ${mappings.filing_status}`) : null,
      samples: employees.slice(0, 3).map(e => e.filingStatus),
      field: 'filing_status',
    },
    {
      label: 'Gross Wages',
      mapped: mappings.gross_wages != null || mappings.hourly_rate != null,
      colName: mappings.gross_wages != null
        ? `${String(headers[mappings.gross_wages] || `Column ${mappings.gross_wages}`)} — ${wageFormat === 'annual' ? 'Annual' : wageFormat === 'per_period' ? 'Per Period' : 'Hourly Rate'}`
        : mappings.hourly_rate != null
        ? `${String(headers[mappings.hourly_rate] || '')} (hourly)`
        : null,
      samples: employees.slice(0, 3).map(e => `$${e.annualGross.toLocaleString()}`),
      field: 'gross_wages',
    },
    {
      label: 'Pay Type',
      mapped: mappings.pay_type != null,
      colName: mappings.pay_type != null ? String(headers[mappings.pay_type] || `Column ${mappings.pay_type}`) : null,
      samples: employees.slice(0, 3).map(e => e.payType),
      field: 'pay_type',
    },
    {
      label: 'Deductions',
      mapped: (mappings.deduction_columns || []).length > 0,
      colName: (mappings.deduction_columns || []).length > 0
        ? (mappings.deduction_columns || []).map(i => String(headers[i] || `Col ${i}`)).join(' + ')
        : null,
      samples: employees.slice(0, 3).map(e => `$${e.existingPreTaxDeductions.toLocaleString()}`),
      field: 'deduction_columns',
    },
  ];

  const allRequired = mappingRows.slice(0, 4).every(r => r.mapped);
  const flaggedCount = employees.filter(e => e.flags.length > 0).length;

  const handleLooksGood = () => {
    if (!companyName.trim()) return;
    onGenerate({
      companySetup: { companyName, companyType, payFrequency, reportDate },
      employees,
    });
  };

  const handleAdjust = () => {
    // Convert AI mappings to the format the old ColumnMapper/DataReview expect
    const legacyMappings = {};
    if (mappings.employee_name != null) legacyMappings.name = mappings.employee_name;
    if (mappings.employee_first_name != null) legacyMappings.firstName = mappings.employee_first_name;
    if (mappings.employee_last_name != null) legacyMappings.lastName = mappings.employee_last_name;
    if (mappings.filing_status != null) legacyMappings.filingStatus = mappings.filing_status;
    if (mappings.gross_wages != null) legacyMappings.annualGross = mappings.gross_wages;
    if (mappings.pay_type != null) legacyMappings.payType = mappings.pay_type;
    if ((mappings.deduction_columns || []).length > 0) legacyMappings.existingDeductions = mappings.deduction_columns[0];
    if (mappings.department != null) legacyMappings.department = mappings.department;
    if (mappings.employee_id != null) legacyMappings.employeeId = mappings.employee_id;
    if (mappings.job_title != null) legacyMappings.jobTitle = mappings.job_title;

    onAdjust({
      companySetup: { companyName, companyType, payFrequency, reportDate },
      fileData: { headers, dataRows, headerRow, fileName },
      columnConfig: {
        mappings: legacyMappings,
        wageType: wageFormat === 'per_period' ? 'per-period' : 'annual',
        deductionType: deductionFormat === 'per_period' ? 'per-period' : 'annual',
      },
      employees,
    });
  };

  // For manual column override dropdown
  const updateMapping = (field, value) => {
    setMappings(prev => ({
      ...prev,
      [field]: value === '' ? null : Number(value),
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* AI confidence banner */}
      <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
        aiResult.confidence === 'high' ? 'bg-green-50 border-green-200' :
        aiResult.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
          aiResult.confidence === 'high' ? 'bg-green-500' :
          aiResult.confidence === 'medium' ? 'bg-yellow-500' :
          'bg-red-500'
        }`}>
          AI
        </div>
        <div>
          <div className="font-semibold text-sm">
            {aiResult.confidence === 'high' ? 'High confidence — everything looks good' :
             aiResult.confidence === 'medium' ? 'Medium confidence — please verify the mappings below' :
             'Low confidence — manual review recommended'}
          </div>
          {aiResult.notes && (
            <div className="text-xs text-gray-600 mt-0.5">{aiResult.notes}</div>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#1A395C] mb-1">Here's what we found</h2>
      <p className="text-gray-500 text-sm mb-6">Review the auto-detected settings and click "Looks Good" to generate reports.</p>

      {/* Company setup section */}
      <div className="bg-white border rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1A395C] uppercase tracking-wide mb-4">Company Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A395C] focus:border-transparent outline-none"
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company Type</label>
            <div className="flex gap-2">
              {[
                { value: 'Private', label: 'Private Sector' },
                { value: 'TRS', label: 'TX School District' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCompanyType(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    companyType === opt.value
                      ? 'border-[#1A395C] bg-[#1A395C] text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pay Frequency</label>
            <select
              value={payFrequency}
              onChange={(e) => setPayFrequency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A395C] outline-none"
            >
              <option value="Weekly">Weekly</option>
              <option value="Biweekly">Biweekly</option>
              <option value="Semi-Monthly">Semi-Monthly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A395C] outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex gap-6 text-xs text-gray-500">
          <span>Header Row: <strong>Row {headerRow + 1}</strong>
            <select
              value={headerRow}
              onChange={(e) => setHeaderRow(Number(e.target.value))}
              className="ml-1 px-1 py-0.5 border border-gray-300 rounded text-xs"
            >
              {rawData.slice(0, 15).map((_, i) => (
                <option key={i} value={i}>Row {i + 1}</option>
              ))}
            </select>
          </span>
          <span>Employees Found: <strong>{employees.length}</strong></span>
          <span>File: <strong>{fileName}</strong></span>
        </div>
      </div>

      {/* Column mappings table */}
      <div className="bg-white border rounded-xl p-5 mb-5">
        <h3 className="text-sm font-semibold text-[#1A395C] uppercase tracking-wide mb-4">Column Mappings</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-gray-500 font-medium text-xs">Required Field</th>
              <th className="text-left py-2 text-gray-500 font-medium text-xs">Mapped To</th>
              <th className="text-left py-2 text-gray-500 font-medium text-xs">Sample Values</th>
              <th className="text-center py-2 text-gray-500 font-medium text-xs w-12">Status</th>
            </tr>
          </thead>
          <tbody>
            {mappingRows.map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 ${!row.mapped ? 'bg-red-50' : ''}`}>
                <td className="py-2.5 font-medium text-gray-700">{row.label}</td>
                <td className="py-2.5">
                  {row.mapped ? (
                    <span className="text-gray-600">{row.colName}</span>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => updateMapping(row.field, e.target.value)}
                      className="px-2 py-1 border border-red-300 rounded text-sm bg-white text-red-700"
                    >
                      <option value="">— Select column —</option>
                      {headers.map((h, idx) => (
                        <option key={idx} value={idx}>{String(h)}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="py-2.5 text-gray-400 text-xs">
                  {row.samples.filter(Boolean).join('; ') || '—'}
                </td>
                <td className="py-2.5 text-center">
                  {row.mapped ? (
                    <span className="text-green-600 font-bold">&#10003;</span>
                  ) : (
                    <span className="text-red-500 font-bold">&#10007;</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Wage/deduction format toggles */}
        <div className="mt-4 flex gap-6 text-xs">
          <div>
            <span className="text-gray-500 font-medium">Wages are: </span>
            <select
              value={wageFormat}
              onChange={(e) => setWageFormat(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="annual">Annual</option>
              <option value="per_period">Per Pay Period</option>
              <option value="hourly_rate">Hourly Rate</option>
            </select>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Deductions are: </span>
            <select
              value={deductionFormat}
              onChange={(e) => setDeductionFormat(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="annual">Annual</option>
              <option value="per_period">Per Pay Period</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee preview */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1A395C] uppercase tracking-wide">Employee Preview</h3>
          {flaggedCount > 0 && (
            <span className="text-xs text-yellow-600 font-medium">{flaggedCount} with warnings</span>
          )}
        </div>
        <div className="overflow-auto max-h-64 rounded-lg border">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Filing</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Pay Type</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Annual Gross</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Deductions</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Flags</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 10).map((emp, i) => (
                <tr key={emp.id} className={`border-b ${emp.flags.length > 0 ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium">{emp.name}</td>
                  <td className="px-3 py-1.5">{emp.filingStatus}</td>
                  <td className="px-3 py-1.5">{emp.payType}</td>
                  <td className="px-3 py-1.5 text-right">${emp.annualGross.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right">${emp.existingPreTaxDeductions.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-center">
                    {emp.flags.length > 0 && (
                      <span className="text-yellow-600" title={emp.flags.join('; ')}>&#9888; {emp.flags.length}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {employees.length > 10 && (
          <p className="text-xs text-gray-400 mt-2">Showing first 10 of {employees.length} employees</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          &#8592; Re-upload
        </button>
        <button
          onClick={handleAdjust}
          className="px-5 py-2.5 rounded-lg font-medium border border-[#1A395C] text-[#1A395C] hover:bg-blue-50"
        >
          Let Me Adjust
        </button>
        <button
          onClick={handleLooksGood}
          disabled={!companyName.trim() || !allRequired}
          className={`flex-1 py-3 rounded-lg font-semibold text-lg transition-colors ${
            companyName.trim() && allRequired
              ? 'bg-[#1A395C] text-white hover:bg-[#142d49] shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Looks Good &#8212; Generate Reports
        </button>
      </div>
      {!companyName.trim() && (
        <p className="text-xs text-red-500 mt-2">Please enter a company name to continue.</p>
      )}
    </div>
  );
}
