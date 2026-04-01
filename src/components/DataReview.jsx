import { useState, useMemo } from 'react';
import { normalizeFilingStatus, normalizePayType, parseNumericValue } from '../utils/columnDetector';
import { PAY_PERIODS } from '../engine/constants';

export default function DataReview({ dataRows, mappings, wageType, deductionType, payFrequency, onNext, onBack }) {
  // Parse data rows into structured employee objects
  const initialEmployees = useMemo(() => {
    const periods = PAY_PERIODS[payFrequency] || 12;

    return dataRows.map((row, idx) => {
      // Name
      let name = '';
      if (mappings.name !== undefined) {
        name = String(row[mappings.name] || '').trim();
      } else if (mappings.firstName !== undefined && mappings.lastName !== undefined) {
        const first = String(row[mappings.firstName] || '').trim();
        const last = String(row[mappings.lastName] || '').trim();
        name = `${first} ${last}`.trim();
      }

      // Filing status
      const rawFS = String(row[mappings.filingStatus] || '').trim();
      const filingStatus = normalizeFilingStatus(rawFS);

      // Pay type
      const rawPT = String(row[mappings.payType] || '').trim();
      const payType = normalizePayType(rawPT);

      // Gross wages
      let annualGross = parseNumericValue(row[mappings.annualGross]);
      if (wageType === 'per-period') {
        annualGross = annualGross * periods;
      }

      // Existing deductions
      let existingPreTaxDeductions = 0;
      if (mappings.existingDeductions !== undefined) {
        existingPreTaxDeductions = parseNumericValue(row[mappings.existingDeductions]);
        if (deductionType === 'per-period') {
          existingPreTaxDeductions = existingPreTaxDeductions * periods;
        }
      }

      // Optional fields
      const department = mappings.department !== undefined ? String(row[mappings.department] || '').trim() : '';
      const location = mappings.location !== undefined ? String(row[mappings.location] || '').trim() : '';
      const jobTitle = mappings.jobTitle !== undefined ? String(row[mappings.jobTitle] || '').trim() : '';
      const employeeId = mappings.employeeId !== undefined ? String(row[mappings.employeeId] || '').trim() : '';

      // Flags
      const flags = [];
      if (!name) flags.push('Missing name');
      if (!filingStatus) flags.push(`Unknown filing status: "${rawFS}"`);
      if (annualGross <= 0) flags.push('$0 wages');

      return {
        id: idx,
        name,
        filingStatus: filingStatus || 'Single',
        filingStatusRaw: rawFS,
        filingStatusWarning: !filingStatus,
        payType,
        annualGross,
        existingPreTaxDeductions,
        department,
        location,
        jobTitle,
        employeeId,
        flags,
      };
    }).filter(emp => emp.name || emp.annualGross > 0); // Filter truly empty rows
  }, [dataRows, mappings, wageType, deductionType, payFrequency]);

  const [employees, setEmployees] = useState(initialEmployees);

  const updateEmployee = (id, field, value) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      const updated = { ...emp, [field]: value };

      // Revalidate flags
      const flags = [];
      if (!updated.name) flags.push('Missing name');
      if (field === 'filingStatus') {
        updated.filingStatusWarning = !['Single', 'MFJ', 'HoH'].includes(value);
        if (updated.filingStatusWarning) flags.push(`Unknown filing status: "${value}"`);
      }
      if (updated.annualGross <= 0) flags.push('$0 wages');
      updated.flags = flags;

      return updated;
    }));
  };

  const flaggedCount = employees.filter(e => e.flags.length > 0).length;

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-[#1A395C] mb-2">Review Employee Data</h2>
      <div className="flex gap-4 text-sm text-gray-600 mb-6">
        <span>{employees.length} employees</span>
        {flaggedCount > 0 && (
          <span className="text-yellow-600 font-medium">{flaggedCount} with warnings</span>
        )}
      </div>

      <div className="border rounded-xl overflow-auto max-h-[500px]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1A395C] text-white sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Filing Status</th>
              <th className="px-3 py-2 text-left font-medium">Pay Type</th>
              <th className="px-3 py-2 text-right font-medium">Annual Gross</th>
              <th className="px-3 py-2 text-right font-medium">Pre-Tax Ded.</th>
              <th className="px-3 py-2 text-center font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr
                key={emp.id}
                className={`border-b ${
                  emp.flags.length > 0 ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={emp.name}
                    onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)}
                    className="w-full px-1 py-0.5 border border-transparent hover:border-gray-300 focus:border-[#1A395C] rounded outline-none text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={emp.filingStatus}
                    onChange={(e) => updateEmployee(emp.id, 'filingStatus', e.target.value)}
                    className={`px-1 py-0.5 border rounded outline-none text-sm ${
                      emp.filingStatusWarning ? 'border-yellow-400 bg-yellow-50' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <option value="Single">Single</option>
                    <option value="MFJ">MFJ</option>
                    <option value="HoH">HoH</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={emp.payType}
                    onChange={(e) => updateEmployee(emp.id, 'payType', e.target.value)}
                    className="px-1 py-0.5 border border-transparent hover:border-gray-300 rounded outline-none text-sm"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Hourly">Hourly</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    value={emp.annualGross}
                    onChange={(e) => updateEmployee(emp.id, 'annualGross', parseFloat(e.target.value) || 0)}
                    className="w-28 px-1 py-0.5 border border-transparent hover:border-gray-300 focus:border-[#1A395C] rounded outline-none text-sm text-right"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    value={emp.existingPreTaxDeductions}
                    onChange={(e) => updateEmployee(emp.id, 'existingPreTaxDeductions', parseFloat(e.target.value) || 0)}
                    className="w-28 px-1 py-0.5 border border-transparent hover:border-gray-300 focus:border-[#1A395C] rounded outline-none text-sm text-right"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  {emp.flags.length > 0 && (
                    <span className="text-yellow-600 cursor-help" title={emp.flags.join('; ')}>
                      ⚠️ {emp.flags.length}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={() => onNext(employees)}
          className="px-6 py-2.5 rounded-lg font-medium bg-[#1A395C] text-white hover:bg-[#142d49] transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
