// Checks for what the analyzer sends with "Save to LW360 pipeline" (2026-10-13): the
// tracker record it was opened from, and the Benefit Analysis PDF. Vercel does not serve
// files in api/ whose names start with "_", so this is a helper, not an endpoint.

export const REPORT_PDF_MAX_BYTES = 8 * 1024 * 1024;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The tracker record id, or null when it is missing or not a uuid (then it is ignored).
export function organizationIdOrNull(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return UUID_RE.test(v) ? v.toLowerCase() : null;
}

// Bytes a base64 string decodes to (no decoding needed).
export function base64DecodedBytes(b64) {
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

// Validates the report PDF. Returns { ok: true, base64, fileName } or
// { ok: false, status, error } with a message the analyzer can show as is.
export function readReportPdf(pdfBase64, fileName) {
  if (typeof pdfBase64 !== 'string') {
    return { ok: false, status: 400, error: 'The report PDF could not be read. Save again, or generate the reports again first.' };
  }
  const base64 = pdfBase64.replace(/^data:[^,]*;base64,/i, '').replace(/\s+/g, '');
  if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { ok: false, status: 400, error: 'The report PDF could not be read. Save again, or generate the reports again first.' };
  }
  if (base64DecodedBytes(base64) > REPORT_PDF_MAX_BYTES) {
    return { ok: false, status: 413, error: 'The report PDF is over 8 MB, so it cannot be saved with the analysis. Download it and add it to the client in the tracker.' };
  }
  if (!base64.startsWith('JVBER')) { // "%PDF-" in base64
    return { ok: false, status: 400, error: 'The file sent as the report is not a PDF.' };
  }
  const base = String(fileName ?? '').split(/[\\/]/).pop().replace(/\s+/g, ' ').replace(/\p{Cc}/gu, '').trim();
  const stem = base.replace(/\.pdf$/i, '').slice(0, 180).trim();
  return { ok: true, base64, fileName: stem ? `${stem}.pdf` : null };
}
