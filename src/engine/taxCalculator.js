import { TAX_BRACKETS, STANDARD_DEDUCTION, SIMRP_PREMIUM_ANNUAL } from './constants.js';

/**
 * Calculate Federal Income Tax using bracket method.
 * Walks through each bracket and accumulates tax.
 */
export function calculateFIT(taxableIncome, filingStatus) {
  if (taxableIncome <= 0) return 0;

  const brackets = TAX_BRACKETS[filingStatus];
  if (!brackets) throw new Error(`Unknown filing status: ${filingStatus}`);

  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
  }
  return tax;
}

/**
 * Get the marginal tax rate for a given taxable income.
 */
export function getMarginalRate(taxableIncome, filingStatus) {
  if (taxableIncome <= 0) return 0;
  const brackets = TAX_BRACKETS[filingStatus];
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) {
      return brackets[i].rate;
    }
  }
  return 0;
}

/**
 * Calculate FIT savings using before/after bracket method.
 * NEVER use flat marginal rate × premium.
 */
export function calculateFITSavings(annualGross, filingStatus, existingPreTaxDeductions = 0) {
  const stdDeduction = STANDARD_DEDUCTION[filingStatus] || STANDARD_DEDUCTION.Single;

  // Before: taxable income without SIMRP
  const taxableIncomeBefore = Math.max(0, annualGross - existingPreTaxDeductions - stdDeduction);
  const fitBefore = calculateFIT(taxableIncomeBefore, filingStatus);

  // After: taxable income with SIMRP premium deducted
  const taxableIncomeAfter = Math.max(0, annualGross - existingPreTaxDeductions - SIMRP_PREMIUM_ANNUAL - stdDeduction);
  const fitAfter = calculateFIT(taxableIncomeAfter, filingStatus);

  const annualFITSavings = fitBefore - fitAfter;
  const monthlyFITSavings = annualFITSavings / 12;

  return {
    taxableIncomeBefore,
    taxableIncomeAfter,
    fitBefore,
    fitAfter,
    annualFITSavings,
    monthlyFITSavings,
    marginalRateBefore: getMarginalRate(taxableIncomeBefore, filingStatus),
  };
}
