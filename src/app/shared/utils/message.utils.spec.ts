import { en } from '../../core/i18n/locales/en';
import { generateCollectionMessage } from './message.utils';

// Resolves a dotted key against the real English locale and interpolates {{params}},
// mirroring how TranslateService.instant behaves at runtime.
function translate(key: string, params?: Record<string, unknown>): string {
  const raw = key
    .split('.')
    .reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], en);
  let out = typeof raw === 'string' ? raw : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      out = out.replace(new RegExp(`{{\\s*${name}\\s*}}`, 'g'), String(value));
    }
  }
  return out;
}

describe('generateCollectionMessage', () => {
  const base = {
    monthLabel: 'May 2026',
    total: 90000,
    payerCount: 3,
    amountPerPayer: 30000,
    currency: 'ARS',
    categoryBreakdown: [
      { categoryName: 'Medicine', amount: 30000 },
      { categoryName: 'Transportation', amount: 20000 },
      { categoryName: 'Food', amount: 40000 },
    ],
  };

  it('includes the category detail when requested', () => {
    const message = generateCollectionMessage({ ...base, includeDetail: true }, translate);
    expect(message).toContain('Expenses for May 2026');
    expect(message).toContain('Detail:');
    expect(message).toContain('Medicine');
    expect(message).toContain('Please transfer');
  });

  it('omits the detail section when not requested', () => {
    const message = generateCollectionMessage({ ...base, includeDetail: false }, translate);
    expect(message).not.toContain('Detail:');
    expect(message).not.toContain('Medicine');
    expect(message).toContain('Split between 3');
  });
});
