// Server-side proxy: analyzer results -> LW360 pipeline (save-analysis edge fn).
// Keeps ANALYZER_INGEST_SECRET off the browser. Summary figures only — NO
// per-employee rows, NO SSNs. Internal sales tool; this is an inbound write to
// our own platform, not an outbound communication.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const url = process.env.LW360_INGEST_URL;
  const secret = process.env.ANALYZER_INGEST_SECRET;
  if (!url || !secret) return res.status(503).json({ error: 'Pipeline handoff not configured' });

  const { companyName, companyType, aggregates, contact } = req.body || {};
  if (!companyName || !aggregates) return res.status(400).json({ error: 'companyName and aggregates required' });

  const payload = {
    company_name: String(companyName).slice(0, 200),
    company_type: companyType || null,
    headcount: aggregates.totalEmployees ?? null,
    eligible_count: aggregates.totalQualified ?? null,
    est_employer_fica_savings: aggregates.totalNetAnnualERSavings ?? null,
    avg_net_benefit: aggregates.averageMonthlyBenefit ?? null,
    scored_at: new Date().toISOString(),
    source: 'census-analyzer',
  };
  // Optional business contact only (name/email/phone) — never SSNs.
  if (contact && (contact.name || contact.email || contact.phone)) {
    payload.contact = {
      name: contact.name || null,
      email: contact.email || null,
      phone: contact.phone || null,
    };
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-analyzer-secret': secret },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.error || 'Pipeline save failed' });
    return res.status(200).json({ ok: true, organization: data.organization || null, created: data.created ?? null });
  } catch (_e) {
    return res.status(502).json({ error: 'Could not reach the pipeline. Try again in a moment.' });
  }
}
