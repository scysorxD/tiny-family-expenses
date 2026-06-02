import {
  monthKeyFromDateString,
  monthLabel,
  toDateString,
  toMonthKey,
  todayDateString,
} from './date.utils';

describe('toMonthKey', () => {
  it('returns YYYY-MM for a middle-of-month date', () => {
    expect(toMonthKey(new Date(2026, 4, 15))).toBe('2026-05');
  });

  it('handles January without dropping the leading zero', () => {
    expect(toMonthKey(new Date(2026, 0, 1))).toBe('2026-01');
  });

  it('handles December at a year boundary', () => {
    expect(toMonthKey(new Date(2025, 11, 31))).toBe('2025-12');
  });

  it('rejects invalid dates', () => {
    expect(() => toMonthKey(new Date(Number.NaN))).toThrowError(
      'Cannot derive month key from an invalid date.',
    );
  });
});

describe('monthKeyFromDateString', () => {
  it('derives the month key without timezone drift', () => {
    expect(monthKeyFromDateString('2026-05-01')).toBe('2026-05');
    expect(monthKeyFromDateString('2026-05-31')).toBe('2026-05');
    expect(monthKeyFromDateString('2026-01-01')).toBe('2026-01');
  });

  it('rejects malformed date strings', () => {
    expect(() => monthKeyFromDateString('2026-5-1')).toThrowError(/invalid date string/);
    expect(() => monthKeyFromDateString('not-a-date')).toThrowError(/invalid date string/);
  });
});

describe('toDateString', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 4, 9))).toBe('2026-05-09');
  });

  it('rejects invalid dates', () => {
    expect(() => toDateString(new Date(Number.NaN))).toThrowError(/invalid date/);
  });
});

describe('todayDateString', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('monthLabel', () => {
  it('renders a human label for a month key', () => {
    expect(monthLabel('2026-05')).toBe('May 2026');
  });

  it('rejects invalid month keys', () => {
    expect(() => monthLabel('2026-5')).toThrowError(/Invalid month key/);
  });
});
