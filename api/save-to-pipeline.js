import { guard, text, num } from './_guard.js';
import { organizationIdOrNull, readReportPdf, REPORT_PDF_MAX_BYTES } from './_report.js';

// Server-side proxy: analyzer results -> LW360 pipeline (save-analysis edge fn).
// Keeps ANALYZER_INGEST_SECRET off the browser. Summary figures, never SSNs. Internal
// sales tool; this is an inbound write to our own platform, not an outbound communication.
//
// 2026-10-13: also forwards the tracker record the analyzer was opened from
// (organizationId -> organization_id, uuid only, otherwise ignored) so the analysis lands
// on that client, and the Benefit Analysis PDF (reportPdfBase64 / reportFileName), which
// save-analysis keeps as a private document on the client. The PDF names employees and
// is the only per-employee content sent.
// Company types the analyzer produces; anything else is stored as null.
const COMPANY_TYPES = new Set(['Non-FICA', 'FICA-School', 'Private']);

// Everything except the PDF keeps the 20 KB cap this route has had since the
// lock-down; the PDF (base64, at most 8 MB decoded) may come on top. Vercel itself
// refuses request bodies over 4.5 MB before this route runs, so the analyzer leaves
// larger PDFs off and saves the summary alone.
const SUMMARY_MAX_BYTES = 20_000;
const MAX_BODY_BYTES = SUMMARY_MAX_BYTES + Math.ceil(REPORT_PDF_MAX_BYTES / 3) * 4;

export default async function handler(req, res) {
  // Same-site, rate-limited and size-capped (see _guard.js): this route writes into the
  // LW360 pipeline, so it must not be callable by other sites or bare scripts.
  if (!guard(req, res, { limitPerMinute: 10, maxBodyBytes: MAX_BODY_BYTES })) return;
  const url = process.env.LW360_INGEST_URL;
  const secret = process.env.ANALYZER_INGEST_SECRET;
  if (!url || !secret) return res.status(503).json({ error: 'Pipeline handoff not configured' });

  const { companyName, companyType, aggregates, contact, organizationId, reportPdfBase64, reportFileName } = req.body || {};
  const pdfChars = typeof reportPdfBase64 === 'string' ? reportPdfBase64.length : 0;
  if (Number(req.headers['content-length'] || 0) - pdfChars > SUMMARY_MAX_BYTES) {
    return res.status(413).json({ error: 'Request too large' });
  }
  const name = text(companyName, 200).trim();
  if (!name || !aggregates || typeof aggregates !== 'object') {
    return res.status(400).json({ error: 'companyName and aggregates required' });
  }

  const payload = {
    company_name: name,
    company_type: COMPANY_TYPES.has(companyType) ? companyType : null,
    headcount: num(aggregates.totalEmployees),
    eligible_count: num(aggregates.totalQualified),
    est_employer_fica_savings: num(aggregates.totalNetAnnualERSavings),
    avg_net_benefit: num(aggregates.averageMonthlyBenefit),
    scored_at: new Date().toISOString(),
    source: 'census-analyzer',
  };
  // Optional business contact only (name/email/phone) — never SSNs.
  if (contact && typeof contact === 'object' && (contact.name || contact.email || contact.phone)) {
    const email = text(contact.email, 200).trim();
    payload.contact = {
      name: text(contact.name, 200).trim() || null,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
      phone: text(contact.phone, 40).trim() || null,
    };
  }
  const orgId = organizationIdOrNull(organizationId);
  if (orgId) payload.organization_id = orgId;
  if (reportPdfBase64 != null && reportPdfBase64 !== '') {
    const pdf = readReportPdf(reportPdfBase64, reportFileName);
    if (!pdf.ok) return res.status(pdf.status).json({ error: pdf.error });
    payload.report_pdf_base64 = pdf.base64;
    if (pdf.fileName) payload.report_file_name = pdf.fileName;
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-analyzer-secret': secret },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.error || 'Pipeline save failed' });
    return res.status(200).json({
      ok: true,
      organization: data.organization || null,
      created: data.created ?? null,
      matched_by: data.matched_by ?? null,
      census_files_marked: data.census_files_marked ?? null,
      pdf_saved: data.pdf_saved ?? null,
      pdf_error: data.pdf_error ?? null,
    });
  } catch (_e) {
    return res.status(502).json({ error: 'Could not reach the pipeline. Try again in a moment.' });
  }
}
