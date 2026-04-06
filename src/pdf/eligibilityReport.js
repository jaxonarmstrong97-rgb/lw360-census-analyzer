import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatPercent, formatDate, getPayFrequencyLabel } from '../utils/formatters';
import {
  SIMRP_PREMIUM_MONTHLY, SIMRP_PREMIUM_ANNUAL,
  EE_FEE_MONTHLY_TRS, EE_FEE_MONTHLY_CAP_PRIVATE,
  ER_FEE_PRIVATE, ER_FEE_TRS,
  MEDICARE_RATE, SS_WAGE_BASE, PAY_PERIODS,
} from '../engine/constants';

// ── Brand Colors ──
const NAVY = [26, 57, 92];
const RED = [196, 30, 58];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [245, 245, 245];
const GREEN = [34, 139, 34];
const DARK_RED = [180, 0, 0];
const TEXT_DARK = [40, 40, 40];
const TEXT_MED = [80, 80, 80];
const TEXT_LIGHT = [120, 120, 120];

const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN = 15;

// ── Shared Helpers ──

function addHeader(doc, showConfidential = true) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 22, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LIVE WELL 360', MARGIN, 10);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Health Strategy Advisors', MARGIN, 16);

  if (showConfidential) {
    doc.setFillColor(...RED);
    doc.roundedRect(155, 5, 45, 12, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL', 177.5, 13, { align: 'center' });
  }
}

function addFooter(doc, pageNum, totalPages) {
  const y = 270;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setFontSize(6.5);
  doc.setTextColor(...TEXT_LIGHT);
  doc.text(
    'Live Well 360 Health Strategy Advisors | livewellhealth360.com | (806) 799-1099',
    PAGE_W / 2, y + 4, { align: 'center' }
  );
  if (totalPages) {
    doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, y + 4, { align: 'right' });
  }
}

function addContactBlock(doc, y) {
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Live Well 360 Health Strategy Advisors', MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MED);
  doc.text('Jaxon Armstrong | Business Development', MARGIN, y);
  y += 5;
  doc.text('(806) 559-5224 | jaxon@livewellhsa.com', MARGIN, y);
  y += 5;
  doc.text('6609 Toledo Avenue, Ste. 1, Lubbock, TX', MARGIN, y);
  return y + 8;
}

function drawStatBox(doc, x, y, w, h, value, label, fillColor, valueColor) {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  doc.setFontSize(20);
  doc.setTextColor(...valueColor);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value), x + w / 2, y + h / 2 - 2, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MED);
  doc.text(label, x + w / 2, y + h / 2 + 8, { align: 'center' });
}

function fmtRate(rate) {
  return `${Math.round(rate * 100)}%`;
}

// ══════════════════════════════════════════════════════════════
// PRIVATE SECTOR FORMAT (PBI Style)
// ══════════════════════════════════════════════════════════════

function generatePrivateReport(doc, calcResults, companyName, payFrequency, reportDate) {
  const { results, qualified, ineligible, aggregates } = calcResults;
  const periods = PAY_PERIODS[payFrequency] || 12;

  // Sort: qualified by benefit descending, then ineligible
  const qualifiedSorted = [...qualified].sort((a, b) => b.monthlyBenefit - a.monthlyBenefit);
  const ineligibleSorted = [...ineligible].sort((a, b) => a.name.localeCompare(b.name));
  const allSorted = [...qualifiedSorted, ...ineligibleSorted];

  // Calculate total pages
  const rowsPerPage = 32;
  const employeePages = Math.ceil(allSorted.length / rowsPerPage) || 1;
  const totalPages = 2 + employeePages; // cover + summary + employee pages

  // ── PAGE 1: COVER ──
  addHeader(doc, false);

  doc.setFontSize(32);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, PAGE_W / 2, 80, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MED);
  doc.text('SIMRP Eligibility Analysis', PAGE_W / 2, 100, { align: 'center' });

  doc.setFontSize(11);
  doc.text('Prepared by', PAGE_W / 2, 125, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Live Well 360 LLC', PAGE_W / 2, 135, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MED);
  doc.text(formatDate(reportDate), PAGE_W / 2, 150, { align: 'center' });

  doc.setFillColor(...RED);
  doc.roundedRect(PAGE_W / 2 - 30, 165, 60, 14, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL', PAGE_W / 2, 174, { align: 'center' });

  addFooter(doc, 1, totalPages);

  // ── PAGE 2: COMPANY SUMMARY ──
  doc.addPage();
  addHeader(doc);

  let y = 32;
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Company Summary', MARGIN, y);
  y += 12;

  // Stat boxes row
  const boxW = 40;
  const boxH = 28;
  const gap = 6;
  const totalBoxW = 4 * boxW + 3 * gap;
  const startX = (PAGE_W - totalBoxW) / 2;

  drawStatBox(doc, startX, y, boxW, boxH,
    String(aggregates.totalQualified),
    'Qualified Employees',
    [230, 255, 230], GREEN
  );
  drawStatBox(doc, startX + boxW + gap, y, boxW, boxH,
    formatCurrency(aggregates.totalAnnualEEBenefit),
    'Annual Employee Savings',
    LIGHT_GRAY, NAVY
  );
  drawStatBox(doc, startX + 2 * (boxW + gap), y, boxW, boxH,
    formatCurrency(aggregates.totalNetAnnualERSavings),
    'Annual Employer Savings (Net)',
    LIGHT_GRAY, NAVY
  );
  drawStatBox(doc, startX + 3 * (boxW + gap), y, boxW, boxH,
    `${formatCurrency(aggregates.averageMonthlyBenefit)}/mo`,
    'Avg Employee Benefit',
    [230, 255, 230], GREEN
  );

  y += boxH + 14;

  // Employee Savings Table
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Savings', MARGIN, y);
  y += 3;

  const avgGrossSavings = qualified.length > 0
    ? qualified.reduce((s, r) => s + r.monthlyFITSavings + r.monthlyFICASavings, 0) / qualified.length
    : 0;
  const totalMonthlyGross = qualified.reduce((s, r) => s + r.monthlyFITSavings + r.monthlyFICASavings, 0);
  const avgMonthlyFee = qualified.length > 0
    ? qualified.reduce((s, r) => s + r.monthlyEEFee, 0) / qualified.length
    : 0;
  const totalMonthlyFee = qualified.reduce((s, r) => s + r.monthlyEEFee, 0);

  const eeSavingsData = [
    ['Gross Tax Savings', `${formatCurrency(avgGrossSavings)} / mo`, `${formatCurrency(totalMonthlyGross)} / mo`],
    ['Less: Employee Fee', `(${formatCurrency(avgMonthlyFee)}) / mo`, `(${formatCurrency(totalMonthlyFee)}) / mo`],
    ['Avg Net Employee Benefit', `${formatCurrency(aggregates.averageMonthlyBenefit)} / mo`, `${formatCurrency(aggregates.totalAnnualEEBenefit / 12)} / mo`],
    ['Annual Total', `${formatCurrency(aggregates.averageMonthlyBenefit * 12)} / year`, `${formatCurrency(aggregates.totalAnnualEEBenefit)} / year`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Avg Per Employee', 'All Eligible']],
    body: eeSavingsData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 55, halign: 'right' },
      2: { cellWidth: 55, halign: 'right' },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY + 12;

  // Employer Savings Table
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Employer Savings', MARGIN, y);
  y += 3;

  const erSavingsData = [
    ['Employer FICA Savings', formatCurrency(aggregates.totalAnnualERSavings)],
    [`Less: Employer Fees ($${ER_FEE_PRIVATE}/EE/mo)`, `(${formatCurrency(aggregates.totalAnnualERFees)})`],
    ['Net Employer Savings', formatCurrency(aggregates.totalNetAnnualERSavings)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Employer Impact', 'Annual']],
    body: erSavingsData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [230, 255, 230];
      } else if (data.row.index % 2 === 0) {
        data.cell.styles.fillColor = LIGHT_GRAY;
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Note about SS wage base
  const aboveCap = qualified.filter(r => r.annualGross > SS_WAGE_BASE);
  if (aboveCap.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...TEXT_LIGHT);
    doc.text(
      `Note: ${aboveCap.length} employee${aboveCap.length > 1 ? 's' : ''} exceed the SS wage base ($${SS_WAGE_BASE.toLocaleString()}). Employer savings are annualized (7.65% before cap, 1.45% after). No employee produces a net cost to the employer.`,
      MARGIN, y, { maxWidth: PAGE_W - 2 * MARGIN }
    );
  }

  addFooter(doc, 2, totalPages);

  // ── PAGES 3+: SAVINGS BY EMPLOYEE ──
  let pageNum = 3;
  doc.addPage();
  addHeader(doc);

  let tableY = 32;
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Savings by Employee', MARGIN, tableY);
  tableY += 3;

  const employeeTableData = allSorted.map(r => {
    if (r.eligible) {
      return [
        r.name,
        formatCurrency(r.perPeriodGross),
        formatCurrency(r.perPeriodFITBefore),
        formatCurrency(r.monthlyBenefit),
        formatCurrency(r.annualBenefit),
        formatCurrency(r.netAnnualERSavings),
        'Qualified',
      ];
    } else {
      return [
        r.name,
        formatCurrency(r.perPeriodGross),
        r.perPeriodFITBefore > 0 ? formatCurrency(r.perPeriodFITBefore) : '$0.00',
        '\u2014',
        '\u2014',
        '\u2014',
        'Ineligible',
      ];
    }
  });

  // Add TOTAL row
  const totalMonthlyBenefit = qualified.reduce((s, r) => s + r.monthlyBenefit, 0);
  employeeTableData.push([
    `TOTAL (${aggregates.totalQualified} Qualified)`,
    '',
    '',
    formatCurrency(totalMonthlyBenefit),
    formatCurrency(aggregates.totalAnnualEEBenefit),
    formatCurrency(aggregates.totalNetAnnualERSavings),
    '',
  ]);

  autoTable(doc, {
    startY: tableY,
    head: [['Employee', 'Gross / PP', 'FIT / PP', 'Net Benefit / Mo', 'Net Benefit / Yr', 'ER Net / Yr', 'Status']],
    body: employeeTableData,
    headStyles: {
      fillColor: NAVY, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2, halign: 'center',
    },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 24, halign: 'right' },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 18, halign: 'center', fontSize: 6.5 },
    },
    didParseCell: (data) => {
      const isLastRow = data.row.index === employeeTableData.length - 1;
      const isIneligible = !isLastRow && data.row.index >= qualifiedSorted.length;

      if (isLastRow) {
        data.cell.styles.fillColor = NAVY;
        data.cell.styles.textColor = WHITE;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 7.5;
      } else if (isIneligible) {
        data.cell.styles.fillColor = [255, 240, 240];
        if (data.column.index === 6) {
          data.cell.styles.textColor = DARK_RED;
          data.cell.styles.fontStyle = 'bold';
        }
      } else {
        if (data.row.index % 2 === 0) {
          data.cell.styles.fillColor = LIGHT_GRAY;
        }
        if (data.column.index === 6) {
          data.cell.styles.textColor = GREEN;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addHeader(doc);
      }
      addFooter(doc, pageNum, totalPages);
      pageNum++;
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // Contact block after the last table
  const finalY = doc.lastAutoTable.finalY + 15;
  if (finalY < 240) {
    addContactBlock(doc, finalY);
  }

  return doc;
}

// ══════════════════════════════════════════════════════════════
// TRS / SCHOOL DISTRICT FORMAT (Anton ISD Style)
// ══════════════════════════════════════════════════════════════

function generateTRSReport(doc, calcResults, companyName, payFrequency, reportDate) {
  const { results, qualified, ineligible, aggregates } = calcResults;

  // Bracket distribution
  const bracketMap = {};
  qualified.forEach(r => {
    const bracket = fmtRate(r.marginalRate);
    if (!bracketMap[bracket]) {
      bracketMap[bracket] = { count: 0, grossSavings: 0, netBenefit: 0, rate: r.marginalRate };
    }
    bracketMap[bracket].count++;
    bracketMap[bracket].grossSavings += r.monthlyFITSavings + r.monthlyFICASavings;
    bracketMap[bracket].netBenefit += r.monthlyBenefit;
  });
  const brackets = Object.entries(bracketMap)
    .sort((a, b) => a[1].rate - b[1].rate)
    .map(([bracket, data]) => ({
      bracket,
      count: data.count,
      pct: ((data.count / qualified.length) * 100).toFixed(1),
      avgGross: data.grossSavings / data.count,
      avgNet: data.netBenefit / data.count,
    }));

  // Scholarship fund
  const scholarshipPerEE = 4.00;
  const monthlyScholarship = scholarshipPerEE * aggregates.totalQualified;
  const annualScholarship = monthlyScholarship * 12;

  // Ineligible breakdown
  const zeroFIT = ineligible.filter(r => r.monthlyFITSavings === 0);
  const insufficientFIT = ineligible.filter(r => r.monthlyFITSavings > 0);

  // Calculate total pages
  const totalPages = 7;
  let pageNum = 1;

  // ── PAGE 1: COVER ──
  addHeader(doc, false);

  let y = 70;
  doc.setFontSize(28);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), PAGE_W / 2, y, { align: 'center' });
  y += 14;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MED);
  doc.text('LW360 Wellness Program', PAGE_W / 2, y, { align: 'center' });
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Eligibility Analysis Report', PAGE_W / 2, y, { align: 'center' });
  y += 18;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MED);
  doc.text('Prepared by Live Well 360 Health Strategy Advisors', PAGE_W / 2, y, { align: 'center' });
  y += 6;
  doc.text('6609 Toledo Avenue, Suite 1 | Lubbock, TX', PAGE_W / 2, y, { align: 'center' });
  y += 10;
  doc.text(formatDate(reportDate), PAGE_W / 2, y, { align: 'center' });
  y += 12;

  doc.setFillColor(...RED);
  doc.roundedRect(PAGE_W / 2 - 30, y, 60, 14, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL', PAGE_W / 2, y + 9.5, { align: 'center' });

  addFooter(doc, pageNum, totalPages);

  // ── PAGE 2: EXECUTIVE SUMMARY ──
  doc.addPage();
  addHeader(doc);
  pageNum++;

  y = 32;
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', MARGIN, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const summaryText = `Live Well 360 Health Strategy Advisors (LW360) has completed a comprehensive eligibility analysis for ${companyName} based on ${formatDate(reportDate)} payroll data. This report presents aggregate findings using the IRS-mandated marginal tax rate methodology per Publication 15-T.`;
  const splitSummary = doc.splitTextToSize(summaryText, PAGE_W - 2 * MARGIN);
  doc.text(splitSummary, MARGIN, y);
  y += splitSummary.length * 4.5 + 6;

  // Stat boxes (5 items in a row)
  const sBoxW = 33;
  const sBoxH = 30;
  const sGap = 4;
  const sTotalW = 5 * sBoxW + 4 * sGap;
  const sStartX = (PAGE_W - sTotalW) / 2;

  const statItems = [
    { value: `${aggregates.totalQualified}`, sub: `Eligible Employees (${formatPercent(aggregates.qualificationRate)})`, fill: [230, 255, 230], color: GREEN },
    { value: formatCurrency(aggregates.totalAnnualEEBenefit), sub: 'Annual Employee Savings', fill: LIGHT_GRAY, color: NAVY },
    { value: formatCurrency(aggregates.totalNetAnnualERSavings), sub: 'Annual District Savings (Net)', fill: LIGHT_GRAY, color: NAVY },
    { value: `${formatCurrency(aggregates.averageMonthlyBenefit)}`, sub: 'Avg Monthly Benefit per Employee', fill: [230, 255, 230], color: GREEN },
    { value: `${formatCurrency(annualScholarship)}/year`, sub: 'Scholarship Fund', fill: [230, 240, 255], color: NAVY },
  ];

  statItems.forEach((item, i) => {
    const bx = sStartX + i * (sBoxW + sGap);
    doc.setFillColor(...item.fill);
    doc.roundedRect(bx, y, sBoxW, sBoxH, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...item.color);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, bx + sBoxW / 2, y + 12, { align: 'center', maxWidth: sBoxW - 4 });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_MED);
    const labelLines = doc.splitTextToSize(item.sub, sBoxW - 4);
    doc.text(labelLines, bx + sBoxW / 2, y + 18, { align: 'center' });
  });

  y += sBoxH + 4;
  doc.setFontSize(5.5);
  doc.setTextColor(...TEXT_LIGHT);
  doc.setFont('helvetica', 'italic');
  doc.text('Funded by LW360 at No Cost to the District or Employees', sStartX + 4 * (sBoxW + sGap) + sBoxW / 2, y, { align: 'center' });

  y += 10;

  // Program Overview
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Program Overview', MARGIN, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const overviewText = 'The LW360 Self-Insured Medical Reimbursement Plan (SIMRP) is a qualified employer-sponsored benefit plan established under IRC Sections 105 and 125. The plan creates a pre-tax premium structure that reduces federal income tax withholding and Medicare tax obligations for participating employees, resulting in increased take-home pay.';
  const splitOverview = doc.splitTextToSize(overviewText, PAGE_W - 2 * MARGIN);
  doc.text(splitOverview, MARGIN, y);
  y += splitOverview.length * 4 + 6;

  // How It Works
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('How It Works', MARGIN, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const howText = `A monthly premium of $${SIMRP_PREMIUM_MONTHLY.toLocaleString()} is established for each participating employee under the Section 125 cafeteria plan. This premium reduces the employee's federal taxable wages before withholding calculations are performed, producing savings at the employee's marginal federal income tax rate plus the applicable Medicare rate.`;
  const splitHow = doc.splitTextToSize(howText, PAGE_W - 2 * MARGIN);
  doc.text(splitHow, MARGIN, y);
  y += splitHow.length * 4 + 6;

  // Texas School District Structure
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Texas School District Structure', MARGIN, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const trsText = `As a TRS-participating district, ${companyName} employees pay Medicare tax only (1.45%) and do not participate in Social Security (6.2%). This means the applicable FICA savings component is limited to Medicare. The district saves its matching 1.45% Medicare contribution on each enrolled employee's premium amount.`;
  const splitTrs = doc.splitTextToSize(trsText, PAGE_W - 2 * MARGIN);
  doc.text(splitTrs, MARGIN, y);

  addFooter(doc, pageNum, totalPages);

  // ── PAGE 3: COMPONENT TABLE + ELIGIBILITY RESULTS ──
  doc.addPage();
  addHeader(doc);
  pageNum++;

  y = 32;

  // Component Table
  const componentData = [
    ['Monthly Premium', formatCurrency(SIMRP_PREMIUM_MONTHLY)],
    ['Employee Fee', `${formatCurrency(EE_FEE_MONTHLY_TRS)}/month`],
    ['Employer Fee', `${formatCurrency(ER_FEE_TRS)}/employee/month`],
    ['Medicare Rate (TRS)', '1.45% (no Social Security)'],
    ['Employee Medicare Savings', `${formatCurrency(SIMRP_PREMIUM_MONTHLY * MEDICARE_RATE)}/month`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Component', 'Amount']],
    body: componentData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 80, halign: 'right' },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY + 12;

  // Eligibility Results
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Eligibility Results', MARGIN, y);
  y += 8;

  doc.setFontSize(11);
  doc.text('Overall Eligibility', MARGIN, y);
  y += 3;

  const eligData = [
    ['Total Active Employees', String(aggregates.totalEmployees), '100.0%'],
    ['Eligible', String(aggregates.totalQualified), formatPercent(aggregates.qualificationRate)],
    [`Ineligible \u2014 Insufficient FIT`, String(aggregates.totalIneligible), formatPercent(100 - aggregates.qualificationRate)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Count', 'Percentage']],
    body: eligData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 75, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 35, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.row.index === 1) {
        data.cell.styles.fillColor = [230, 255, 230];
      } else if (data.row.index === 2 && aggregates.totalIneligible > 0) {
        data.cell.styles.fillColor = [255, 240, 240];
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY + 12;

  // Bracket Distribution
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Bracket Distribution', MARGIN, y);
  y += 3;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Among the ${aggregates.totalQualified} eligible employees, the distribution across federal tax brackets is as follows:`, MARGIN, y);
  y += 5;

  const bracketData = brackets.map(b => [
    b.bracket,
    String(b.count),
    `${b.pct}%`,
    formatCurrency(b.avgGross),
    formatCurrency(b.avgNet),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Bracket', 'Employees', '% of Eligible', 'Gross Savings/Mo', 'Net Benefit/Mo']],
    body: bracketData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 38, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Bracket narrative
  if (brackets.length > 0) {
    const majorBracket = brackets.reduce((a, b) => a.count > b.count ? a : b);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    const bracketNarrative = `The majority of eligible employees (${majorBracket.pct}%) fall in the ${majorBracket.bracket} bracket, generating a net monthly benefit of ${formatCurrency(majorBracket.avgNet)} after fees. The average net benefit across all eligible employees is ${formatCurrency(aggregates.averageMonthlyBenefit)} per month, or ${formatCurrency(aggregates.averageMonthlyBenefit * 12)} annually.`;
    const splitBN = doc.splitTextToSize(bracketNarrative, PAGE_W - 2 * MARGIN);
    doc.text(splitBN, MARGIN, y);
    y += splitBN.length * 4 + 6;
  }

  // Ineligible Population narrative
  if (ineligible.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text('Ineligible Population', MARGIN, y);
    y += 6;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_DARK);
    let ineligText = `Of the ${aggregates.totalIneligible} ineligible employee${aggregates.totalIneligible > 1 ? 's' : ''}`;
    if (zeroFIT.length > 0) {
      ineligText += `, ${zeroFIT.length} show $0 federal income tax withholding`;
    }
    if (insufficientFIT.length > 0) {
      ineligText += ` and ${insufficientFIT.length} have FIT savings that are insufficient to cover the $${EE_FEE_MONTHLY_TRS}/month employee fee`;
    }
    ineligText += '. These employees primarily file MFJ or HoH with standard deductions exceeding taxable income.';
    if (insufficientFIT.length > 0) {
      ineligText += ` ${insufficientFIT.length} employee(s) have some FIT but total savings do not exceed the $${EE_FEE_MONTHLY_TRS}/month fee.`;
    }
    const splitInelig = doc.splitTextToSize(ineligText, PAGE_W - 2 * MARGIN);
    doc.text(splitInelig, MARGIN, y);
  }

  addFooter(doc, pageNum, totalPages);

  // ── PAGE 4: ELIGIBLE EMPLOYEE DETAIL ──
  doc.addPage();
  addHeader(doc);
  pageNum++;

  y = 32;
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Eligible Employee Detail', MARGIN, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const detailIntro = `The following ${aggregates.totalQualified} employees qualify for the LW360 SIMRP based on their annual salary, W-4 filing status, and resulting federal income tax savings.`;
  const splitDetail = doc.splitTextToSize(detailIntro, PAGE_W - 2 * MARGIN);
  doc.text(splitDetail, MARGIN, y);
  y += splitDetail.length * 4 + 3;

  const qualSorted = [...qualified].sort((a, b) => b.monthlyBenefit - a.monthlyBenefit);
  const medicareSavings = SIMRP_PREMIUM_MONTHLY * MEDICARE_RATE;

  const eligibleTableData = qualSorted.map(r => [
    r.name,
    formatCurrency(r.annualGross),
    r.filingStatus,
    fmtRate(r.marginalRate),
    formatCurrency(r.monthlyFITSavings),
    formatCurrency(medicareSavings),
    formatCurrency(r.monthlyFITSavings + medicareSavings),
    formatCurrency(r.monthlyBenefit),
  ]);

  // TOTAL row
  const totalFIT = qualified.reduce((s, r) => s + r.monthlyFITSavings, 0);
  const totalMedicare = medicareSavings * qualified.length;
  const totalGrossBenefit = totalFIT + totalMedicare;
  const totalNetBenefit = qualified.reduce((s, r) => s + r.monthlyBenefit, 0);

  eligibleTableData.push([
    'TOTAL',
    '',
    '',
    '',
    formatCurrency(totalFIT),
    formatCurrency(totalMedicare),
    formatCurrency(totalGrossBenefit),
    formatCurrency(totalNetBenefit),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Employee Name', 'Annual Salary', 'Filing Status', 'Marginal Bracket', 'FIT Savings/Month', 'Medicare Savings/Mo', 'Gross Benefit/Mo', 'Net Benefit/Month']],
    body: eligibleTableData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 6.5, fontStyle: 'bold', cellPadding: 2, halign: 'center' },
    styles: { fontSize: 6.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22, halign: 'right' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === eligibleTableData.length - 1) {
        data.cell.styles.fillColor = NAVY;
        data.cell.styles.textColor = WHITE;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 7;
      } else if (data.row.index % 2 === 0) {
        data.cell.styles.fillColor = LIGHT_GRAY;
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addHeader(doc);
      }
      addFooter(doc, pageNum, totalPages);
      pageNum++;
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  // ── PAGE 5: INELIGIBLE EMPLOYEE DETAIL ──
  if (ineligible.length > 0) {
    doc.addPage();
    addHeader(doc);
    // pageNum already incremented by didDrawPage

    y = 32;
    doc.setFontSize(14);
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.text('Ineligible Employee Detail', MARGIN, y);
    y += 5;

    const ineligibleSorted = [...ineligible].sort((a, b) => a.name.localeCompare(b.name));
    const ineligibleTableData = ineligibleSorted.map(r => [
      r.name,
      formatCurrency(r.annualGross),
      r.filingStatus,
      r.eligibilityReason,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Employee Name', 'Annual Salary', 'Filing Status', 'Reason']],
      body: ineligibleTableData,
      headStyles: { fillColor: RED, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 70 },
      },
      alternateRowStyles: { fillColor: [255, 240, 240] },
      margin: { left: MARGIN, right: MARGIN },
    });

    y = doc.lastAutoTable.finalY + 15;
  } else {
    doc.addPage();
    addHeader(doc);
    y = 32;
  }

  addFooter(doc, pageNum, totalPages);

  // ── PAGE 6: FINANCIAL IMPACT SUMMARY ──
  doc.addPage();
  addHeader(doc);
  pageNum++;

  y = 32;
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Impact Summary', MARGIN, y);
  y += 10;

  // Employee Savings table
  doc.setFontSize(12);
  doc.text('Employee Savings', MARGIN, y);
  y += 3;

  const avgFIT = qualified.length > 0 ? totalFIT / qualified.length : 0;
  const avgMedicare = medicareSavings;
  const avgGross = avgFIT + avgMedicare;

  const financialData = [
    ['Average FIT Savings per Employee', `${formatCurrency(avgFIT)}/month`],
    ['Average Medicare Savings per Employee', `${formatCurrency(avgMedicare)}/month`],
    ['Average Gross Savings per Employee', `${formatCurrency(avgGross)}/month`],
    ['Less: Employee Fee', `(${formatCurrency(EE_FEE_MONTHLY_TRS)})/month`],
    ['Average Net Benefit per Employee', `${formatCurrency(aggregates.averageMonthlyBenefit)}/month`],
    ['Total Monthly Employee Savings (All Eligible)', `${formatCurrency(totalNetBenefit)}/month`],
    ['Total Annual Employee Savings', `${formatCurrency(aggregates.totalAnnualEEBenefit)}/year`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Amount']],
    body: financialData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { cellWidth: 55, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [230, 255, 230];
        data.cell.styles.fontStyle = 'bold';
      } else if (data.row.index === 6) {
        data.cell.styles.fillColor = [230, 255, 230];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
      } else if (data.row.index % 2 === 0) {
        data.cell.styles.fillColor = LIGHT_GRAY;
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  addFooter(doc, pageNum, totalPages);

  // ── PAGE 7: DISTRICT IMPACT + SCHOLARSHIP FUND + CONTACT ──
  doc.addPage();
  addHeader(doc);
  pageNum++;

  y = 32;
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('District (Employer) Impact', MARGIN, y);
  y += 7;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const districtText = `${companyName} saves the employer-side Medicare match (1.45%) on the $${SIMRP_PREMIUM_MONTHLY.toLocaleString()} premium for each enrolled employee, offset by the $${ER_FEE_TRS}/employee/month program fee. The district is cash-flow positive from day one.`;
  const splitDistrict = doc.splitTextToSize(districtText, PAGE_W - 2 * MARGIN);
  doc.text(splitDistrict, MARGIN, y);
  y += splitDistrict.length * 4 + 6;

  // District Financial Impact table
  const annualMedicareSavings = SIMRP_PREMIUM_MONTHLY * MEDICARE_RATE * aggregates.totalQualified * 12;
  const annualERFees = ER_FEE_TRS * aggregates.totalQualified * 12;

  const districtData = [
    [`Medicare Savings (1.45% \u00D7 $${SIMRP_PREMIUM_MONTHLY.toLocaleString()} \u00D7 ${aggregates.totalQualified} EEs \u00D7 12 mo)`, formatCurrency(annualMedicareSavings)],
    [`Less: LW360 Employer Fees ($${ER_FEE_TRS}/EE \u00D7 ${aggregates.totalQualified} EEs \u00D7 12 mo)`, `(${formatCurrency(annualERFees)})`],
    ['Net Annual District Savings', formatCurrency(aggregates.totalNetAnnualERSavings)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['District Financial Impact', 'Annual']],
    body: districtData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [230, 255, 230];
      } else if (data.row.index % 2 === 0) {
        data.cell.styles.fillColor = LIGHT_GRAY;
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY + 6;

  const netPerEE = aggregates.totalQualified > 0 ? aggregates.totalNetAnnualERSavings / aggregates.totalQualified / 12 : 0;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const netNote = `This equates to approximately ${formatCurrency(netPerEE)} per enrolled employee per month in net savings to the district, with zero additional administrative burden beyond initial payroll setup.`;
  const splitNet = doc.splitTextToSize(netNote, PAGE_W - 2 * MARGIN);
  doc.text(splitNet, MARGIN, y);
  y += splitNet.length * 4 + 10;

  // Scholarship Fund
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('LW360 Scholarship Fund', MARGIN, y);
  y += 7;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const scholarText = `In addition to direct tax savings, LW360 funds a scholarship program for participating districts at $${scholarshipPerEE.toFixed(2)} per enrolled employee per month. This scholarship fund is fully funded by LW360 at no cost to the district or its employees.`;
  const splitScholar = doc.splitTextToSize(scholarText, PAGE_W - 2 * MARGIN);
  doc.text(splitScholar, MARGIN, y);
  y += splitScholar.length * 4 + 5;

  const scholarData = [
    [`Monthly Contribution ($${scholarshipPerEE.toFixed(2)} \u00D7 ${aggregates.totalQualified} EEs)`, `${formatCurrency(monthlyScholarship)}/month`],
    ['Annual Scholarship Fund', `${formatCurrency(annualScholarship)}/year`],
    ['Cost to District', '$0'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Scholarship Fund', 'Amount']],
    body: scholarData,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { cellWidth: 55, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [230, 255, 230];
        data.cell.styles.fontStyle = 'bold';
      } else if (data.row.index % 2 === 0) {
        data.cell.styles.fillColor = LIGHT_GRAY;
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = doc.lastAutoTable.finalY + 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  const scholarNarrative = `The scholarship fund provides ${companyName} with a meaningful community benefit that supports students and families, funded entirely by LW360 as part of the program partnership.`;
  const splitSN = doc.splitTextToSize(scholarNarrative, PAGE_W - 2 * MARGIN);
  doc.text(splitSN, MARGIN, y);
  y += splitSN.length * 4 + 12;

  // Contact block
  addContactBlock(doc, y);

  addFooter(doc, pageNum, totalPages);

  return doc;
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORT — dispatches based on companyType
// ══════════════════════════════════════════════════════════════

export function generateEligibilityReport(calcResults, companyName, companyType, payFrequency, reportDate) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  if (companyType === 'TRS') {
    return generateTRSReport(doc, calcResults, companyName, payFrequency, reportDate);
  } else {
    return generatePrivateReport(doc, calcResults, companyName, payFrequency, reportDate);
  }
}
