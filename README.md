# LW360 Census Analyzer

Client-side census analysis tool (AI column mapping + SIMRP eligibility scoring + branded PDFs).

## Environment variables (Vercel)

| Var | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Server-side key for `api/analyze-columns.js` and `api/chat.js` (never exposed to the client). |
| `ANTHROPIC_MODEL` | Optional. Overrides the model id used by both API functions. Defaults to `claude-opus-4-8`. The old hard-coded `claude-sonnet-4-20250514` was a dead id that would 404 the API — set this to roll the model forward without a code change. |

## "Save to LW360 pipeline" handoff (CODE WIRED — env secrets pending)

**Status update 2026-07-13:** the UI button ("Save to LW360 pipeline →" in
`src/components/OutputGenerator.jsx`) and the server-side proxy (`api/save-to-pipeline.js`)
were committed 2026-07-06, and the `save-analysis` edge function is deployed on the main
Supabase project. The seam fails closed until the two Vercel env vars below are set —
that is the only remaining activation step.

The monorepo (`lw360-central`) exposes a service-role edge function `save-analysis`
that ingests an analysis summary and upserts an `organizations` row (pipeline_stage
`Analysis Ready`), so analyzed prospects flow into the platform instead of evaporating
into a downloaded PDF.

To activate:

1. In the monorepo, set the shared secret and deploy the function (see that repo's
   deploy steps). The analyzer needs the SAME secret value.
2. Add these Vercel env vars to THIS app:
   - `LW360_INGEST_URL` = `https://<project-ref>.functions.supabase.co/save-analysis`
   - `ANALYZER_INGEST_SECRET` = the shared secret (same value as the monorepo).
3. Add a thin server-side proxy (do NOT expose the secret to the browser) — e.g.
   `api/save-to-pipeline.js`:

   ```js
   export default async function handler(req, res) {
     if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
     const url = process.env.LW360_INGEST_URL;
     const secret = process.env.ANALYZER_INGEST_SECRET;
     if (!url || !secret) return res.status(503).json({ error: 'Pipeline handoff not configured' });

     // Summary figures only — NO per-employee rows, NO SSNs.
     const { companyName, aggregates, contact } = req.body;
     const payload = {
       company_name: companyName,
       headcount: aggregates?.totalEmployees ?? null,
       eligible_count: aggregates?.totalQualified ?? null,
       est_employer_fica_savings: aggregates?.totalNetAnnualERSavings ?? null,
       avg_net_benefit: aggregates?.averageMonthlyBenefit ?? null,
       scored_at: new Date().toISOString(),
       source: 'census-analyzer',
       // optional business contact only (name/email/phone) — never SSNs:
       contact: contact || undefined,
     };

     const r = await fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'x-analyzer-secret': secret },
       body: JSON.stringify(payload),
     });
     const data = await r.json().catch(() => ({}));
     return res.status(r.status).json(data);
   }
   ```

   Then a "Save to LW360 pipeline" button in `OutputGenerator.jsx` would POST
   `{ companyName, aggregates: results.aggregates }` to `/api/save-to-pipeline`.
   The edge function upserts by company name and is additive-only (it never
   overwrites a real org's stage/contact/broker).

---

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
