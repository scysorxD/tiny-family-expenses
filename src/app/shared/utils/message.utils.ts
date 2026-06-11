import { formatRoomAmount } from './currency.utils';

export interface CategoryBreakdownItem {
  categoryName: string;
  amount: number;
}

export interface CollectionMessageInput {
  monthLabel: string;
  total: number;
  payerCount: number;
  amountPerPayer: number;
  categoryBreakdown: CategoryBreakdownItem[];
  includeDetail: boolean;
  currency: string;
}

export type CollectionMessageTranslator = (
  key: string,
  params?: Record<string, unknown>,
) => string;

export function generateCollectionMessage(
  input: CollectionMessageInput,
  t: CollectionMessageTranslator,
): string {
  const totalFormatted = formatRoomAmount(input.total, input.currency);
  const perPayerFormatted = formatRoomAmount(input.amountPerPayer, input.currency);

  const lines: string[] = [
    t('collections.message.title', { month: input.monthLabel }),
    '',
    t('collections.message.total', { total: totalFormatted }),
  ];

  if (input.includeDetail) {
    lines.push(
      t('collections.message.splitDetail', { count: input.payerCount, perPayer: perPayerFormatted }),
    );
    lines.push('', t('collections.message.detail'));
    for (const item of input.categoryBreakdown) {
      lines.push(
        t('collections.message.item', {
          name: item.categoryName,
          amount: formatRoomAmount(item.amount, input.currency),
        }),
      );
    }
    lines.push('', t('collections.message.transfer', { perPayer: perPayerFormatted }));
  } else {
    lines.push(
      t('collections.message.split', { count: input.payerCount, perPayer: perPayerFormatted }),
    );
    lines.push('', t('collections.message.transfer', { perPayer: perPayerFormatted }));
  }

  return lines.join('\n');
}
