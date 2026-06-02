import { toMonthKey } from './date.utils';

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
