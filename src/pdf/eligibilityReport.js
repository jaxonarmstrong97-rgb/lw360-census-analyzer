import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatPercent, formatDate, getPayFrequencyLabel } from '../utils/formatters';

const NAVY = [26, 57, 92]; // #1A395C
const RED = [196, 30, 58]; // #C41E3A
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [245, 245, 245];
const GREEN = [34, 139, 34];
const DARK_RED = [180, 0, 0];

function addHeader(doc, companyName) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 215.9, 25, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LIVE WELL 360', 15, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Health Strategy Advisors', 15, 18);

  doc.setFillColor(...RED);
  doc.roundedRect(155, 6, 45, 12, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL', 177.5, 14, { align: 'center' });

  doc.setTextColor(0, 0, 0);
}

function addFooter(doc, pageNum, totalPages) {
  const y = 272;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 200, y);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Live Well 360 Health Strategy Advisors | livewellhealth360.com | (806) 799-1099', 107.95, y + 5, { align: 'center' });
  doc.text(`Page ${pageNum} of ${totalPages}`, 200, y + 5, { align: 'right' });
}

export function generateEligibilityReport(calcResults, companyName, companyType, payFrequency, reportDate) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const { results, qualified, ineligible, aggregates } = calcResults;

  const employeePages = Math.ceil(results.length / 28);
  const totalPages = 4 + employeePages;

  // ===== PAGE 1: COVER / EXECUTIVE SUMMARY =====
  addHeader(doc, companyName);

  doc.setFontSize(28);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Eligibility', 107.95, 65, { align: 'center' });
  doc.text('Analysis', 107.95, 80, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(companyName, 107.95, 100, { align: 'center' });
  doc.text(formatDate(reportDate), 107.95, 110, { align: 'center' });
  doc.text(`${companyType === 'TRS' ? 'TX School District (TRS)' : 'Private Sector'} | ${getPayFrequencyLabel(payFrequency)}`, 107.95, 120, { align: 'center' });

  const boxY = 145;
  const boxW = 80;
  const boxH = 30;
  const gap = 20;

  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(15, boxY, boxW, boxH, 3, 3, 'F');
  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(String(aggregates.totalEmployees), 55, boxY + 14, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Employees Analyzed', 55, boxY + 22, { align: 'center' });

  doc.setFillColor(230, 255, 230);
  doc.roundedRect(15 + boxW + gap, boxY, boxW, boxH, 3, 3, 'F');
  doc.setFontSize(22);
  doc.setTextColor(...GREEN);
  doc.setFont('helvetica', 'bold');
  doc.text(String(aggregates.totalQualified), 15 + boxW + gap + boxW / 2, boxY + 14, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Qualified (${formatPercent(aggregates.qualificationRate)})`, 15 + boxW + gap + boxW / 2, boxY + 22, { align: 'center' });

  if (aggregates.totalIneligible > 0) {
    doc.setFillColor(255, 230, 230);
    doc.roundedRect(15, boxY + boxH + 10, boxW, boxH, 3, 3, 'F');
    doc.setFontSize(22);
    doc.setTextColor(...DARK_RED);
    doc.setFont('helvetica', 'bold');
    doc.text(String(aggregates.totalIneligible), 55, boxY + boxH + 10 + 14, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Ineligible', 55, boxY + boxH + 10 + 22, { align: 'center' });
  }

  addFooter(doc, 1, totalPages);

  // ===== PAGE 2: PROGRAM OVERVIEW =====
  doc.addPage();
  addHeader(doc, companyName);

  let y = 40;
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Program Overview', 15, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const overview = [
    'The Section 125 Individual Medical Reimbursement Plan (SIMRP) allows employers to offer',
    'employees a pre-tax health premium that reduces federal income tax and FICA obligations.',
    '',
    'Monthly Premium: $1,173.00 ($14,076.00 annually)',
    '',
    'How It Works:',
    '  1. A pre-tax premium of $1,173/month is deducted from the employee\'s gross pay',
    '  2. This reduces taxable income, lowering Federal Income Tax and FICA withholding',
    '  3. The full $1,173 premium is reimbursed to the employee (post-tax)',
    '  4. The net result: employees take home MORE money each pay period',
    '',
    'Wellness Benefits Included:',
    '  \u2022 MDLive 24/7 Telehealth \u2014 $0 copay doctor visits anytime',
    '  \u2022 AllOne Health EAP \u2014 counseling, legal, and financial assistance',
    '  \u2022 OVAL Rx \u2014 prescription discount program',
    '',
    'Zero Financial Risk Guarantee:',
    'No employee will ever take home less money as a result of participating in this program.',
    'The tax savings from the pre-tax premium always exceed the program fees.',
  ];

  overview.forEach(line => {
    doc.text(line, 15, y);
    y += 5.5;
  });

  addFooter(doc, 2, totalPages);

  // ===== PAGE 3: AGGREGATE SAVINGS SUMMARY =====
  doc.addPage();
  addHeader(doc, companyName);

  y = 40;
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Aggregate Savings Summary', 15, y);
  y += 12;

  const summaryData = [
    ['Employee Savings', ''],
    ['Total Annual FIT Savings', formatCurrency(aggregates.totalAnnualFITSavings)],
    ['Total Annual FICA Savings', formatCurrency(aggregates.totalAnnualFICASavings)],
    ['Total Annual Employee Benefit (after fees)', formatCurrency(aggregates.totalAnnualEEBenefit)],
    ['Average Monthly Benefit per Employee', formatCurrency(aggregates.averageMonthlyBenefit)],
    ['', ''],
    ['Employer Savings', ''],
    ['Total Annual Employer FICA Savings', formatCurrency(aggregates.totalAnnualERSavings)],
    ['Total Annual Employer Fees', `(${formatCurrency(aggregates.totalAnnualERFees)})`],
    ['Net Annual Employer Savings', formatCurrency(aggregates.totalNetAnnualERSavings)],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: 'normal' },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === 0 || data.row.index === 6) {
        data.cell.styles.fillColor = NAVY;
        data.cell.styles.textColor = WHITE;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 11;
      }
      if (![0, 5, 6].includes(data.row.index) && data.row.index % 2 === 0) {
        data.cell.styles.fillColor = LIGHT_GRAY;
      }
    },
    margin: { left: 15, right: 15 },
  });

  addFooter(doc, 3, totalPages);

  // ===== PAGES 4-N: EMPLOYEE DETAIL TABLE =====
  const sortedResults = [...results].sort((a, b) => a.name.localeCompare(b.name));
  const qualifiedSorted = sortedResults.filter(r => r.eligible);
  const ineligibleSorted = sortedResults.filter(r => !r.eligible);

  let pageNum = 4;

  if (qualifiedSorted.length > 0) {
    doc.addPage();
    addHeader(doc, companyName);

    y = 40;
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text('Qualified Employees', 15, y);

    const qualifiedTableData = qualifiedSorted.map(r => [
      r.name,
      r.filingStatus,
      formatCurrency(r.annualGross),
      formatCurrency(r.monthlyFITSavings),
      formatCurrency(r.monthlyFICASavings),
      formatCurrency(r.monthlyEEFee),
      formatCurrency(r.monthlyBenefit),
    ]);

    autoTable(doc, {
      startY: y + 5,
      head: [['Employee Name', 'Filing', 'Annual Gross', 'FIT Sav/mo', 'FICA Sav/mo', 'EE Fee/mo', 'Net Benefit/mo']],
      body: qualifiedTableData,
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 28, halign: 'right' },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      margin: { left: 15, right: 15 },
      didDrawPage: () => {
        addHeader(doc, companyName);
        addFooter(doc, pageNum, totalPages);
        pageNum++;
      },
    });
  }

  if (ineligibleSorted.length > 0) {
    doc.addPage();
    addHeader(doc, companyName);

    y = 40;
    doc.setFontSize(18);
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.text('Ineligible Employees', 15, y);

    const ineligibleTableData = ineligibleSorted.map(r => [
      r.name,
      r.filingStatus,
      formatCurrency(r.annualGross),
      r.eligibilityReason,
    ]);

    autoTable(doc, {
      startY: y + 5,
      head: [['Employee Name', 'Filing Status', 'Annual Gross', 'Reason']],
      body: ineligibleTableData,
      headStyles: { fillColor: RED, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 80 },
      },
      alternateRowStyles: { fillColor: [255, 240, 240] },
      margin: { left: 15, right: 15 },
      didDrawPage: () => {
        addHeader(doc, companyName);
        addFooter(doc, pageNum, totalPages);
        pageNum++;
      },
    });
  }

  // ===== FINAL PAGE: DISCLAIMER =====
  doc.addPage();
  addHeader(doc, companyName);

  y = 50;
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Disclaimer', 15, y);
  y += 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const disclaimer = [
    'This analysis is based on census data provided and current federal tax law for the 2026 tax year.',
    'Individual results may vary based on actual payroll processing, state tax implications, and',
    'changes in employment status or tax filing status.',
    '',
    'This document is for informational purposes only and does not constitute tax advice.',
    'Employers and employees should consult with a qualified tax professional regarding their',
    'specific tax situation.',
    '',
    'Tax brackets and standard deductions used in this analysis are based on projected 2026',
    'federal income tax rates. Actual rates may differ if tax legislation changes.',
    '',
    'The savings calculations assume full-year participation in the SIMRP program.',
    'Employees who enroll mid-year will see prorated savings.',
    '',
    '',
    'For questions about this analysis, contact:',
    '',
    'Live Well 360 Health Strategy Advisors',
    'Phone: (806) 799-1099',
    'Web: livewellhealth360.com',
  ];

  disclaimer.forEach(line => {
    doc.text(line, 15, y);
    y += 5.5;
  });

  addFooter(doc, pageNum, totalPages);

  return doc;
}
