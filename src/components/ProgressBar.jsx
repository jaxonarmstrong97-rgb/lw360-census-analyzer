const STEPS = [
  'Upload',
  'Confirm',
  'Generate',
];

export default function ProgressBar({ currentStep }) {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isComplete = stepNum < currentStep;
          return (
            <div key={i} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div
                  className={`absolute top-4 -left-1/2 w-full h-0.5 ${
                    isComplete || isActive ? 'bg-[#1A395C]' : 'bg-gray-300'
                  }`}
                  style={{ zIndex: 0 }}
                />
              )}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isComplete
                    ? 'bg-[#1A395C] text-white'
                    : isActive
                    ? 'bg-[#1A395C] text-white ring-4 ring-blue-200'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {isComplete ? '\u2713' : stepNum}
              </div>
              <span
                className={`mt-2 text-xs text-center ${
                  isActive ? 'text-[#1A395C] font-semibold' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
