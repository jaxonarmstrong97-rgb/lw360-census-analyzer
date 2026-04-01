import Papa from 'papaparse';

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
      skipEmptyLines: false,
    });
  });
}
