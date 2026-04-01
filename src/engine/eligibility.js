import { EE_FEE_MONTHLY_TRS, MEDICARE_RATE, SIMRP_PREMIUM_ANNUAL } from './constants.js';

/**
 * Determine eligibility for the SIMRP program.
 */
export function checkEligibility(monthlyFITSavings, monthlyFICASavings, companyType) {
  const medicareSavingsMonthly = (SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE) / 12;

  if (companyType === 'TRS') {
    // TRS: $0 FIT = ineligible. Must have FIT + Medicare > $80/mo fee
    if (monthlyFITSavings <= 0) {
      return {
        eligible: false,
        reason: '$0 FIT — cannot cover $80/mo TRS fee with only Medicare savings',
      };
    }
    if ((monthlyFITSavings + medicareSavingsMonthly) <= EE_FEE_MONTHLY_TRS) {
      return {
        eligible: false,
        reason: `Insufficient savings ($${(monthlyFITSavings + medicareSavingsMonthly).toFixed(2)}/mo) to cover $80/mo TRS fee`,
      };
    }
    return { eligible: true, reason: 'Qualified' };
  }

  // Private sector: ALL employees qualify
  // $0 FIT still qualifies — FICA covers the fee, employee gets wellness benefits
  return {
    eligible: true,
    reason: monthlyFITSavings <= 0 ? 'Qualified — $0 FIT benefit, wellness benefits at no cost' : 'Qualified',
  };
}
