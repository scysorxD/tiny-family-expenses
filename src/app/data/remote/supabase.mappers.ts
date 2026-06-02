import {
  Beneficiary,
  Category,
  Expense,
  Payer,
  Period,
  PeriodPayerStatus,
  PeriodStatus,
  Room,
  RoomRole,
} from '../../core/models';

export interface RoomRow {
  id: string;
  name: string;
  currency: string;
  include_detail_in_message: boolean;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  archived_at: string | null;
}

export interface CategoryRow {
  id: string;
  room_id: string;
  name: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

export interface NamedActiveRow {
  id: string;
  room_id: string;
  name: string;
  is_active: boolean;
}

export interface ExpenseRow {
  id: string;
  room_id: string;
  category_id: string;
  amount: number | string;
  description: string | null;
  expense_date: string;
  month_key: string;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface PeriodRow {
  id: string;
  room_id: string;
  month_key: string;
  status: PeriodStatus;
  system_total: number | string | null;
  system_amount_per_payer: number | string | null;
  payer_count: number | null;
  final_message: string | null;
  message_generated_at: string | null;
  message_updated_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  reopened_by: string | null;
  reopened_at: string | null;
}

export interface PeriodPayerStatusRow {
  id: string;
  period_id: string;
  payer_id: string;
  amount_due: number | string;
  status: 'pending' | 'paid';
  paid_at: string | null;
  marked_paid_by: string | null;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === 'number' ? value : Number(value);
}

function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    includeDetailInMessage: row.include_detail_in_message,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: optional(row.updated_at),
    archivedAt: optional(row.archived_at),
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: optional(row.updated_at),
    syncStatus: 'synced',
  };
}

export function mapBeneficiary(row: NamedActiveRow): Beneficiary {
  return { id: row.id, roomId: row.room_id, name: row.name, isActive: row.is_active };
}

export function mapPayer(row: NamedActiveRow): Payer {
  return { id: row.id, roomId: row.room_id, name: row.name, isActive: row.is_active };
}

export function mapExpense(row: ExpenseRow, beneficiaryIds: string[]): Expense {
  return {
    id: row.id,
    roomId: row.room_id,
    categoryId: row.category_id,
    amount: toNumber(row.amount),
    description: optional(row.description),
    expenseDate: row.expense_date,
    monthKey: row.month_key,
    beneficiaryIds,
    createdBy: row.created_by,
    updatedBy: optional(row.updated_by),
    deletedBy: optional(row.deleted_by),
    createdAt: row.created_at,
    updatedAt: optional(row.updated_at),
    deletedAt: optional(row.deleted_at),
    syncStatus: 'synced',
  };
}

export function mapPeriod(row: PeriodRow): Period {
  return {
    id: row.id,
    roomId: row.room_id,
    monthKey: row.month_key,
    status: row.status,
    systemTotal: row.system_total === null ? undefined : toNumber(row.system_total),
    systemAmountPerPayer:
      row.system_amount_per_payer === null ? undefined : toNumber(row.system_amount_per_payer),
    payerCount: optional(row.payer_count),
    finalMessage: optional(row.final_message),
    messageGeneratedAt: optional(row.message_generated_at),
    messageUpdatedAt: optional(row.message_updated_at),
    closedBy: optional(row.closed_by),
    closedAt: optional(row.closed_at),
    reopenedBy: optional(row.reopened_by),
    reopenedAt: optional(row.reopened_at),
  };
}

export function mapPeriodPayerStatus(row: PeriodPayerStatusRow): PeriodPayerStatus {
  return {
    id: row.id,
    periodId: row.period_id,
    payerId: row.payer_id,
    amountDue: toNumber(row.amount_due),
    status: row.status,
    paidAt: optional(row.paid_at),
    markedPaidBy: optional(row.marked_paid_by),
  };
}

export interface RoomMembership {
  room: Room;
  role: RoomRole;
}
