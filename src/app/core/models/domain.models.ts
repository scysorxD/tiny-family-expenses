export type RoomRole = 'admin' | 'guest';

export type PeriodStatus = 'open' | 'closed' | 'partially_paid' | 'paid';

export type SyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';

export interface Room {
  id: string;
  name: string;
  currency: string;
  includeDetailInMessage: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface RoomUser {
  id: string;
  roomId: string;
  userId: string;
  role: RoomRole;
  createdAt: string;
}

export interface Category {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  syncStatus?: SyncStatus;
}

export interface Beneficiary {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
}

export interface Payer {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  roomId: string;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  monthKey: string;
  beneficiaryIds: string[];
  createdBy: string;
  updatedBy?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  syncStatus?: SyncStatus;
}

export interface Period {
  id: string;
  roomId: string;
  monthKey: string;
  status: PeriodStatus;
  systemTotal?: number;
  systemAmountPerPayer?: number;
  payerCount?: number;
  finalMessage?: string;
  messageGeneratedAt?: string;
  messageUpdatedAt?: string;
  closedBy?: string;
  closedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
}

export interface PeriodPayerStatus {
  id: string;
  periodId: string;
  payerId: string;
  amountDue: number;
  status: 'pending' | 'paid';
  paidAt?: string;
  markedPaidBy?: string;
}

export type SyncEntityType = 'expense' | 'category' | 'beneficiary' | 'payer';

export interface SyncQueueItem {
  localId: string;
  entityType: SyncEntityType;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  attemptCount: number;
  lastAttemptAt?: string;
  status: SyncStatus;
  errorMessage?: string;
}

export interface UserPreferences {
  userId: string;
  lastRoomId?: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface PendingInvitation {
  id: string;
  roomId: string;
  roomName: string;
  role: RoomRole;
  invitedByName: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface RoomInvitation {
  id: string;
  roomId: string;
  email: string;
  role: RoomRole;
  status: InvitationStatus;
  invitedBy: string;
  acceptedBy?: string;
  acceptedAt?: string;
  createdAt: string;
}
