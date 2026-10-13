// Full program test (Jaxon's rule, 2026-10-12, the same as the Benefit Analysis): an employee
// is in the full program when the premium fits in their taxable pay and the net benefit is
// above zero, so the paycheck does not go down. Otherwise they get the wellness benefits only.
//
// What that means by employer type:
// - Non-FICA (TRS districts): Medicare alone saves $17.01 a month, short of the fee, so an
//   employee with no federal withholding is never in the full program.
// - FICA-paying districts and private employers: 7.65% of the premium ($89.73 a month) covers
//   the $89 fee, so an employee with no federal withholding is in the full program as long as
//   the net is above zero. (Before 2026-10-12 a FICA district treated $0 FIT as ineligible.)

const money = (v) => `$${Number(v).toFixed(2)}`;

export function checkEligibility({ fits, fitSavings, taxSavings, net, eeFee, companyType }) {
  if (!fits) {
    return { eligible: false, reason: 'Taxable pay is below the premium, so the deduction cannot run' };
  }
  if (net > 0) {
    return {
      eligible: true,
      reason: fitSavings > 0 ? 'Net benefit above zero' : 'No federal withholding; payroll tax savings cover the fee',
    };
  }
  if (fitSavings <= 0) {
    return {
      eligible: false,
      reason: companyType === 'Non-FICA'
        ? `No federal withholding; Medicare savings alone (${money(taxSavings)} a pay period) are below the ${money(eeFee)} fee`
        : `No federal withholding; payroll tax savings (${money(taxSavings)} a pay period) do not exceed the ${money(eeFee)} fee`,
    };
  }
  return {
    eligible: false,
    reason: `Savings (${money(fitSavings + taxSavings)} a pay period) do not exceed the ${money(eeFee)} fee`,
  };
}
