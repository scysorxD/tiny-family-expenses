import { formatAmount } from './currency.utils';

describe('formatAmount', () => {
  it('formats whole amounts with the requested currency', () => {
    const formatted = formatAmount(30000, 'ARS');

    expect(formatted).toContain('ARS');
    expect(formatted).toContain('30,000');
  });

  it('keeps cents when the amount has decimals', () => {
    expect(formatAmount(30000.5, 'USD')).toBe('$30,000.50');
  });

  it('rejects non-finite amounts', () => {
    expect(() => formatAmount(Number.NaN, 'ARS')).toThrowError(
      'Cannot format a non-finite amount.',
    );
  });
});
