const CURRENCY_LOCALES: Record<string, string> = {
  ARS: 'es-AR',
  USD: 'en-US',
  EUR: 'es-ES',
  BRL: 'pt-BR',
  CLP: 'es-CL',
  MXN: 'es-MX',
};

export function localeForCurrency(currency: string): string {
  return CURRENCY_LOCALES[currency?.toUpperCase()] ?? 'en-US';
}

export function formatAmount(amount: number, currency: string, locale = 'en-US'): string {
  if (!Number.isFinite(amount)) {
    throw new Error('Cannot format a non-finite amount.');
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatRoomAmount(amount: number, currency: string): string {
  return formatAmount(amount, currency, localeForCurrency(currency));
}
