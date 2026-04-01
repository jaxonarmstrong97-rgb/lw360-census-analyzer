import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, getPayFrequencyLabel } from '../utils/formatters';
import { SIMRP_PREMIUM_MONTHLY, SIMRP_PREMIUM_ANNUAL, PAY_PERIODS } from '../engine/constants';

const NAVY = [26, 57, 92];
const RED = [196, 30, 58];
const WHITE = [255, 255, 255];
const GREEN_TEXT = [0, 128, 0];
const LIGHT_GRAY = [245, 245, 245];

function addHeader(doc, companyName) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 215.9, 20, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('LIVE WELL 360', 15, 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Health Strategy Advisors', 15, 15);

  doc.setFillColor(...RED);
  doc.roundedRect(160, 4, 38, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL', 179, 11, { align: 'center' });

  doc.setTextColor(...NAVY);
  doc.setFontSize(8);
  doc.text(companyName, 107.95, 10, { align: 'center' });
}

function addFooter(doc) {
  const y = 272;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 200, y);
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text('Live Well 360 Health Strategy Advisors | livewellhealth360.com | (806) 799-1099', 107.95, y + 4, { align: 'center' });
}

function generateEmployeePage(doc, emp, companyName, payFrequency) {
  addHeader(doc, companyName);

  const periods = PAY_PERIODS[payFrequency] || 12;
  const periodLabel = getPayFrequencyLabel(payFrequency);
  const premiumPerPeriod = SIMRP_PREMIUM_ANNUAL / periods;

  let y = 30;

  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(emp.name, 15, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Filing Status: ${emp.filingStatus}  |  Pay Type: ${emp.payType}  |  Pay Frequency: ${periodLabel}  |  Annual Gross: ${formatCurrency(emp.annualGross)}`, 15, y);
  y += 10;

  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Paycheck Comparison (Per ${periodLabel === 'Bi-Weekly' ? 'Pay Period' : periodLabel === 'Semi-Monthly' ? 'Half-Month' : periodLabel === 'Weekly' ? 'Week' : 'Month'})`, 15, y);
  y += 5;

  const fmtPos = (v) => v > 0 ? `+${formatCurrency(v)}` : formatCurrency(v);

  const grossPP = emp.perPeriodGross;
  const fitBeforePP = emp.perPeriodFITBefore;
  const fitAfterPP = emp.perPeriodFITAfter;
  const ssBeforePP = emp.perPeriodSSBefore;
  const ssAfterPP = emp.perPeriodSSAfter;
  const medBeforePP = emp.perPeriodMedicareBefore;
  const medAfterPP = emp.perPeriodMedicareAfter;
  const existingDedPP = emp.perPeriodExistingDeductions;
  const eeFeePP = emp.perPeriodEEFee;

  const netBefore = grossPP - fitBeforePP - ssBeforePP - medBeforePP - existingDedPP;
  const netAfter = grossPP - fitAfterPP - ssAfterPP - medAfterPP - existingDedPP - premiumPerPeriod + premiumPerPeriod - eeFeePP;
  const netDiff = netAfter - netBefore;

  const tableData = [
    ['Gross Pay', formatCurrency(grossPP), formatCurrency(grossPP), '\u2014'],
    ['Federal Income Tax', `(${formatCurrency(fitBeforePP)})`, `(${formatCurrency(fitAfterPP)})`, fmtPos(fitBeforePP - fitAfterPP)],
    ['Social Security Tax', `(${formatCurrency(ssBeforePP)})`, `(${formatCurrency(ssAfterPP)})`, fmtPos(ssBeforePP - ssAfterPP)],
    ['Medicare Tax', `(${formatCurrency(medBeforePP)})`, `(${formatCurrency(medAfterPP)})`, fmtPos(medBeforePP - medAfterPP)],
    ['Existing Pre-Tax Deductions', existingDedPP > 0 ? `(${formatCurrency(existingDedPP)})` : '\u2014', existingDedPP > 0 ? `(${formatCurrency(existingDedPP)})` : '\u2014', '\u2014'],
    ['LW Premium (pre-tax)', '\u2014', `(${formatCurrency(premiumPerPeriod)})`, '\u2014'],
    ['LW Reimbursement (post-tax)', '\u2014', formatCurrency(premiumPerPeriod), '\u2014'],
    ['EE Fee (post-tax)', '\u2014', `(${formatCurrency(eeFeePP)})`, '\u2014'],
    ['Net Take-Home Pay', formatCurrency(netBefore), formatCurrency(netAfter), fmtPos(netDiff)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['', 'BEFORE LW360', 'AFTER LW360', 'DIFFERENCE']],
    body: tableData,
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3,
    },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 38, halign: 'right' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 38, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = NAVY;
        data.cell.styles.textColor = WHITE;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 9;
      } else if (data.row.index % 2 === 0) {
        data.cell.styles.fillColor = LIGHT_GRAY;
      }
      if (data.column.index === 3 && data.cell.raw && String(data.cell.raw).startsWith('+')) {
        data.cell.styles.textColor = GREEN_TEXT;
      }
    },
    margin: { left: 20, right: 20 },
  });

  // Get the final Y position after the table
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 100;
  y = finalY + 12;

  // Monthly benefit highlight
  doc.setFillColor(230, 255, 230);
  doc.roundedRect(15, y, 185, 28, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setTextColor(...GREEN_TEXT);
  doc.setFont('helvetica', 'bold');
  doc.text(`Monthly Benefit: ${formatCurrency(emp.monthlyBenefit)}`, 107.95, y + 10, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Annual Benefit: ${formatCurrency(emp.annualBenefit)}`, 107.95, y + 18, { align: 'center' });

  if (emp.bufferApplied) {
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('* Includes $5/mo buffer for hourly pay protection', 107.95, y + 24, { align: 'center' });
  }

  y += 35;

  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Included Wellness Benefits', 15, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const benefits = [
    ['MDLive 24/7 Telehealth', '$0 copay doctor visits anytime, anywhere'],
    ['AllOne Health EAP', 'Counseling, legal, and financial assistance'],
    ['OVAL Rx', 'Prescription discount program'],
  ];

  benefits.forEach(([title, desc]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`\u2022 ${title}`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(` \u2014 ${desc}`, 20 + doc.getTextWidth(`\u2022 ${title}`), y);
    y += 6;
  });

  addFooter(doc);
}

export function generatePaycheckComparisons(qualifiedEmployees, companyName, payFrequency) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  addHeader(doc, companyName);

  doc.setFontSize(24);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text('Paycheck Comparisons', 107.95, 80, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(companyName, 107.95, 95, { align: 'center' });
  doc.text(`${qualifiedEmployees.length} Qualified Employees`, 107.95, 108, { align: 'center' });

  addFooter(doc);

  qualifiedEmployees.forEach((emp) => {
    doc.addPage();
    generateEmployeePage(doc, emp, companyName, payFrequency);
  });

  return doc;
}

export function generateIndividualPaychecks(qualifiedEmployees, companyName, payFrequency) {
  return qualifiedEmployees.map((emp) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    generateEmployeePage(doc, emp, companyName, payFrequency);
    const safeName = emp.name.replace(/[^a-zA-Z0-9]/g, '_');
    return {
      name: `${safeName}_Paycheck_Comparison.pdf`,
      doc,
    };
  });
}
