// Shared request checks for the analyzer's API routes. Vercel does not serve files in
// api/ whose names start with "_", so this is a helper, not an endpoint.
//
// Why (2026-10-12): the analyzer's Claude endpoints answered anyone on the internet, with
// open CORS, no sign-in and no rate limit, so they could be used as a free Claude on
// LW360's API key. These checks close the easy paths:
//   1. Same site only. The analyzer's own pages call these routes with fetch('/api/...').
//      Browsers mark those requests Sec-Fetch-Site: same-origin and send an Origin that
//      matches the host. Other websites and bare scripts get 403, and there is no CORS
//      allowance, so another site's page cannot call these routes at all.
//      This is not a password: a determined script can copy the headers. The Vercel
//      firewall rate limit on /api/ is the second layer, and putting the analyzer behind
//      a sign-in is the full fix.
//   2. A per-instance rate limit, so a loop against one warm instance stops quickly.
//   3. Size caps, so one request cannot carry an oversized prompt.

const WINDOW_MS = 60_000;
const hits = new Map(); // client ip -> request timestamps in the last window

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '') || req.socket?.remoteAddress || 'unknown';
}

export function isSameSite(req) {
  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  // Current browsers set Sec-Fetch-Site themselves (page scripts can't), so it decides.
  // This also covers a same-origin POST whose Origin is "null" under a strict
  // referrer policy.
  if (fetchSite) return fetchSite === 'same-origin';
  // Older browsers: the Origin they send on POST must match this host.
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  const origin = String(req.headers.origin || '');
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === host; } catch { return false; }
}

function rateLimited(req, limitPerMinute) {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limitPerMinute) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep memory bounded on a long-lived instance
  return false;
}

// Returns true when the request may proceed; otherwise it has already sent the response.
export function guard(req, res, { limitPerMinute = 20, maxBodyBytes = 250_000 } = {}) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  if (!isSameSite(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  if (Number(req.headers['content-length'] || 0) > maxBodyBytes) {
    res.status(413).json({ error: 'Request too large' });
    return false;
  }
  if (rateLimited(req, limitPerMinute)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many requests. Wait a minute and try again.' });
    return false;
  }
  return true;
}

// Coerce to a string and cap its length.
export function text(value, max) {
  if (value === null || value === undefined) return '';
  return (typeof value === 'string' ? value : String(value)).slice(0, max);
}

// A finite number, or null.
export function num(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
