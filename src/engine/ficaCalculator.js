import {
  SIMRP_PREMIUM_MONTHLY, SIMRP_PREMIUM_ANNUAL,
  FICA_RATE, SS_RATE, MEDICARE_RATE, SS_WAGE_BASE,
} from './constants.js';
import { cents } from './withholding15T.js';

// Payroll tax (FICA) savings on the premium, for one pay period. Employee and employer save
// the same amount: Social Security 6.2% and Medicare 1.45% each.
//
// Social Security uses the exact wage-base method (2026-10-13, replacing the blended method):
// Social Security is owed on wages up to the wage base, so the saving is 6.2% of
// (the lesser of wages and the base, minus the lesser of wages less the premium and the base).
// Anyone still above the base after the premium pays the same Social Security for the year
// either way and saves Medicare only. The blended method (months to the cap at 7.65%, the rest
// at 1.45%) overstated that. Below the base the result is the full 7.65%, as before.

export function annualSocialSecuritySavings(ficaWagesAnnual) {
  const wages = Math.max(0, Number(ficaWagesAnnual) || 0);
  return SS_RATE * (Math.min(wages, SS_WAGE_BASE) - Math.min(Math.max(wages - SIMRP_PREMIUM_ANNUAL, 0), SS_WAGE_BASE));
}

// Returns { total, socialSecurity, medicare } per pay period, in cents. Non-FICA employers
// (TRS districts) pay Medicare only.
export function payrollTaxSavingsPerPeriod(ficaWagesAnnual, companyType, periods) {
  const premium = cents((SIMRP_PREMIUM_MONTHLY * 12) / periods);
  const medicare = cents(premium * MEDICARE_RATE);
  if (companyType === 'Non-FICA') return { total: medicare, socialSecurity: 0, medicare };
  // Same rounding as the Benefit Analysis below the base: 7.65% of the premium, rounded once.
  const total = ficaWagesAnnual <= SS_WAGE_BASE
    ? cents(premium * FICA_RATE)
    : cents(annualSocialSecuritySavings(ficaWagesAnnual) / periods + premium * MEDICARE_RATE);
  return { total, socialSecurity: cents(total - medicare), medicare };
}
