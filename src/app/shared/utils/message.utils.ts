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

export function generateCollectionMessage(input: CollectionMessageInput): string {
  const totalFormatted = formatRoomAmount(input.total, input.currency);
  const perPayerFormatted = formatRoomAmount(input.amountPerPayer, input.currency);

  const lines: string[] = [`Expenses for ${input.monthLabel}`, '', `Total: ${totalFormatted}`];

  if (input.includeDetail) {
    lines.push(`Split between ${input.payerCount}: ${perPayerFormatted} each`);
    lines.push('', 'Detail:');
    for (const item of input.categoryBreakdown) {
      lines.push(`- ${item.categoryName}: ${formatRoomAmount(item.amount, input.currency)}`);
    }
    lines.push('', `Please transfer ${perPayerFormatted} each.`);
  } else {
    lines.push(`Split between ${input.payerCount}: ${perPayerFormatted} each.`);
    lines.push('', `Please transfer ${perPayerFormatted} each.`);
  }

  return lines.join('\n');
}
