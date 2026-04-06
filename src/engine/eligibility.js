import { EE_FEE_MONTHLY, MEDICARE_RATE, FICA_RATE, SIMRP_PREMIUM_ANNUAL } from './constants.js';

/**
 * Determine eligibility for the SIMRP program.
 */
export function checkEligibility(monthlyFITSavings, monthlyFICASavings, companyType) {
  const medicareSavingsMonthly = (SIMRP_PREMIUM_ANNUAL * MEDICARE_RATE) / 12;
  const ficaSavingsMonthly = (SIMRP_PREMIUM_ANNUAL * FICA_RATE) / 12;
  const eeFee = EE_FEE_MONTHLY[companyType] || EE_FEE_MONTHLY.Private;

  if (companyType === 'Non-FICA') {
    // Non-FICA: $0 FIT = ineligible. Must have FIT + Medicare > $80/mo fee
    if (monthlyFITSavings <= 0) {
      return {
        eligible: false,
        reason: '$0 FIT — cannot cover $80/mo fee with only Medicare savings',
      };
    }
    if ((monthlyFITSavings + medicareSavingsMonthly) <= eeFee) {
      return {
        eligible: false,
        reason: `Insufficient savings ($${(monthlyFITSavings + medicareSavingsMonthly).toFixed(2)}/mo) to cover $${eeFee}/mo fee`,
      };
    }
    return { eligible: true, reason: 'Qualified' };
  }

  if (companyType === 'FICA-School') {
    // FICA-School: $0 FIT = ineligible. Must have FIT + FICA > $89/mo fee
    if (monthlyFITSavings <= 0) {
      return {
        eligible: false,
        reason: '$0 FIT — cannot cover $89/mo fee with only FICA savings',
      };
    }
    if ((monthlyFITSavings + ficaSavingsMonthly) <= eeFee) {
      return {
        eligible: false,
        reason: `Insufficient savings ($${(monthlyFITSavings + ficaSavingsMonthly).toFixed(2)}/mo) to cover $${eeFee}/mo fee`,
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
