import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Expense } from '../models';
import { ExpenseRow, mapExpense } from '../../data/remote/supabase.mappers';
import { LocalStore } from '../../data/local/local-store.service';
import { monthKeyFromDateString, newId, nowIso } from '../../shared/utils';
import { AuthService } from '../auth/auth.service';
import { ConnectivityService } from './connectivity.service';
import { SupabaseService } from './supabase.service';
import { SyncQueueService } from './sync-queue.service';

export interface NewExpenseInput {
  roomId: string;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  beneficiaryIds: string[];
}

export interface ExpenseUpdate {
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  beneficiaryIds: string[];
}

type ExpenseRowWithBeneficiaries = ExpenseRow & {
  expense_beneficiaries: { beneficiary_id: string }[] | null;
};

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(LocalStore);
  private readonly syncQueue = inject(SyncQueueService);
  private readonly connectivity = inject(ConnectivityService);

  private get client() {
    return this.supabase.client;
  }

  private get native(): boolean {
    return Capacitor.isNativePlatform();
  }

  async listByMonth(roomId: string, monthKey: string): Promise<Expense[]> {
    if (!this.native) {
      return this.fetchRemoteByMonth(roomId, monthKey);
    }

    if (await this.connectivity.isOnline()) {
      try {
        const remote = await this.fetchRemoteByMonth(roomId, monthKey);
        await this.store.cacheRemoteExpenses(remote);
      } catch {
        // Offline or transient error; fall back to whatever is cached locally.
      }
    }

    return this.store.listExpensesByMonth(roomId, monthKey);
  }

  private async fetchRemoteByMonth(roomId: string, monthKey: string): Promise<Expense[]> {
    const { data, error } = await this.client
      .from('expenses')
      .select('*, expense_beneficiaries(beneficiary_id)')
      .eq('room_id', roomId)
      .eq('month_key', monthKey)
      .is('deleted_at', null)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as unknown as ExpenseRowWithBeneficiaries[]).map((row) =>
      mapExpense(
        row,
        (row.expense_beneficiaries ?? []).map((link) => link.beneficiary_id),
      ),
    );
  }

  async getMonthTotal(roomId: string, monthKey: string): Promise<number> {
    if (this.native) {
      const expenses = await this.listByMonth(roomId, monthKey);
      return expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }

    const { data, error } = await this.client
      .from('expenses')
      .select('amount')
      .eq('room_id', roomId)
      .eq('month_key', monthKey)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    return ((data ?? []) as { amount: number | string }[]).reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    );
  }

  async create(input: NewExpenseInput): Promise<Expense> {
    const userId = this.auth.userId;
    if (!userId) {
      throw new Error('NOT_AUTHENTICATED');
    }

    if (this.native) {
      const expense: Expense = {
        id: newId(),
        roomId: input.roomId,
        categoryId: input.categoryId,
        amount: input.amount,
        description: input.description?.trim() || undefined,
        expenseDate: input.expenseDate,
        monthKey: monthKeyFromDateString(input.expenseDate),
        beneficiaryIds: input.beneficiaryIds,
        createdBy: userId,
        createdAt: nowIso(),
        syncStatus: 'pending_sync',
      };
      await this.store.upsertExpense(expense, 'pending_sync');
      await this.syncQueue.enqueueCreate(expense);
      void this.syncQueue.process('expense-create');
      return expense;
    }

    const { data, error } = await this.client
      .from('expenses')
      .insert({
        room_id: input.roomId,
        category_id: input.categoryId,
        amount: input.amount,
        description: input.description?.trim() || null,
        expense_date: input.expenseDate,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const row = data as ExpenseRow;
    await this.replaceBeneficiaries(row.id, input.beneficiaryIds);
    return mapExpense(row, input.beneficiaryIds);
  }

  async update(expenseId: string, patch: ExpenseUpdate): Promise<void> {
    const userId = this.auth.userId;

    if (this.native) {
      await this.store.applyExpenseUpdate(
        expenseId,
        { ...patch, updatedBy: userId ?? undefined },
        'pending_sync',
      );
      await this.syncQueue.enqueueUpdate({
        id: expenseId,
        categoryId: patch.categoryId,
        amount: patch.amount,
        description: patch.description?.trim() || undefined,
        expenseDate: patch.expenseDate,
        beneficiaryIds: patch.beneficiaryIds,
        updatedBy: userId ?? undefined,
      });
      void this.syncQueue.process('expense-update');
      return;
    }

    const { error } = await this.client
      .from('expenses')
      .update({
        category_id: patch.categoryId,
        amount: patch.amount,
        description: patch.description?.trim() || null,
        expense_date: patch.expenseDate,
        updated_by: userId,
        updated_at: nowIso(),
      })
      .eq('id', expenseId);

    if (error) {
      throw error;
    }

    await this.replaceBeneficiaries(expenseId, patch.beneficiaryIds);
  }

  async softDelete(expenseId: string): Promise<void> {
    const userId = this.auth.userId;

    if (this.native) {
      const deletedAt = nowIso();
      await this.store.softDeleteExpense(expenseId, userId ?? '', 'pending_sync');
      await this.syncQueue.enqueueDelete(expenseId, userId ?? undefined, deletedAt);
      void this.syncQueue.process('expense-delete');
      return;
    }

    const { error } = await this.client
      .from('expenses')
      .update({
        deleted_at: nowIso(),
        deleted_by: userId,
        updated_by: userId,
        updated_at: nowIso(),
      })
      .eq('id', expenseId);

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
}
