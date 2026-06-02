const DATE_STRING_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toMonthKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot derive month key from an invalid date.');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

export function monthKeyFromDateString(dateString: string): string {
  const match = DATE_STRING_PATTERN.exec(dateString);

  if (!match) {
    throw new Error(`Cannot derive month key from an invalid date string: ${dateString}`);
  }

  return `${match[1]}-${match[2]}`;
}

export function toDateString(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Cannot derive a date string from an invalid date.');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function todayDateString(): string {
  return toDateString(new Date());
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);

  if (!match) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1 + delta;

  return toMonthKey(new Date(year, monthIndex, 1));
}

export function monthLabel(monthKey: string, locale = 'en-US'): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);

  if (!match) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, monthIndex, 1),
  );
}
