import { generateCollectionMessage } from './message.utils';

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
    const message = generateCollectionMessage({ ...base, includeDetail: true });
    expect(message).toContain('Expenses for May 2026');
    expect(message).toContain('Detail:');
    expect(message).toContain('Medicine');
    expect(message).toContain('Please transfer');
  });

  it('omits the detail section when not requested', () => {
    const message = generateCollectionMessage({ ...base, includeDetail: false });
    expect(message).not.toContain('Detail:');
    expect(message).not.toContain('Medicine');
    expect(message).toContain('Split between 3');
  });
});
