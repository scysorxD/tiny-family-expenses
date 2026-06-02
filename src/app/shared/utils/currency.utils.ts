export function formatAmount(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) {
    throw new Error('Cannot format a non-finite amount.');
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
