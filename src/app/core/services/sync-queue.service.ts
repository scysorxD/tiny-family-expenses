import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Expense, SyncEntityType, SyncQueueItem } from '../models';
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

interface CategoryCreatePayload {
  id: string;
  roomId: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

interface NamedCreatePayload {
  id: string;
  roomId: string;
  name: string;
}

interface NamedUpdatePayload {
  id: string;
  name?: string;
  isActive?: boolean;
}

interface IdPayload {
  id: string;
}

function buildNamedPatch(payload: NamedUpdatePayload): Record<string, unknown> {
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (payload.name !== undefined) {
    patch['name'] = payload.name;
  }
  if (payload.isActive !== undefined) {
    patch['is_active'] = payload.isActive;
  }
  return patch;
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
      this._conflicts.set(await this.store.conflictCount());
    } catch {
      // Local store unavailable; leave the current counts untouched.
    }
  }

  listItems(): Promise<SyncQueueItem[]> {
    return this.store.listQueueAll();
  }

  async retry(item: SyncQueueItem): Promise<void> {
    await this.store.resetQueueItem(item.localId);
    if (item.entityType === 'expense') {
      const id = (item.payload as { id?: string }).id;
      if (id) {
        await this.store.setExpenseSyncStatus(id, 'pending_sync');
      }
    }
    await this.refreshPending();
    await this.process('manual');
  }

  async discard(item: SyncQueueItem): Promise<void> {
    if (item.entityType === 'expense') {
      const id = (item.payload as { id?: string }).id;
      if (id) {
        if (item.operation === 'create') {
          await this.store.deleteExpenseLocal(id);
        } else {
          await this.store.setExpenseSyncStatus(id, 'synced');
        }
      }
    }
    await this.store.removeQueueItem(item.localId);
    await this.refreshPending();
  }

  async process(_reason: string = 'manual'): Promise<void> {
    if (!this.enabled || this._syncing()) {
      return;
    }
    if (!(await this.connectivity.isOnline())) {
      return;
    }

    this._syncing.set(true);

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
      await this.refreshPending();
      this._syncing.set(false);
    }
  }

  private async replay(
    entityType: string,
    operation: string,
    payload: unknown,
  ): Promise<void> {
    switch (entityType) {
      case 'expense':
        await this.replayExpense(operation, payload);
        return;
      case 'category':
        await this.replayCategory(operation, payload);
        return;
      case 'beneficiary':
        await this.replayNamed('beneficiaries', operation, payload);
        return;
      case 'payer':
        await this.replayNamed('payers', operation, payload);
        return;
      default:
        return;
    }
  }

  private async replayExpense(operation: string, payload: unknown): Promise<void> {
    if (operation === 'create') {
      await this.replayCreate(payload as ExpenseCreatePayload);
    } else if (operation === 'update') {
      await this.replayUpdate(payload as ExpenseUpdatePayload);
    } else if (operation === 'delete') {
      await this.replayDelete(payload as ExpenseDeletePayload);
    }
  }

  private async replayCategory(operation: string, payload: unknown): Promise<void> {
    if (operation === 'create') {
      const p = payload as CategoryCreatePayload;
      const { error } = await this.client.from('categories').upsert(
        { id: p.id, room_id: p.roomId, name: p.name, created_by: p.createdBy, created_at: p.createdAt },
        { onConflict: 'id' },
      );
      if (error) {
        throw error;
      }
    } else if (operation === 'update') {
      const p = payload as NamedUpdatePayload;
      const { error } = await this.client.from('categories').update(buildNamedPatch(p)).eq('id', p.id);
      if (error) {
        throw error;
      }
    } else if (operation === 'delete') {
      const { error } = await this.client
        .from('categories')
        .delete()
        .eq('id', (payload as IdPayload).id);
      if (error) {
        throw error;
      }
    }
  }

  private async replayNamed(
    table: 'beneficiaries' | 'payers',
    operation: string,
    payload: unknown,
  ): Promise<void> {
    if (operation === 'create') {
      const p = payload as NamedCreatePayload;
      const { error } = await this.client
        .from(table)
        .upsert({ id: p.id, room_id: p.roomId, name: p.name }, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    } else if (operation === 'update') {
      const p = payload as NamedUpdatePayload;
      const { error } = await this.client.from(table).update(buildNamedPatch(p)).eq('id', p.id);
      if (error) {
        throw error;
      }
    } else if (operation === 'delete') {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', (payload as IdPayload).id);
      if (error) {
        throw error;
      }
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
    } else if (entityType === 'category' && operation !== 'delete') {
      const id = (payload as { id: string }).id;
      await this.store.setCategorySyncStatus(id, 'synced');
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

  async enqueueWrite(
    entityType: SyncEntityType,
    operation: 'create' | 'update' | 'delete',
    localId: string,
    payload: unknown,
  ): Promise<void> {
    await this.store.enqueue({
      localId,
      entityType,
      operation,
      payload,
      attemptCount: 0,
      status: 'pending_sync',
    });
    await this.refreshPending();
  }
}
