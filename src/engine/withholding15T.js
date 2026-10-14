// Federal income tax withholding: IRS Publication 15-T (2026), Worksheet 1A, with the annual
// percentage method tables for automated payroll systems.
//
// This is the same engine as the LW360 Benefit Analysis (lw360-benefit-analysis skill,
// scripts/engine.py), which reproduces district payroll withholding to the cent. It replaces
// the analyzer's old annual bracket calculation and its retired $5 hourly buffer
// (2026-10-13). Census files rarely carry W-4 detail, so an employee is treated as a
// 2020-or-later W-4 with the Step 2 box unchecked and no Step 3 or Step 4 entries unless the
// census supplies them.

// Rows are [at least, tentative amount, rate].
export const STANDARD = { // Step 2 box not checked, and all pre-2020 forms
  M: [[0, 0, 0], [19300, 0, 0.10], [44100, 2480, 0.12], [120100, 11600, 0.22], [230700, 35932, 0.24], [422850, 82048, 0.32], [531750, 116896, 0.35], [788000, 206583.50, 0.37]],
  S: [[0, 0, 0], [7500, 0, 0.10], [19900, 1240, 0.12], [57900, 5800, 0.22], [113200, 17966, 0.24], [209275, 41024, 0.32], [263725, 58448, 0.35], [648100, 192979.25, 0.37]],
  H: [[0, 0, 0], [15550, 0, 0.10], [33250, 1770, 0.12], [83000, 7740, 0.22], [121250, 16155, 0.24], [217300, 39207, 0.32], [271750, 56631, 0.35], [656150, 191171, 0.37]],
};
export const STEP2_CHECKED = { // Form W-4 Step 2 box checked
  M: [[0, 0, 0], [16100, 0, 0.10], [28500, 1240, 0.12], [66500, 5800, 0.22], [121800, 17966, 0.24], [217875, 41024, 0.32], [272325, 58448, 0.35], [400450, 103291.75, 0.37]],
  S: [[0, 0, 0], [8050, 0, 0.10], [14250, 620, 0.12], [33250, 2900, 0.22], [60900, 8983, 0.24], [108938, 20512, 0.32], [136163, 29224, 0.35], [328350, 96489.63, 0.37]],
  H: [[0, 0, 0], [12075, 0, 0.10], [20925, 885, 0.12], [45800, 3870, 0.22], [64925, 8077.50, 0.24], [112950, 19603.50, 0.32], [140175, 28315.50, 0.35], [332375, 95585.50, 0.37]],
};
export const LINE_1G = { M: 12900, S: 8600, H: 8600 }; // 2020-or-later form, Step 2 box not checked
export const ALLOWANCE = 4300;
export const CHILD_CREDIT = 2200;
export const OTHER_DEP_CREDIT = 500;

// Round half up to cents the way payroll systems do. Binary floating point stores 178.685 as
// 178.68499999..., so the value is first trimmed to 15 significant digits; a tie then rounds
// up (away from zero), matching Python's Decimal ROUND_HALF_UP in the Benefit Analysis.
export function cents(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  const scaled = Number((Math.abs(n) * 100).toPrecision(15));
  return (Math.sign(n) * Math.round(scaled)) / 100;
}

function table(w4) {
  return (w4.new !== false && w4.step2 ? STEP2_CHECKED : STANDARD)[w4.status] || STANDARD.S;
}

// The adjusted annual wage amount of Worksheet 1A (before the table is applied).
export function adjustedAnnualWage(taxableWagesPerPeriod, w4, periods) {
  const annual = cents(cents(taxableWagesPerPeriod) * periods) + Number(w4.otherIncome || 0) - Number(w4.deductions || 0);
  let adjusted;
  if (w4.new === false) adjusted = annual - Number(w4.allowances || 0) * ALLOWANCE;
  else if (w4.step2) adjusted = annual;
  else adjusted = annual - (LINE_1G[w4.status] ?? LINE_1G.S);
  return Math.max(cents(adjusted), 0);
}

function tableRow(adjusted, rows) {
  let row = rows[0];
  for (const r of rows) {
    if (adjusted >= r[0]) row = r;
    else break;
  }
  return row;
}

// The bracket rate that applies to an adjusted annual wage (for display and grouping).
export function marginalRate(taxableWagesPerPeriod, w4, periods) {
  return tableRow(adjustedAnnualWage(taxableWagesPerPeriod, w4, periods), table(w4))[2];
}

// Federal income tax withheld for one pay period.
// w4: { status: 'S' | 'M' | 'H', new (false only for a pre-2020 form), step2, otherIncome (4a),
//       deductions (4b), children, otherDeps or otherCredit (Step 3), allowances (pre-2020) }
export function fitPerPeriod(taxableWagesPerPeriod, w4 = {}, periods = 12) {
  const a = adjustedAnnualWage(taxableWagesPerPeriod, w4, periods);
  const row = tableRow(a, table(w4));
  const tentativeAnnual = cents(row[1] + (a - row[0]) * row[2]);
  const credit = w4.new === false ? 0
    : Number(w4.children || 0) * CHILD_CREDIT + Number(w4.otherDeps || 0) * OTHER_DEP_CREDIT + Number(w4.otherCredit || 0);
  const perPeriod = cents(tentativeAnnual / periods);
  return Math.max(cents(perPeriod - cents(credit / periods)), 0);
}
