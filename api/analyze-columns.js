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
    const { headers, sampleRows } = req.body;

    const prompt = `You are analyzing a census/payroll data file to identify which columns map to the following fields needed for a Section 125 SIMRP tax savings analysis.

Here are the column headers:
${JSON.stringify(headers)}

Here are the first few data rows:
${sampleRows.map((r, i) => `Row ${i + 1}: ${JSON.stringify(r)}`).join('\n')}

Identify which column index (0-based) maps to each of these fields:
- name: Employee full name (or first+last combined)
- firstName: First name only
- lastName: Last name only
- filingStatus: Tax filing status (Single/S, Married/MFJ/M, Head of Household/HOH/HH)
- annualGross: Annual gross wages/salary/compensation
- payType: Hourly vs Salary (H/S, Hourly/Salary/Salaried)
- existingDeductions: Existing pre-tax deductions (health insurance, 401k, HSA, dental, vision, etc.)
- department: Department name
- jobTitle: Job title/position
- employeeId: Employee ID number

Also determine:
- wageType: Are the wage amounts "annual" or "per-period"? Look at the magnitude of numbers.
- deductionType: Are deduction amounts "annual" or "per-period"?

Respond ONLY with valid JSON in this exact format (use null for fields you can't identify):
{
  "mappings": {
    "name": <index or null>,
    "firstName": <index or null>,
    "lastName": <index or null>,
    "filingStatus": <index or null>,
    "annualGross": <index or null>,
    "payType": <index or null>,
    "existingDeductions": <index or null>,
    "department": <index or null>,
    "jobTitle": <index or null>,
    "employeeId": <index or null>
  },
  "wageType": "annual" or "per-period",
  "deductionType": "annual" or "per-period",
  "confidence": "high" or "medium" or "low",
  "notes": "<brief explanation of any ambiguities or issues found>"
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
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(response.status).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
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
