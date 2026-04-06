import {
  SIMRP_PREMIUM_ANNUAL, SIMRP_PREMIUM_MONTHLY,
  FICA_RATE, MEDICARE_RATE, SS_WAGE_BASE,
  ER_FEE_MONTHLY,
} from './constants.js';

/**
 * Calculate employee FICA savings.
 */
export function calculateEEFicaSavings(annualGross, companyType) {
  if (companyType === 'Non-FICA') {
    // Non-FICA: Medicare only (1.45%)
    return {
      annualFicaSavings: SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE,
      monthlyFicaSavings: (SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE) / 12,
      rateUsed: MEDICARE_RATE,
    };
  }

  // FICA-School and Private: full FICA or blended
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
  const erFee = ER_FEE_MONTHLY[companyType] || ER_FEE_MONTHLY.Private;

  if (companyType === 'Non-FICA') {
    // Non-FICA: Medicare only
    const annualSavings = SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE;
    const monthlySavings = annualSavings / 12;
    return {
      annualERSavings: annualSavings,
      monthlyERSavings: monthlySavings,
      annualERFee: erFee * 12,
      monthlyERFee: erFee,
      netAnnualERSavings: annualSavings - (erFee * 12),
      netMonthlyERSavings: monthlySavings - erFee,
    };
  }

  // FICA-School and Private: full FICA or blended
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
    annualERFee: erFee * 12,
    monthlyERFee: erFee,
    netAnnualERSavings: annualSavings - (erFee * 12),
    netMonthlyERSavings: monthlySavings - erFee,
  };
}
