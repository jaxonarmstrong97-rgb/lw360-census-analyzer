// 2026 Tax Constants and Program Parameters

export const SIMRP_PREMIUM_MONTHLY = 1173.00;
export const SIMRP_PREMIUM_ANNUAL = 14076.00;

export const STANDARD_DEDUCTION = {
  Single: 16100,
  MFJ: 32200,
  HoH: 24150,
};

export const SS_WAGE_BASE = 184500;
export const MAX_SS_TAX = 11439;
export const FICA_RATE = 0.0765;
export const SS_RATE = 0.062;
export const MEDICARE_RATE = 0.0145;

export const TAX_BRACKETS = {
  Single: [
    { min: 0, max: 12400, rate: 0.10 },
    { min: 12400, max: 50400, rate: 0.12 },
    { min: 50400, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
  MFJ: [
    { min: 0, max: 24800, rate: 0.10 },
    { min: 24800, max: 100800, rate: 0.12 },
    { min: 100800, max: 211400, rate: 0.22 },
    { min: 211400, max: 403550, rate: 0.24 },
    { min: 403550, max: 512450, rate: 0.32 },
    { min: 512450, max: 1281200, rate: 0.35 },
    { min: 1281200, max: Infinity, rate: 0.37 },
  ],
  HoH: [
    { min: 0, max: 17700, rate: 0.10 },
    { min: 17700, max: 67050, rate: 0.12 },
    { min: 67050, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
};

export const PAY_PERIODS = {
  Weekly: 52,
  Biweekly: 26,
  'Semi-Monthly': 24,
  Monthly: 12,
};

export const EE_FEE_MONTHLY = {
  'Non-FICA': 80,
  'FICA-School': 89,
  Private: 89,
};

export const ER_FEE_MONTHLY = {
  'Non-FICA': 11,
  'FICA-School': 25,
  Private: 40,
};

/**
 * Get the per-period EE fee for a given company type and pay frequency.
 */
export function getEEFeePerPeriod(companyType, payFrequency) {
  const monthly = EE_FEE_MONTHLY[companyType] || EE_FEE_MONTHLY.Private;
  const periods = PAY_PERIODS[payFrequency] || 12;
  return (monthly * 12) / periods;
}

export const BUFFER_AMOUNT = 5.00; // Monthly buffer for hourly employees
