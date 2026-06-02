import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Expense } from '../models';
import { LocalStore } from '../../data/local/local-store.service';
import { MAX_SYNC_ATTEMPTS, classifySyncError, nowIso } from '../../shared/utils';
import { ConnectivityService } from './connectivity.service';
import { FeedbackService } from './feedback.service';
import { SupabaseService } from './supabase.service';

interface ExpenseCreatePayload {
  id: string;
  roomId: string;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  beneficiaryIds: string[];
  createdBy: string;
  createdAt: string;
}

interface ExpenseUpdatePayload {
  id: string;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  beneficiaryIds: string[];
  updatedBy?: string;
}

interface ExpenseDeletePayload {
  id: string;
  deletedBy?: string;
  deletedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class SyncQueueService {
  private readonly store = inject(LocalStore);
  private readonly supabase = inject(SupabaseService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly feedback = inject(FeedbackService);

  private readonly _pending = signal(0);
  private readonly _syncing = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _conflicts = signal(0);

  readonly pending = this._pending.asReadonly();
  readonly syncing = this._syncing.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly conflicts = this._conflicts.asReadonly();

  private intervalHandle?: ReturnType<typeof setInterval>;

  private get client() {
    return this.supabase.client;
  }

  private get enabled(): boolean {
    return Capacitor.isNativePlatform() && this.supabase.isConfigured;
  }

  start(): void {
    if (!this.enabled) {
      return;
    }
    this.connectivity.onReconnect(() => void this.process('reconnect'));
    this.intervalHandle ??= setInterval(() => void this.process('interval'), 60_000);
    void this.refreshPending();
    void this.process('start');
  }

  async refreshPending(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      this._pending.set(await this.store.pendingCount());
    } catch {
      // Local store unavailable; leave the current count untouched.
    }
  }

  async process(_reason: string = 'manual'): Promise<void> {
    if (!this.enabled || this._syncing()) {
      return;
    }
    if (!(await this.connectivity.isOnline())) {
      return;
    }

    this._syncing.set(true);
    let conflictCount = 0;

    try {
      const queue = await this.store.listQueue();
      for (const item of queue) {
        try {
          await this.replay(item.entityType, item.operation, item.payload);
          await this.markSynced(item.entityType, item.operation, item.payload, item.localId);
          this._lastError.set(null);
        } catch (error) {
          const resolution = classifySyncError(error);
          if (resolution === 'conflict') {
            conflictCount += 1;
            await this.markConflict(item.localId, item.payload, error);
          } else {
            const next =
              item.attemptCount + 1 >= MAX_SYNC_ATTEMPTS ? 'sync_failed' : 'pending_sync';
            await this.store.setQueueStatus(item.localId, next, this.errorText(error));
            this._lastError.set(this.errorText(error));
            break;
          }
        }
      }
    } finally {
      this._conflicts.set(conflictCount);
      await this.refreshPending();
      this._syncing.set(false);
    }
  }

  private async replay(
    entityType: string,
    operation: string,
    payload: unknown,
  ): Promise<void> {
    if (entityType !== 'expense') {
      return;
    }

    if (operation === 'create') {
      await this.replayCreate(payload as ExpenseCreatePayload);
    } else if (operation === 'update') {
      await this.replayUpdate(payload as ExpenseUpdatePayload);
    } else if (operation === 'delete') {
      await this.replayDelete(payload as ExpenseDeletePayload);
    }
  }

  private async replayCreate(payload: ExpenseCreatePayload): Promise<void> {
    const { error } = await this.client.from('expenses').upsert(
      {
        id: payload.id,
        room_id: payload.roomId,
        category_id: payload.categoryId,
        amount: payload.amount,
        description: payload.description?.trim() || null,
        expense_date: payload.expenseDate,
        created_by: payload.createdBy,
        created_at: payload.createdAt,
      },
      { onConflict: 'id' },
    );
    if (error) {
      throw error;
    }
    await this.replaceBeneficiaries(payload.id, payload.beneficiaryIds);
  }

  private async replayUpdate(payload: ExpenseUpdatePayload): Promise<void> {
    const { error } = await this.client
      .from('expenses')
      .update({
        category_id: payload.categoryId,
        amount: payload.amount,
        description: payload.description?.trim() || null,
        expense_date: payload.expenseDate,
        updated_by: payload.updatedBy,
        updated_at: nowIso(),
      })
      .eq('id', payload.id);
    if (error) {
      throw error;
    }
    await this.replaceBeneficiaries(payload.id, payload.beneficiaryIds);
  }

  private async replayDelete(payload: ExpenseDeletePayload): Promise<void> {
    const { error } = await this.client
      .from('expenses')
      .update({
        deleted_at: payload.deletedAt,
        deleted_by: payload.deletedBy,
        updated_by: payload.deletedBy,
        updated_at: nowIso(),
      })
      .eq('id', payload.id);
    if (error) {
      throw error;
    }
  }

  private async replaceBeneficiaries(expenseId: string, beneficiaryIds: string[]): Promise<void> {
    const { error: deleteError } = await this.client
      .from('expense_beneficiaries')
      .delete()
      .eq('expense_id', expenseId);
    if (deleteError) {
      throw deleteError;
    }
    if (beneficiaryIds.length === 0) {
      return;
    }
    const rows = beneficiaryIds.map((beneficiaryId) => ({
      expense_id: expenseId,
      beneficiary_id: beneficiaryId,
    }));
    const { error: insertError } = await this.client.from('expense_beneficiaries').insert(rows);
    if (insertError) {
      throw insertError;
    }
  }

  private async markSynced(
    entityType: string,
    operation: string,
    payload: unknown,
    localId: string,
  ): Promise<void> {
    if (entityType === 'expense') {
      const id = (payload as { id: string }).id;
      await this.store.setExpenseSyncStatus(id, 'synced');
    }
    await this.store.removeQueueItem(localId);
  }

  private async markConflict(localId: string, payload: unknown, error: unknown): Promise<void> {
    await this.store.setQueueStatus(localId, 'conflict', this.errorText(error));
    const id = (payload as { id?: string }).id;
    if (id) {
      await this.store.setExpenseSyncStatus(id, 'conflict');
    }
    await this.feedback.toast(
      'A pending expense could not sync (the month may be closed). Review conflicts.',
      'warning',
    );
  }

  private errorText(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Sync failed';
  }

  // Helpers used by ExpenseService to enqueue local-first writes.

  async enqueueCreate(expense: Expense): Promise<void> {
    const payload: ExpenseCreatePayload = {
      id: expense.id,
      roomId: expense.roomId,
      categoryId: expense.categoryId,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate,
      beneficiaryIds: expense.beneficiaryIds,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt,
    };
    await this.store.enqueue({
      localId: expense.id,
      entityType: 'expense',
      operation: 'create',
      payload,
      attemptCount: 0,
      status: 'pending_sync',
    });
    await this.refreshPending();
  }

  async enqueueUpdate(payload: ExpenseUpdatePayload): Promise<void> {
    await this.store.enqueue({
      localId: `${payload.id}:update`,
      entityType: 'expense',
      operation: 'update',
      payload,
      attemptCount: 0,
      status: 'pending_sync',
    });
    await this.refreshPending();
  }

  async enqueueDelete(id: string, deletedBy: string | undefined, deletedAt: string): Promise<void> {
    const payload: ExpenseDeletePayload = { id, deletedBy, deletedAt };
    await this.store.enqueue({
      localId: `${id}:delete`,
      entityType: 'expense',
      operation: 'delete',
      payload,
      attemptCount: 0,
      status: 'pending_sync',
    });
    await this.refreshPending();
  }
}
