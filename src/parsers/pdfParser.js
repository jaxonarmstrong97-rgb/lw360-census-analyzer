import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const rows = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by y-position to form rows
    const lineMap = {};
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push({ x: item.transform[4], text: item.str });
    }

    // Sort by y descending (top to bottom), then x ascending within each line
    const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const lineItems = lineMap[y].sort((a, b) => a.x - b.x);
      const lineText = lineItems.map(i => i.text.trim()).filter(t => t.length > 0);
      if (lineText.length > 0) {
        rows.push(lineText);
      }
    }
  }

  return rows;
}
