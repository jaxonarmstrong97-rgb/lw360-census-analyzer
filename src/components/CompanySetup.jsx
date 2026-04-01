import { useState } from 'react';

export default function CompanySetup({ data, onNext }) {
  const [companyName, setCompanyName] = useState(data.companyName || '');
  const [companyType, setCompanyType] = useState(data.companyType || 'Private');
  const [payFrequency, setPayFrequency] = useState(data.payFrequency || 'Biweekly');
  const [reportDate, setReportDate] = useState(
    data.reportDate || new Date().toISOString().split('T')[0]
  );

  const canProceed = companyName.trim().length > 0;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-[#1A395C] mb-6">Company Setup</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A395C] focus:border-transparent outline-none"
            placeholder="Enter company name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Type
          </label>
          <div className="flex gap-4">
            {[
              { value: 'Private', label: 'Private Sector' },
              { value: 'TRS', label: 'TX School District (TRS)' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCompanyType(opt.value)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                  companyType === opt.value
                    ? 'border-[#1A395C] bg-[#1A395C] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pay Frequency
          </label>
          <select
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A395C] focus:border-transparent outline-none"
          >
            <option value="Weekly">Weekly</option>
            <option value="Biweekly">Biweekly</option>
            <option value="Semi-Monthly">Semi-Monthly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Date
          </label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A395C] focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() =>
            onNext({ companyName, companyType, payFrequency, reportDate })
          }
          disabled={!canProceed}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            canProceed
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
