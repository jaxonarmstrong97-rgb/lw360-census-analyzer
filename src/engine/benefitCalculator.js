import { calculateFITSavings } from './taxCalculator.js';
import { calculateEEFicaSavings, calculateERFicaSavings } from './ficaCalculator.js';
import { checkEligibility } from './eligibility.js';
import {
  EE_FEE_PRIVATE, EE_FEE_MONTHLY_TRS, EE_FEE_MONTHLY_CAP_PRIVATE,
  BUFFER_AMOUNT, PAY_PERIODS,
  SIMRP_PREMIUM_MONTHLY, SIMRP_PREMIUM_ANNUAL,
} from './constants.js';

/**
 * Calculate the monthly employee fee.
 */
function getMonthlyEEFee(companyType, payFrequency) {
  if (companyType === 'TRS') return EE_FEE_MONTHLY_TRS;
  const perPeriodFee = EE_FEE_PRIVATE[payFrequency] || EE_FEE_PRIVATE.Monthly;
  const periods = PAY_PERIODS[payFrequency] || 12;
  const annualFee = perPeriodFee * periods;
  return Math.min(annualFee / 12, EE_FEE_MONTHLY_CAP_PRIVATE);
}

/**
 * Get per-period employee fee.
 */
export function getPerPeriodEEFee(companyType, payFrequency) {
  if (companyType === 'TRS') {
    const periods = PAY_PERIODS[payFrequency] || 12;
    return EE_FEE_MONTHLY_TRS * 12 / periods;
  }
  return EE_FEE_PRIVATE[payFrequency] || EE_FEE_PRIVATE.Monthly;
}

/**
 * Run full benefit calculation for a single employee.
 */
export function calculateEmployeeBenefit(employee, companyType, payFrequency) {
  const {
    annualGross,
    filingStatus,
    payType,
    existingPreTaxDeductions = 0,
  } = employee;

  // FIT savings (before/after bracket method)
  const fitResult = calculateFITSavings(annualGross, filingStatus, existingPreTaxDeductions);

  // FICA savings
  const ficaResult = calculateEEFicaSavings(annualGross, companyType);

  // ER savings
  const erResult = calculateERFicaSavings(annualGross, companyType);

  // Eligibility
  const eligibility = checkEligibility(fitResult.monthlyFITSavings, ficaResult.monthlyFicaSavings, companyType);

  // Monthly EE fee
  const monthlyEEFee = getMonthlyEEFee(companyType, payFrequency);

  // Buffer: only for hourly employees
  const isHourly = payType && payType.toLowerCase().startsWith('h');
  const bufferApplied = isHourly;
  const bufferAmount = bufferApplied ? BUFFER_AMOUNT : 0;

  // Monthly benefit
  const monthlyBenefitPreBuffer = fitResult.monthlyFITSavings + ficaResult.monthlyFicaSavings - monthlyEEFee;
  const monthlyBenefit = monthlyBenefitPreBuffer - bufferAmount;
  const annualBenefit = monthlyBenefit * 12;

  // Per-period amounts
  const periods = PAY_PERIODS[payFrequency] || 12;
  const perPeriodGross = annualGross / periods;
  const perPeriodPremium = SIMRP_PREMIUM_ANNUAL / periods;
  const perPeriodEEFee = getPerPeriodEEFee(companyType, payFrequency);
  const perPeriodExistingDeductions = existingPreTaxDeductions / periods;
  const perPeriodFITBefore = fitResult.fitBefore / periods;
  const perPeriodFITAfter = fitResult.fitAfter / periods;
  const perPeriodFITSavings = fitResult.annualFITSavings / periods;
  const perPeriodFICASavings = ficaResult.annualFicaSavings / periods;

  // SS and Medicare breakdown per period
  const annualSSBefore = Math.min(annualGross - existingPreTaxDeductions, 184500) * 0.062;
  const annualSSAfter = Math.min(annualGross - existingPreTaxDeductions - SIMRP_PREMIUM_ANNUAL, 184500) * 0.062;
  const annualMedicareBefore = (annualGross - existingPreTaxDeductions) * 0.0145;
  const annualMedicareAfter = (annualGross - existingPreTaxDeductions - SIMRP_PREMIUM_ANNUAL) * 0.0145;

  return {
    name: employee.name,
    filingStatus,
    payType: employee.payType,
    annualGross,
    existingPreTaxDeductions,

    // FIT
    taxableIncomeBefore: fitResult.taxableIncomeBefore,
    taxableIncomeAfter: fitResult.taxableIncomeAfter,
    annualFITBefore: fitResult.fitBefore,
    annualFITAfter: fitResult.fitAfter,
    annualFITSavings: fitResult.annualFITSavings,
    monthlyFITSavings: fitResult.monthlyFITSavings,
    marginalRate: fitResult.marginalRateBefore,

    // FICA
    annualFICASavings: ficaResult.annualFicaSavings,
    monthlyFICASavings: ficaResult.monthlyFicaSavings,
    ficaRateUsed: ficaResult.rateUsed,

    // ER
    ...erResult,

    // Fees & benefit
    monthlyEEFee,
    bufferApplied,
    bufferAmount,
    monthlyBenefitPreBuffer,
    monthlyBenefit: eligibility.eligible ? monthlyBenefit : 0,
    annualBenefit: eligibility.eligible ? annualBenefit : 0,

    // Eligibility
    eligible: eligibility.eligible,
    eligibilityReason: eligibility.reason,

    // Per-period breakdown
    periods,
    payFrequency,
    perPeriodGross,
    perPeriodPremium,
    perPeriodReimbursement: perPeriodPremium, // always 100% of premium
    perPeriodEEFee,
    perPeriodExistingDeductions,
    perPeriodFITBefore,
    perPeriodFITAfter,
    perPeriodFITSavings,
    perPeriodFICASavings,
    perPeriodSSBefore: Math.max(0, annualSSBefore) / periods,
    perPeriodSSAfter: Math.max(0, annualSSAfter) / periods,
    perPeriodMedicareBefore: Math.max(0, annualMedicareBefore) / periods,
    perPeriodMedicareAfter: Math.max(0, annualMedicareAfter) / periods,

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
