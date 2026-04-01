import { useState, useMemo } from 'react';
import ProgressBar from './components/ProgressBar';
import FileUpload from './components/FileUpload';
import SmartConfirmation from './components/SmartConfirmation';
import DataReview from './components/DataReview';
import ColumnMapper from './components/ColumnMapper';
import OutputGenerator from './components/OutputGenerator';
import Assistant from './components/Assistant';

export default function App() {
  // New 3-step flow: upload → confirm → generate
  // With optional "adjust" sub-flow that drops into manual column mapping + data review
  const [step, setStep] = useState(1); // 1=Upload, 2=Confirm, 3=Generate
  const [adjustMode, setAdjustMode] = useState(null); // null | 'columns' | 'review'

  // Data flowing through the pipeline
  const [uploadResult, setUploadResult] = useState(null); // { rawData, aiResult, fileName }
  const [companySetup, setCompanySetup] = useState(null);
  const [employees, setEmployees] = useState(null);
  const [calcResults, setCalcResults] = useState(null);

  // For adjust mode
  const [adjustFileData, setAdjustFileData] = useState(null);
  const [adjustColumnConfig, setAdjustColumnConfig] = useState(null);
  const [adjustEmployees, setAdjustEmployees] = useState(null);

  // Handle file upload + AI analysis complete
  const handleAnalysisComplete = (result) => {
    setUploadResult(result);
    setStep(2);
    setAdjustMode(null);
  };

  // Handle "Looks Good" — go straight to generate
  const handleLooksGood = ({ companySetup: cs, employees: emps }) => {
    setCompanySetup(cs);
    setEmployees(emps);
    setStep(3);
  };

  // Handle "Let Me Adjust" — enter manual editing flow
  const handleAdjust = ({ companySetup: cs, fileData, columnConfig, employees: emps }) => {
    setCompanySetup(cs);
    setAdjustFileData(fileData);
    setAdjustColumnConfig(columnConfig);
    setAdjustEmployees(emps);
    setAdjustMode('columns');
  };

  // Effective step for progress bar (adjust mode still shows as step 2)
  const progressStep = adjustMode ? 2 : step;

  // Build context for the AI assistant
  const assistantContext = useMemo(() => {
    const ctx = {};

    if (companySetup) {
      ctx.companyName = companySetup.companyName;
      ctx.companyType = companySetup.companyType;
      ctx.payFrequency = companySetup.payFrequency;
    }

    if (uploadResult) {
      ctx.fileName = uploadResult.fileName;
      ctx.employeeCount = uploadResult.rawData?.length;
      if (uploadResult.aiResult) {
        ctx.aiNotes = uploadResult.aiResult.notes;
        ctx.aiConfidence = uploadResult.aiResult.confidence;
        ctx.aiMappings = JSON.stringify(uploadResult.aiResult.mappings);
      }
      if (uploadResult.rawData) {
        const headerRow = uploadResult.aiResult?.header_row ?? 0;
        const headers = uploadResult.rawData[headerRow];
        const sampleRows = uploadResult.rawData.slice(headerRow + 1, headerRow + 4);
        ctx.sampleData = [
          `Headers: ${(headers || []).map(h => String(h)).join(' | ')}`,
          ...sampleRows.map((row, i) => `Row ${i + 1}: ${row.map(c => String(c ?? '')).join(' | ')}`),
        ].join('\n');
      }
    }

    if (employees) {
      ctx.employeeCount = employees.length;
    }

    if (calcResults) {
      ctx.results = calcResults;
      const details = (calcResults.results || []).slice(0, 10).map(r =>
        `${r.name}: ${r.filingStatus}, ${r.payType}, $${r.annualGross?.toFixed(0)}, benefit=$${r.monthlyBenefit?.toFixed(2)}/mo, ${r.eligible ? 'Qualified' : 'Ineligible: ' + r.eligibilityReason}`
      );
      ctx.employeeDetails = details.join('\n');
    }

    return ctx;
  }, [companySetup, uploadResult, employees, calcResults]);

  // Determine which step label the assistant shows
  const assistantStep = adjustMode === 'columns' ? 3 : adjustMode === 'review' ? 4 : step;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1A395C] text-white py-3 px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-wide">LIVE WELL 360</span>
          <span className="text-xs opacity-70">Census Analyzer</span>
        </div>
        <span className="text-xs opacity-50">Health Strategy Advisors</span>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <ProgressBar currentStep={progressStep} />

        {/* Step 1: Upload */}
        {step === 1 && !adjustMode && (
          <FileUpload
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {/* Step 2: Smart Confirmation */}
        {step === 2 && !adjustMode && uploadResult && (
          <SmartConfirmation
            rawData={uploadResult.rawData}
            aiResult={uploadResult.aiResult}
            fileName={uploadResult.fileName}
            onGenerate={handleLooksGood}
            onAdjust={handleAdjust}
            onBack={() => { setStep(1); setUploadResult(null); }}
          />
        )}

        {/* Adjust Mode: Column Mapper */}
        {adjustMode === 'columns' && adjustFileData && (
          <ColumnMapper
            headers={adjustFileData.headers}
            dataRows={adjustFileData.dataRows}
            onNext={(config) => {
              setAdjustColumnConfig(config);
              setAdjustMode('review');
            }}
            onBack={() => setAdjustMode(null)}
          />
        )}

        {/* Adjust Mode: Data Review */}
        {adjustMode === 'review' && adjustFileData && adjustColumnConfig && (
          <DataReview
            dataRows={adjustFileData.dataRows}
            mappings={adjustColumnConfig.mappings}
            wageType={adjustColumnConfig.wageType}
            deductionType={adjustColumnConfig.deductionType}
            payFrequency={companySetup?.payFrequency || 'Biweekly'}
            onNext={(emps) => {
              setEmployees(emps);
              setAdjustMode(null);
              setStep(3);
            }}
            onBack={() => setAdjustMode('columns')}
          />
        )}

        {/* Step 3: Generate Reports */}
        {step === 3 && !adjustMode && employees && companySetup && (
          <OutputGenerator
            employees={employees}
            companySetup={companySetup}
            onBack={() => {
              if (uploadResult) {
                setStep(2);
              } else {
                setStep(1);
              }
            }}
            onResults={setCalcResults}
          />
        )}
      </main>

      {/* AI Assistant — always visible, context-aware */}
      <Assistant step={assistantStep} context={assistantContext} />
    </div>
  );
}
