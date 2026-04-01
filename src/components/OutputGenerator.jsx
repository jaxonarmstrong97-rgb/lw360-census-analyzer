import { useState, useCallback } from 'react';
import { calculateAllEmployees } from '../engine/benefitCalculator';
import { generateEligibilityReport } from '../pdf/eligibilityReport';
import { generatePaycheckComparisons, generateIndividualPaychecks } from '../pdf/paycheckComparison';
import { formatCurrency, formatPercent } from '../utils/formatters';
import JSZip from 'jszip';

export default function OutputGenerator({ employees, companySetup, onBack }) {
  const [genEligibility, setGenEligibility] = useState(true);
  const [genPaychecks, setGenPaychecks] = useState(true);
  const [genRawData, setGenRawData] = useState(false);
  const [paycheckMode, setPaycheckMode] = useState('combined'); // combined | individual
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [downloads, setDownloads] = useState([]);

  const { companyName, companyType, payFrequency, reportDate } = companySetup;

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setProgress(0);
    setDownloads([]);

    try {
      // Run calculations
      setProgress(10);
      const calcResults = calculateAllEmployees(employees, companyType, payFrequency);
      setResults(calcResults);
      setProgress(30);

      const newDownloads = [];

      // Generate eligibility report
      if (genEligibility) {
        setProgress(40);
        const eligDoc = generateEligibilityReport(calcResults, companyName, companyType, payFrequency, reportDate);
        const eligBlob = eligDoc.output('blob');
        newDownloads.push({
          name: `${companyName.replace(/\s+/g, '_')}_Eligibility_Report.pdf`,
          url: URL.createObjectURL(eligBlob),
          type: 'Eligibility Report',
        });
        setProgress(60);
      }

      // Generate paycheck comparisons
      if (genPaychecks && calcResults.qualified.length > 0) {
        setProgress(65);
        if (paycheckMode === 'combined') {
          const pcDoc = generatePaycheckComparisons(calcResults.qualified, companyName, payFrequency);
          const pcBlob = pcDoc.output('blob');
          newDownloads.push({
            name: `${companyName.replace(/\s+/g, '_')}_Paycheck_Comparisons.pdf`,
            url: URL.createObjectURL(pcBlob),
            type: 'Paycheck Comparisons (Combined)',
          });
        } else {
          // Individual PDFs zipped
          const pdfs = generateIndividualPaychecks(calcResults.qualified, companyName, payFrequency);
          const zip = new JSZip();
          pdfs.forEach(({ name, doc }) => {
            zip.file(name, doc.output('arraybuffer'));
          });
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          newDownloads.push({
            name: `${companyName.replace(/\s+/g, '_')}_Paycheck_Comparisons.zip`,
            url: URL.createObjectURL(zipBlob),
            type: 'Paycheck Comparisons (Individual, Zipped)',
          });
        }
        setProgress(85);
      }

      // Generate raw data export
      if (genRawData) {
        setProgress(90);
        const csvContent = generateRawCSV(calcResults.results);
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        newDownloads.push({
          name: `${companyName.replace(/\s+/g, '_')}_Raw_Data.csv`,
          url: URL.createObjectURL(csvBlob),
          type: 'Raw Calculation Data (CSV)',
        });
      }

      setDownloads(newDownloads);
      setProgress(100);
    } catch (err) {
      console.error('Generation error:', err);
      alert('Error generating reports: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }, [employees, companyName, companyType, payFrequency, reportDate, genEligibility, genPaychecks, genRawData, paycheckMode]);

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-[#1A395C] mb-6">Generate Reports</h2>

      {/* Output options */}
      <div className="bg-white border rounded-xl p-6 mb-6 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={genEligibility}
            onChange={(e) => setGenEligibility(e.target.checked)}
            className="w-4 h-4 text-[#1A395C] rounded"
          />
          <span className="text-sm font-medium">Generate Eligibility Analysis Report (PDF)</span>
        </label>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={genPaychecks}
              onChange={(e) => setGenPaychecks(e.target.checked)}
              className="w-4 h-4 text-[#1A395C] rounded"
            />
            <span className="text-sm font-medium">Generate Paycheck Comparisons (PDF)</span>
          </label>
          {genPaychecks && (
            <div className="ml-7 mt-2 flex gap-4">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="paycheckMode"
                  value="combined"
                  checked={paycheckMode === 'combined'}
                  onChange={() => setPaycheckMode('combined')}
                />
                Combined PDF
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="paycheckMode"
                  value="individual"
                  checked={paycheckMode === 'individual'}
                  onChange={() => setPaycheckMode('individual')}
                />
                Individual PDFs (zipped)
              </label>
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={genRawData}
            onChange={(e) => setGenRawData(e.target.checked)}
            className="w-4 h-4 text-[#1A395C] rounded"
          />
          <span className="text-sm font-medium">Export Raw Calculation Data (CSV)</span>
        </label>
      </div>

      {/* Generate button */}
      {!generating && downloads.length === 0 && (
        <button
          onClick={handleGenerate}
          disabled={!genEligibility && !genPaychecks && !genRawData}
          className="w-full py-3 rounded-lg font-semibold text-white bg-[#1A395C] hover:bg-[#142d49] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Generate Reports
        </button>
      )}

      {/* Progress */}
      {generating && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Generating...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-[#1A395C] h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results summary */}
      {results && !generating && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-green-800 mb-4">Analysis Complete</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Employees:</span>
              <span className="ml-2 font-semibold">{results.aggregates.totalEmployees}</span>
            </div>
            <div>
              <span className="text-gray-600">Qualified:</span>
              <span className="ml-2 font-semibold text-green-700">{results.aggregates.totalQualified}</span>
            </div>
            <div>
              <span className="text-gray-600">Ineligible:</span>
              <span className="ml-2 font-semibold text-red-600">{results.aggregates.totalIneligible}</span>
            </div>
            <div>
              <span className="text-gray-600">Qualification Rate:</span>
              <span className="ml-2 font-semibold">{formatPercent(results.aggregates.qualificationRate)}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Annual EE Benefit:</span>
              <span className="ml-2 font-semibold">{formatCurrency(results.aggregates.totalAnnualEEBenefit)}</span>
            </div>
            <div>
              <span className="text-gray-600">Net Annual ER Savings:</span>
              <span className="ml-2 font-semibold">{formatCurrency(results.aggregates.totalNetAnnualERSavings)}</span>
            </div>
            <div>
              <span className="text-gray-600">Avg Monthly Benefit:</span>
              <span className="ml-2 font-semibold">{formatCurrency(results.aggregates.averageMonthlyBenefit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Downloads */}
      {downloads.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold text-[#1A395C]">Downloads</h3>
          {downloads.map((dl, i) => (
            <a
              key={i}
              href={dl.url}
              download={dl.name}
              className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">📄</span>
              <div>
                <div className="font-medium text-[#1A395C]">{dl.name}</div>
                <div className="text-xs text-gray-500">{dl.type}</div>
              </div>
              <span className="ml-auto text-sm text-[#1A395C] font-medium">Download ↓</span>
            </a>
          ))}

          <button
            onClick={() => { setDownloads([]); setResults(null); setProgress(0); }}
            className="mt-4 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Generate Again
          </button>
        </div>
      )}

      <div className="mt-8 flex justify-start">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

function generateRawCSV(results) {
  const headers = [
    'Employee Name', 'Filing Status', 'Pay Type', 'Annual Gross Wages',
    'Existing Pre-Tax Deductions', 'Taxable Income Before', 'Taxable Income After',
    'Annual FIT Before', 'Annual FIT After', 'Annual FIT Savings', 'Monthly FIT Savings',
    'Annual FICA Savings', 'Monthly FICA Savings',
    'Monthly EE Fee', 'Buffer Applied', 'Monthly Net Benefit', 'Annual Net Benefit',
    'Annual ER Savings', 'Monthly ER Fee', 'Net Annual ER Savings',
    'Eligible', 'Reason',
  ];

  const rows = results.map(r => [
    r.name, r.filingStatus, r.payType, r.annualGross,
    r.existingPreTaxDeductions, r.taxableIncomeBefore, r.taxableIncomeAfter,
    r.annualFITBefore, r.annualFITAfter, r.annualFITSavings, r.monthlyFITSavings,
    r.annualFICASavings, r.monthlyFICASavings,
    r.monthlyEEFee, r.bufferApplied ? 'Y' : 'N', r.monthlyBenefit, r.annualBenefit,
    r.annualERSavings, r.monthlyERFee, r.netAnnualERSavings,
    r.eligible ? 'Yes' : 'No', r.eligibilityReason,
  ]);

  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}
