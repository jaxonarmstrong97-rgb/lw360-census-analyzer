import { fitPerPeriod, adjustedAnnualWage, marginalRate, cents } from './withholding15T.js';
import { payrollTaxSavingsPerPeriod } from './ficaCalculator.js';
import { checkEligibility } from './eligibility.js';
import {
  EE_FEE_MONTHLY, ER_FEE_MONTHLY, getEEFeePerPeriod, PAY_PERIODS,
  SIMRP_PREMIUM_MONTHLY, SIMRP_PREMIUM_ANNUAL, SS_RATE, MEDICARE_RATE, SS_WAGE_BASE,
} from './constants.js';

/**
 * Calculate the monthly employee fee.
 */
function getMonthlyEEFee(companyType) {
  return EE_FEE_MONTHLY[companyType] || EE_FEE_MONTHLY.Private;
}

/**
 * Get per-period employee fee.
 */
export function getPerPeriodEEFee(companyType, payFrequency) {
  return getEEFeePerPeriod(companyType, payFrequency);
}

const W4_STATUS = { Single: 'S', MFJ: 'M', HoH: 'H' };

/**
 * Run the full benefit calculation for one employee.
 *
 * Since 2026-10-13 this is the Benefit Analysis method, per pay period: federal withholding
 * from IRS Publication 15-T before and after the premium (withholding15T.js), payroll tax
 * savings with the exact Social Security wage-base method, the fee for the pay period, and the
 * full-program test (premium fits, net above zero). There is no buffer. Monthly and annual
 * figures are the per-period figures times the pay periods in a year.
 */
export function calculateEmployeeBenefit(employee, companyType, payFrequency) {
  const {
    annualGross,
    filingStatus,
    existingPreTaxDeductions = 0,
  } = employee;

  const periods = PAY_PERIODS[payFrequency] || 12;
  // Census files rarely carry W-4 detail: assume a 2020-or-later form with Step 2 unchecked and
  // no Step 3 or 4 entries, unless the employee record supplies a w4 object.
  const w4 = { status: W4_STATUS[filingStatus] || 'S', ...(employee.w4 || {}) };

  // Federal taxable wages; also used as the payroll tax wages (the census doesn't separate them).
  const taxableAnnual = Math.max(0, annualGross - existingPreTaxDeductions);
  const wages = cents(taxableAnnual / periods);
  const premium = cents((SIMRP_PREMIUM_MONTHLY * 12) / periods);
  const fits = wages >= premium;

  // Federal income tax withholding, before and after the premium.
  const fitBefore = fitPerPeriod(wages, w4, periods);
  const fitAfter = fitPerPeriod(Math.max(wages - premium, 0), w4, periods);
  const fitSavings = fits ? cents(fitBefore - fitAfter) : 0;

  // Payroll tax savings (the employer saves the same amount).
  const tax = fits ? payrollTaxSavingsPerPeriod(taxableAnnual, companyType, periods) : { total: 0, socialSecurity: 0, medicare: 0 };
  const eeFee = getEEFeePerPeriod(companyType, payFrequency);
  const net = cents(fitSavings + tax.total - eeFee);

  const eligibility = checkEligibility({ fits, fitSavings, taxSavings: tax.total, net, eeFee, companyType });

  const perYear = (v) => cents(v * periods);
  const perMonth = (v) => cents((v * periods) / 12);

  // Paycheck lines. "After" is "before" less the engine's savings, so the paycheck comparison
  // adds up to exactly the net benefit.
  const ssBefore = companyType === 'Non-FICA' ? 0 : cents((Math.min(taxableAnnual, SS_WAGE_BASE) * SS_RATE) / periods);
  const medicareBefore = cents(wages * MEDICARE_RATE);

  // Employer: the same payroll tax savings, less the employer fee. No employee shows negative
  // employer savings (LW360 rule), so the net is floored at zero per employee.
  const erFee = ER_FEE_MONTHLY[companyType] || ER_FEE_MONTHLY.Private;
  const annualERSavings = perYear(tax.total);
  const netAnnualERSavings = Math.max(0, cents(annualERSavings - erFee * 12));

  return {
    name: employee.name,
    filingStatus,
    payType: employee.payType,
    annualGross,
    existingPreTaxDeductions,

    // Federal income tax (annual figures are per period times the pay periods)
    taxableIncomeBefore: adjustedAnnualWage(wages, w4, periods),
    taxableIncomeAfter: adjustedAnnualWage(Math.max(wages - premium, 0), w4, periods),
    annualFITBefore: perYear(fitBefore),
    annualFITAfter: perYear(fitAfter),
    annualFITSavings: perYear(fitSavings),
    monthlyFITSavings: perMonth(fitSavings),
    marginalRate: marginalRate(wages, w4, periods),

    // Payroll tax (FICA)
    annualFICASavings: perYear(tax.total),
    monthlyFICASavings: perMonth(tax.total),
    ficaRateUsed: companyType === 'Non-FICA' ? MEDICARE_RATE : (tax.socialSecurity > 0 ? SS_RATE + MEDICARE_RATE : MEDICARE_RATE),

    // Employer
    annualERSavings,
    monthlyERSavings: perMonth(tax.total),
    annualERFee: erFee * 12,
    monthlyERFee: erFee,
    netAnnualERSavings,
    netMonthlyERSavings: cents(netAnnualERSavings / 12),

    // Fees & benefit (bufferApplied is kept for older exports; there is no buffer)
    monthlyEEFee: getMonthlyEEFee(companyType),
    bufferApplied: false,
    bufferAmount: 0,
    monthlyBenefitPreBuffer: perMonth(net),
    monthlyBenefit: eligibility.eligible ? perMonth(net) : 0,
    annualBenefit: eligibility.eligible ? perYear(net) : 0,

    // Eligibility
    eligible: eligibility.eligible,
    eligibilityReason: eligibility.reason,

    // Per-period breakdown
    periods,
    payFrequency,
    perPeriodGross: annualGross / periods,
    perPeriodPremium: premium,
    perPeriodReimbursement: premium, // always 100% of premium
    perPeriodEEFee: eeFee,
    perPeriodExistingDeductions: existingPreTaxDeductions / periods,
    perPeriodFITBefore: fitBefore,
    perPeriodFITAfter: fits ? fitAfter : fitBefore,
    perPeriodFITSavings: fitSavings,
    perPeriodFICASavings: tax.total,
    perPeriodNetBenefit: net,
    perPeriodSSBefore: ssBefore,
    perPeriodSSAfter: cents(ssBefore - tax.socialSecurity),
    perPeriodMedicareBefore: medicareBefore,
    perPeriodMedicareAfter: cents(medicareBefore - tax.medicare),

    // Premium
    monthlyPremium: SIMRP_PREMIUM_MONTHLY,
    annualPremium: SIMRP_PREMIUM_ANNUAL,
  };
}

/**
 * Run calculations for all employees and return results + aggregates.
 */
export function calculateAllEmployees(employees, companyType, payFrequency) {
  const results = employees.map(emp => calculateEmployeeBenefit(emp, companyType, payFrequency));

  const qualified = results.filter(r => r.eligible);
  const ineligible = results.filter(r => !r.eligible);

  const aggregates = {
    totalEmployees: results.length,
    totalQualified: qualified.length,
    totalIneligible: ineligible.length,
    qualificationRate: results.length > 0 ? (qualified.length / results.length) * 100 : 0,

    totalAnnualFITSavings: qualified.reduce((s, r) => s + r.annualFITSavings, 0),
    totalAnnualFICASavings: qualified.reduce((s, r) => s + r.annualFICASavings, 0),
    totalAnnualEEBenefit: qualified.reduce((s, r) => s + r.annualBenefit, 0),
    totalAnnualERSavings: qualified.reduce((s, r) => s + r.annualERSavings, 0),
    totalAnnualERFees: qualified.reduce((s, r) => s + r.annualERFee, 0),
    totalNetAnnualERSavings: qualified.reduce((s, r) => s + r.netAnnualERSavings, 0),

    averageMonthlyBenefit: qualified.length > 0
      ? qualified.reduce((s, r) => s + r.monthlyBenefit, 0) / qualified.length
      : 0,
  };

  return { results, qualified, ineligible, aggregates };
}
