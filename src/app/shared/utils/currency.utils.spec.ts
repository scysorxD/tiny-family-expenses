import { formatAmount, formatRoomAmount, localeForCurrency } from './currency.utils';

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

  it('honours an explicit locale', () => {
    const formatted = formatAmount(1234.5, 'EUR', 'de-DE');
    expect(formatted).toContain('1.234,50');
  });
});

describe('localeForCurrency', () => {
  it('maps known currencies to regional locales', () => {
    expect(localeForCurrency('ARS')).toBe('es-AR');
    expect(localeForCurrency('brl')).toBe('pt-BR');
  });

  it('falls back to en-US for unknown currencies', () => {
    expect(localeForCurrency('XYZ')).toBe('en-US');
  });
});

describe('formatRoomAmount', () => {
  it('formats using the currency-specific locale', () => {
    expect(() => formatRoomAmount(1000, 'ARS')).not.toThrow();
    expect(formatRoomAmount(1000, 'ARS')).toContain('1.000');
  });
});
