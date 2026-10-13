// 2026 tax constants and program parameters. Federal withholding tables live in
// withholding15T.js (IRS Publication 15-T).

export const SIMRP_PREMIUM_MONTHLY = 1173.00;
export const SIMRP_PREMIUM_ANNUAL = 14076.00;

export const SS_WAGE_BASE = 184500;
export const FICA_RATE = 0.0765;
export const SS_RATE = 0.062;
export const MEDICARE_RATE = 0.0145;

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
  return Math.round(((monthly * 12) / periods) * 100) / 100; // to the cent: $89 biweekly is $41.08
}

