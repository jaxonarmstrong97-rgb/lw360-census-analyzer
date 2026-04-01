import { useState } from 'react';
import ProgressBar from './components/ProgressBar';
import CompanySetup from './components/CompanySetup';
import FileUpload from './components/FileUpload';
import ColumnMapper from './components/ColumnMapper';
import DataReview from './components/DataReview';
import OutputGenerator from './components/OutputGenerator';

export default function App() {
  const [step, setStep] = useState(1);
  const [companySetup, setCompanySetup] = useState({});
  const [fileData, setFileData] = useState(null);
  const [columnConfig, setColumnConfig] = useState(null);
  const [employees, setEmployees] = useState(null);

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
        <ProgressBar currentStep={step} />

        {step === 1 && (
          <CompanySetup
            data={companySetup}
            onNext={(data) => { setCompanySetup(data); setStep(2); }}
          />
        )}

        {step === 2 && (
          <FileUpload
            onNext={(data) => { setFileData(data); setStep(3); }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && fileData && (
          <ColumnMapper
            headers={fileData.headers}
            dataRows={fileData.dataRows}
            onNext={(config) => { setColumnConfig(config); setStep(4); }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && fileData && columnConfig && (
          <DataReview
            dataRows={fileData.dataRows}
            mappings={columnConfig.mappings}
            wageType={columnConfig.wageType}
            deductionType={columnConfig.deductionType}
            payFrequency={companySetup.payFrequency}
            onNext={(emps) => { setEmployees(emps); setStep(5); }}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && employees && (
          <OutputGenerator
            employees={employees}
            companySetup={companySetup}
            onBack={() => setStep(4)}
          />
        )}
      </main>
    </div>
  );
}
