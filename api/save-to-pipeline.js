import { guard, text, num } from './_guard.js';

// Server-side proxy: analyzer results -> LW360 pipeline (save-analysis edge fn).
// Keeps ANALYZER_INGEST_SECRET off the browser. Summary figures only — NO
// per-employee rows, NO SSNs. Internal sales tool; this is an inbound write to
// our own platform, not an outbound communication.
// Company types the analyzer produces; anything else is stored as null.
const COMPANY_TYPES = new Set(['Non-FICA', 'FICA-School', 'Private']);

export default async function handler(req, res) {
  // Same-site, rate-limited and size-capped (see _guard.js): this route writes into the
  // LW360 pipeline, so it must not be callable by other sites or bare scripts.
  if (!guard(req, res, { limitPerMinute: 10, maxBodyBytes: 20_000 })) return;
  const url = process.env.LW360_INGEST_URL;
  const secret = process.env.ANALYZER_INGEST_SECRET;
  if (!url || !secret) return res.status(503).json({ error: 'Pipeline handoff not configured' });

  const { companyName, companyType, aggregates, contact } = req.body || {};
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
