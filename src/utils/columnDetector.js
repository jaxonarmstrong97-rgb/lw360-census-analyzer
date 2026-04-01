const FIELD_PATTERNS = {
  name: [
    /^(employee\s*)?name$/i,
    /^(first\s*&?\s*last|full\s*name)$/i,
    /^employee$/i,
    /^emp\s*name$/i,
  ],
  firstName: [
    /^first\s*name$/i,
    /^first$/i,
    /^fname$/i,
  ],
  lastName: [
    /^last\s*name$/i,
    /^last$/i,
    /^lname$/i,
    /^surname$/i,
  ],
  filingStatus: [
    /^filing\s*status$/i,
    /^status$/i,
    /^tax\s*status$/i,
    /^filing$/i,
    /^marital/i,
    /^fil\.?\s*stat/i,
  ],
  annualGross: [
    /^(annual\s*)?(gross\s*)?(wage|salary|pay|income|comp)/i,
    /^gross$/i,
    /^annual\s*salary$/i,
    /^salary$/i,
    /^wages$/i,
    /^annual\s*gross$/i,
    /^compensation$/i,
    /^annual\s*pay$/i,
  ],
  payType: [
    /^pay\s*type$/i,
    /^emp(loyee)?\s*type$/i,
    /^hourly\s*\/?\s*salary$/i,
    /^type$/i,
    /^h\s*\/?\s*s$/i,
    /^classification$/i,
    /^wage\s*type$/i,
  ],
  existingDeductions: [
    /^(existing\s*)?(pre[- ]?tax)\s*(deduction|ded)/i,
    /^deduction/i,
    /^health\s*(ins|insurance)/i,
    /^401k/i,
    /^hsa/i,
    /^fsa/i,
    /^dental/i,
    /^vision/i,
    /^medical/i,
    /^benefits?\s*ded/i,
  ],
  department: [
    /^dep(artment|t)$/i,
    /^dept$/i,
    /^division$/i,
  ],
  location: [
    /^location$/i,
    /^office$/i,
    /^site$/i,
    /^campus$/i,
  ],
  jobTitle: [
    /^(job\s*)?title$/i,
    /^position$/i,
    /^role$/i,
    /^job$/i,
  ],
  employeeId: [
    /^(emp(loyee)?\s*)?id$/i,
    /^emp\s*#$/i,
    /^emp\s*no$/i,
    /^employee\s*number$/i,
    /^badge/i,
  ],
};

/**
 * Auto-detect column mappings from header names.
 * Returns { fieldName: columnIndex } for detected fields.
 */
export function detectColumns(headers) {
  const mappings = {};
  const usedIndices = new Set();

  // Priority order: required fields first
  const fieldOrder = [
    'name', 'firstName', 'lastName', 'filingStatus',
    'annualGross', 'payType', 'existingDeductions',
    'department', 'location', 'jobTitle', 'employeeId',
  ];

  for (const field of fieldOrder) {
    const patterns = FIELD_PATTERNS[field];
    for (let i = 0; i < headers.length; i++) {
      if (usedIndices.has(i)) continue;
      const header = String(headers[i]).trim();
      if (!header) continue;

      for (const pattern of patterns) {
        if (pattern.test(header)) {
          mappings[field] = i;
          usedIndices.add(i);
          break;
        }
      }
      if (mappings[field] !== undefined) break;
    }
  }

  return mappings;
}

/**
 * Normalize filing status abbreviations.
 */
export function normalizeFilingStatus(value) {
  if (!value) return 'Single';
  const v = String(value).trim().toUpperCase();

  if (['S', 'SINGLE'].includes(v)) return 'Single';
  if (['M', 'MFJ', 'MARRIED', 'MARRIED FILING JOINTLY', 'MARRIED FILING JOINT'].includes(v)) return 'MFJ';
  if (['HOH', 'HH', 'HEAD OF HOUSEHOLD', 'HEAD'].includes(v)) return 'HoH';

  return null; // Unknown — will be flagged
}

/**
 * Normalize pay type.
 */
export function normalizePayType(value) {
  if (!value) return 'Salary';
  const v = String(value).trim().toUpperCase();

  if (['H', 'HOURLY', 'HOUR'].includes(v)) return 'Hourly';
  if (['S', 'SALARY', 'SALARIED', 'SAL'].includes(v)) return 'Salary';

  return 'Salary'; // Default
}

/**
 * Parse a numeric value from various formats.
 */
export function parseNumericValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  // Remove currency symbols, commas, spaces
  const cleaned = String(value).replace(/[$,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
