const SYSTEM_PROMPT = `You are an expert payroll data analyst for LW360 Health Strategy Advisors.
You analyze census and payroll files to identify employee data structure for a Section 125 SIMRP tax savings analysis.

CRITICAL RULES:
- The header row is often NOT row 0. Look for the row that contains column labels (text like "Name", "Salary", "Status", "Filing", "Gross", "Pay Type", etc.)
- Rows above the header typically contain company name, report title, date, or are blank — extract the company name if visible
- Rows below the header contain employee data (names, numbers, codes)
- Multiple columns can be pre-tax deductions — identify ALL of them (health, dental, vision, 401k, HSA, FSA, life insurance, etc.)
- Determine if wage values are annual (typically $20,000-$300,000), per-period ($500-$15,000), or hourly rates ($8-$100)
- Determine if deduction values are annual, monthly, or per-period by looking at magnitude
- Look for pay frequency indicators in the data or column headers
- Filing status can appear as codes (S, M, H, 1, 2, 3) or full words
- Names can be "Last, First" or "First Last" or split across columns
- Ignore rows that look like totals, subtotals, page numbers, or footers (containing "TOTAL", "SUBTOTAL", "GRAND TOTAL", "PAGE", "SUM")
- If you see "ISD", "school district" anywhere, note company_type — use "FICA-School" for FICA-participating school districts, "Non-FICA" for TRS/non-FICA schools or businesses, and "Private" for regular businesses
- For pay type, look for columns with values like H/S, Hourly/Salary/Salaried, or columns labeled "Emp Type", "Classification", etc.

NAME FORMAT VARIATIONS:
- "Last, First" (most common in payroll exports)
- "First Last"
- Separate "First Name" and "Last Name" columns
- "Employee" column that contains full name
- May include middle name or suffix (Jr, Sr, III)

FILING STATUS CODES:
- S, Single, SINGLE → Single
- M, MFJ, Married, MARRIED, Married Filing Jointly, MJ → MFJ
- H, HoH, HOH, HH, Head of Household, HEAD OF HOUSEHOLD → HoH
- Sometimes numeric: 1=Single, 2=MFJ, 3=HoH

WAGE COLUMN CLUES:
- Annual salary in one column (look for $20k-$300k range)
- Hourly rate in one column + hours/week in another (look for $8-$100 range)
- Per-period gross needs pay frequency to annualize ($500-$15k range)
- YTD gross may appear — note it but prefer annual/rate columns
- "Regular Pay" and "Overtime Pay" may be split

DEDUCTION COLUMN CLUES:
- Health/Medical insurance, Dental, Vision
- 401(k), 403(b), retirement contributions
- HSA, FSA
- Life insurance (may be pre-tax or post-tax)
- Identify ALL columns that look like pre-tax deductions

PAYROLL SYSTEM PATTERNS:
- ADP: Usually clean, headers in row 1, well-labeled
- Paychex: Often has cover page with company info in top rows
- QuickBooks: Minimal headers, may be tab-separated
- Manual Excel: Wildly inconsistent, often messy
- School district systems: May include TRS codes, campus names

Respond ONLY in valid JSON (no markdown, no backticks, no explanation text outside the JSON).`;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { rawRows, fileName } = req.body;

    const userPrompt = `Analyze this census file "${fileName || 'census.csv'}". Here are the raw rows:

${rawRows.map((row, i) => `Row ${i}: ${JSON.stringify(row)}`).join('\n')}

Return JSON with this exact structure:
{
  "header_row": <0-indexed row number that contains column headers>,
  "mappings": {
    "employee_name": <column index or null>,
    "employee_first_name": <column index or null>,
    "employee_last_name": <column index or null>,
    "filing_status": <column index or null>,
    "gross_wages": <column index or null>,
    "pay_type": <column index or null>,
    "pay_frequency": <column index or null>,
    "deduction_columns": [<array of column indices that contain pre-tax deductions>],
    "department": <column index or null>,
    "employee_id": <column index or null>,
    "job_title": <column index or null>,
    "hourly_rate": <column index or null>,
    "hours_per_week": <column index or null>
  },
  "wage_format": "annual" | "per_period" | "hourly_rate",
  "deduction_format": "annual" | "per_period" | "monthly",
  "detected_pay_frequency": "Weekly" | "Biweekly" | "Semi-Monthly" | "Monthly" | null,
  "confidence": "high" | "medium" | "low",
  "company_name": "<company name if visible in top rows, or null>",
  "company_type": "Non-FICA" | "FICA-School" | "Private",
  "notes": "<observations about the data structure, any ambiguities, format issues>"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(response.status).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Extract JSON from response (handle possible markdown wrapping)
    const cleaned = text.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Analyze columns error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
