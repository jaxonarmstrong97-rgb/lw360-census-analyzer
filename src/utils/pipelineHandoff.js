// Helpers for "Save to LW360 pipeline" (2026-10-13).
//
// The tracker opens the analyzer from a client's card as
//   https://lw360-census-analyzer.vercel.app/?org=<organization id>&company=<name>
// so the company name is filled in and the save lands on that client's record.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// { organizationId: uuid or null, companyName: '' when absent } from a location.search string.
export function readLaunchParams(search) {
  const params = new URLSearchParams(search || '');
  const org = (params.get('org') || '').trim();
  const company = (params.get('company') || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  return { organizationId: UUID_RE.test(org) ? org.toLowerCase() : null, companyName: company };
}

// jsPDF's output('datauristring') is "data:application/pdf;filename=generated.pdf;base64,<data>".
export function base64FromDataUri(uri) {
  const s = String(uri || '');
  const i = s.indexOf('base64,');
  return i >= 0 ? s.slice(i + 'base64,'.length) : '';
}

// Vercel refuses request bodies over 4.5 MB before the save route runs, so a report PDF
// whose base64 is larger than this is left off and the summary is saved alone.
export const MAX_ATTACHED_PDF_BASE64 = 4_400_000;
