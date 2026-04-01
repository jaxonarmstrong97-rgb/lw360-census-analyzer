import {
  SIMRP_PREMIUM_ANNUAL, SIMRP_PREMIUM_MONTHLY,
  FICA_RATE, MEDICARE_RATE, SS_WAGE_BASE,
  ER_FEE_PRIVATE, ER_FEE_TRS,
} from './constants.js';

/**
 * Calculate employee FICA savings.
 */
export function calculateEEFicaSavings(annualGross, companyType) {
  if (companyType === 'TRS') {
    // TRS: Medicare only
    return {
      annualFicaSavings: SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE,
      monthlyFicaSavings: (SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE) / 12,
      rateUsed: MEDICARE_RATE,
    };
  }

  // Private sector
  if (annualGross > SS_WAGE_BASE) {
    // Above SS wage base: Medicare only
    return {
      annualFicaSavings: SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE,
      monthlyFicaSavings: (SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE) / 12,
      rateUsed: MEDICARE_RATE,
    };
  }

  // Below SS wage base: full FICA
  return {
    annualFicaSavings: SIMRP_PREMIUM_ANNUAL * FICA_RATE,
    monthlyFicaSavings: (SIMRP_PREMIUM_ANNUAL * FICA_RATE) / 12,
    rateUsed: FICA_RATE,
  };
}

/**
 * Calculate employer FICA savings.
 */
export function calculateERFicaSavings(annualGross, companyType) {
  if (companyType === 'TRS') {
    const annualSavings = SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE;
    const monthlySavings = annualSavings / 12;
    return {
      annualERSavings: annualSavings,
      monthlyERSavings: monthlySavings,
      annualERFee: ER_FEE_TRS * 12,
      monthlyERFee: ER_FEE_TRS,
      netAnnualERSavings: annualSavings - (ER_FEE_TRS * 12),
      netMonthlyERSavings: monthlySavings - ER_FEE_TRS,
    };
  }

  // Private sector
  let annualSavings;

  if (annualGross <= SS_WAGE_BASE) {
    annualSavings = SIMRP_PREMIUM_ANNUAL * FICA_RATE;
  } else {
    // Blended method for high earners
    const monthsToCap = (SS_WAGE_BASE / annualGross) * 12;
    const monthsAboveCap = 12 - monthsToCap;
    annualSavings =
      (monthsToCap * SIMRP_PREMIUM_MONTHLY * FICA_RATE) +
      (monthsAboveCap * SIMRP_PREMIUM_MONTHLY * MEDICARE_RATE);
  }

  const monthlySavings = annualSavings / 12;
  return {
    annualERSavings: annualSavings,
    monthlyERSavings: monthlySavings,
    annualERFee: ER_FEE_PRIVATE * 12,
    monthlyERFee: ER_FEE_PRIVATE,
    netAnnualERSavings: annualSavings - (ER_FEE_PRIVATE * 12),
    netMonthlyERSavings: monthlySavings - ER_FEE_PRIVATE,
  };
}
