/**
 * Format a number as USD currency.
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as a percentage.
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with commas.
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Get pay frequency label for display.
 */
export function getPayFrequencyLabel(frequency) {
  const labels = {
    Weekly: 'Weekly',
    Biweekly: 'Bi-Weekly',
    'Semi-Monthly': 'Semi-Monthly',
    Monthly: 'Monthly',
  };
  return labels[frequency] || frequency;
}

/**
 * Format date for display.
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
