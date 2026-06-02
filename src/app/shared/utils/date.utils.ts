export function toMonthKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot derive month key from an invalid date.');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}
