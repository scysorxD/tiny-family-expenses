import { Injectable, inject } from '@angular/core';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Beneficiary, Category, Expense, Payer, SyncQueueItem, SyncStatus } from '../../core/models';
import { monthKeyFromDateString, nowIso } from '../../shared/utils';
import { LocalDatabaseService } from './local-database.service';

type Row = Record<string, unknown>;

const str = (value: unknown): string => (value == null ? '' : String(value));
const optStr = (value: unknown): string | undefined => (value == null ? undefined : String(value));
const num = (value: unknown): number => Number(value ?? 0);
const bool = (value: unknown): boolean => Number(value ?? 0) === 1;

@Injectable({
  providedIn: 'root',
})
export class LocalStore {
  private readonly db = inject(LocalDatabaseService);

  private connection(): Promise<SQLiteDBConnection> {
    return this.db.getConnection();
  }

  // --- Expenses ---------------------------------------------------------

  async upsertExpense(expense: Expense, syncStatus: SyncStatus): Promise<void> {
    const db = await this.connection();
    await db.run(
      `
        INSERT INTO expenses
          (id, room_id, category_id, amount, description, expense_date, month_key,
           created_by, updated_by, deleted_by, created_at, updated_at, deleted_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          category_id = excluded.category_id,
          amount = excluded.amount,
          description = excluded.description,
          expense_date = excluded.expense_date,
          month_key = excluded.month_key,
          updated_by = excluded.updated_by,
          deleted_by = excluded.deleted_by,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          sync_status = excluded.sync_status;
      `,
      [
        expense.id,
        expense.roomId,
        expense.categoryId,
        expense.amount,
        expense.description ?? null,
        expense.expenseDate,
        expense.monthKey || monthKeyFromDateString(expense.expenseDate),
        expense.createdBy,
        expense.updatedBy ?? null,
        expense.deletedBy ?? null,
        expense.createdAt,
        expense.updatedAt ?? null,
        expense.deletedAt ?? null,
        syncStatus,
      ],
    );
    await this.replaceBeneficiaries(db, expense.id, expense.beneficiaryIds);
  }

  private async replaceBeneficiaries(
    db: SQLiteDBConnection,
    expenseId: string,
    beneficiaryIds: string[],
  ): Promise<void> {
    await db.run('DELETE FROM expense_beneficiaries WHERE expense_id = ?;', [expenseId]);
    for (const beneficiaryId of beneficiaryIds) {
      await db.run(
        'INSERT OR IGNORE INTO expense_beneficiaries (expense_id, beneficiary_id) VALUES (?, ?);',
        [expenseId, beneficiaryId],
      );
    }
  }

  async setExpenseSyncStatus(id: string, status: SyncStatus): Promise<void> {
    const db = await this.connection();
    await db.run('UPDATE expenses SET sync_status = ? WHERE id = ?;', [status, id]);
  }

  async applyExpenseUpdate(
    id: string,
    patch: {
      categoryId: string;
      amount: number;
      description?: string;
      expenseDate: string;
      beneficiaryIds: string[];
      updatedBy?: string;
    },
    syncStatus: SyncStatus,
  ): Promise<void> {
    const db = await this.connection();
    await db.run(
      `UPDATE expenses
         SET category_id = ?, amount = ?, description = ?, expense_date = ?, month_key = ?,
             updated_by = ?, updated_at = ?, sync_status = ?
       WHERE id = ?;`,
      [
        patch.categoryId,
        patch.amount,
        patch.description ?? null,
        patch.expenseDate,
        monthKeyFromDateString(patch.expenseDate),
        patch.updatedBy ?? null,
        nowIso(),
        syncStatus,
        id,
      ],
    );
    await this.replaceBeneficiaries(db, id, patch.beneficiaryIds);
  }

  async softDeleteExpense(id: string, userId: string, syncStatus: SyncStatus): Promise<void> {
    const db = await this.connection();
    const timestamp = nowIso();
    await db.run(
      `UPDATE expenses
         SET deleted_at = ?, deleted_by = ?, updated_by = ?, updated_at = ?, sync_status = ?
       WHERE id = ?;`,
      [timestamp, userId, userId, timestamp, syncStatus, id],
    );
  }

  async listExpensesByMonth(roomId: string, monthKey: string): Promise<Expense[]> {
    const db = await this.connection();
    const result = await db.query(
      `SELECT * FROM expenses
        WHERE room_id = ? AND month_key = ? AND deleted_at IS NULL
        ORDER BY expense_date DESC, created_at DESC;`,
      [roomId, monthKey],
    );
    return this.hydrateExpenses(db, result.values ?? []);
  }

  async listUnsyncedExpenses(roomId: string, monthKey: string): Promise<Expense[]> {
    const db = await this.connection();
    const result = await db.query(
      `SELECT * FROM expenses
        WHERE room_id = ? AND month_key = ? AND sync_status IN ('pending_sync','syncing','sync_failed','conflict')
        ORDER BY expense_date DESC, created_at DESC;`,
      [roomId, monthKey],
    );
    return this.hydrateExpenses(db, result.values ?? []);
  }

  async cacheRemoteExpenses(expenses: Expense[]): Promise<void> {
    for (const expense of expenses) {
      await this.upsertExpense(expense, 'synced');
    }
  }

  private async hydrateExpenses(db: SQLiteDBConnection, rows: Row[]): Promise<Expense[]> {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => str(row['id']));
    const placeholders = ids.map(() => '?').join(', ');
    const links = await db.query(
      `SELECT expense_id, beneficiary_id FROM expense_beneficiaries WHERE expense_id IN (${placeholders});`,
      ids,
    );

    const byExpense = new Map<string, string[]>();
    for (const link of links.values ?? []) {
      const expenseId = str((link as Row)['expense_id']);
      const beneficiaryId = str((link as Row)['beneficiary_id']);
      const list = byExpense.get(expenseId) ?? [];
      list.push(beneficiaryId);
      byExpense.set(expenseId, list);
    }

    return rows.map((row) => this.mapExpense(row, byExpense.get(str(row['id'])) ?? []));
  }

  private mapExpense(row: Row, beneficiaryIds: string[]): Expense {
    return {
      id: str(row['id']),
      roomId: str(row['room_id']),
      categoryId: str(row['category_id']),
      amount: num(row['amount']),
      description: optStr(row['description']),
      expenseDate: str(row['expense_date']),
      monthKey: str(row['month_key']),
      beneficiaryIds,
      createdBy: str(row['created_by']),
      updatedBy: optStr(row['updated_by']),
      deletedBy: optStr(row['deleted_by']),
      createdAt: str(row['created_at']),
      updatedAt: optStr(row['updated_at']),
      deletedAt: optStr(row['deleted_at']),
      syncStatus: str(row['sync_status']) as SyncStatus,
    };
  }

  // --- Sync queue -------------------------------------------------------

  async enqueue(item: SyncQueueItem): Promise<void> {
    const db = await this.connection();
    await db.run(
      `INSERT INTO sync_queue
         (local_id, entity_type, operation, payload, attempt_count, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_id) DO UPDATE SET
         operation = excluded.operation,
         payload = excluded.payload,
         status = excluded.status;`,
      [
        item.localId,
        item.entityType,
        item.operation,
        JSON.stringify(item.payload),
        item.attemptCount,
        item.status,
        nowIso(),
      ],
    );
  }

  async listQueue(): Promise<SyncQueueItem[]> {
    const db = await this.connection();
    const result = await db.query(
      `SELECT * FROM sync_queue WHERE status IN ('pending_sync','sync_failed') ORDER BY created_at ASC;`,
    );
    return (result.values ?? []).map((row) => this.mapQueueItem(row as Row));
  }

  async pendingCount(): Promise<number> {
    const db = await this.connection();
    const result = await db.query(
      `SELECT COUNT(*) AS count FROM sync_queue WHERE status IN ('pending_sync','sync_failed','conflict');`,
    );
    return num((result.values?.[0] as Row)?.['count']);
  }

  async setQueueStatus(localId: string, status: SyncStatus, error?: string): Promise<void> {
    const db = await this.connection();
    await db.run(
      `UPDATE sync_queue
         SET status = ?, error_message = ?, last_attempt_at = ?, attempt_count = attempt_count + 1
       WHERE local_id = ?;`,
      [status, error ?? null, nowIso(), localId],
    );
  }

  async removeQueueItem(localId: string): Promise<void> {
    const db = await this.connection();
    await db.run('DELETE FROM sync_queue WHERE local_id = ?;', [localId]);
  }

  private mapQueueItem(row: Row): SyncQueueItem {
    return {
      localId: str(row['local_id']),
      entityType: str(row['entity_type']) as SyncQueueItem['entityType'],
      operation: str(row['operation']) as SyncQueueItem['operation'],
      payload: JSON.parse(str(row['payload']) || 'null'),
      attemptCount: num(row['attempt_count']),
      lastAttemptAt: optStr(row['last_attempt_at']),
      status: str(row['status']) as SyncStatus,
      errorMessage: optStr(row['error_message']),
    };
  }

  // --- Reference caches -------------------------------------------------

  async cacheCategories(categories: Category[]): Promise<void> {
    const db = await this.connection();
    const timestamp = nowIso();
    for (const category of categories) {
      await db.run(
        `INSERT INTO categories
           (id, room_id, name, is_active, created_by, created_at, updated_at, sync_status, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           is_active = excluded.is_active,
           updated_at = excluded.updated_at,
           cached_at = excluded.cached_at;`,
        [
          category.id,
          category.roomId,
          category.name,
          category.isActive ? 1 : 0,
          category.createdBy,
          category.createdAt,
          category.updatedAt ?? null,
          timestamp,
        ],
      );
    }
  }

  async listCategories(roomId: string, includeInactive: boolean): Promise<Category[]> {
    const db = await this.connection();
    const where = includeInactive ? '' : ' AND is_active = 1';
    const result = await db.query(
      `SELECT * FROM categories WHERE room_id = ?${where} ORDER BY name ASC;`,
      [roomId],
    );
    return (result.values ?? []).map((row) => this.mapCategory(row as Row));
  }

  private mapCategory(row: Row): Category {
    return {
      id: str(row['id']),
      roomId: str(row['room_id']),
      name: str(row['name']),
      isActive: bool(row['is_active']),
      createdBy: str(row['created_by']),
      createdAt: str(row['created_at']),
      updatedAt: optStr(row['updated_at']),
      syncStatus: str(row['sync_status']) as SyncStatus,
    };
  }

  async cacheBeneficiaries(beneficiaries: Beneficiary[]): Promise<void> {
    const db = await this.connection();
    const timestamp = nowIso();
    for (const beneficiary of beneficiaries) {
      await db.run(
        `INSERT INTO beneficiaries (id, room_id, name, is_active, cached_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           is_active = excluded.is_active,
           cached_at = excluded.cached_at;`,
        [beneficiary.id, beneficiary.roomId, beneficiary.name, beneficiary.isActive ? 1 : 0, timestamp],
      );
    }
  }

  async listBeneficiaries(roomId: string, includeInactive: boolean): Promise<Beneficiary[]> {
    const db = await this.connection();
    const where = includeInactive ? '' : ' AND is_active = 1';
    const result = await db.query(
      `SELECT * FROM beneficiaries WHERE room_id = ?${where} ORDER BY name ASC;`,
      [roomId],
    );
    return (result.values ?? []).map((row) => ({
      id: str((row as Row)['id']),
      roomId: str((row as Row)['room_id']),
      name: str((row as Row)['name']),
      isActive: bool((row as Row)['is_active']),
    }));
  }

  async cachePayers(payers: Payer[]): Promise<void> {
    const db = await this.connection();
    const timestamp = nowIso();
    for (const payer of payers) {
      await db.run(
        `INSERT INTO payers (id, room_id, name, is_active, cached_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           is_active = excluded.is_active,
           cached_at = excluded.cached_at;`,
        [payer.id, payer.roomId, payer.name, payer.isActive ? 1 : 0, timestamp],
      );
    }
  }

  async listPayers(roomId: string, includeInactive: boolean): Promise<Payer[]> {
    const db = await this.connection();
    const where = includeInactive ? '' : ' AND is_active = 1';
    const result = await db.query(
      `SELECT * FROM payers WHERE room_id = ?${where} ORDER BY name ASC;`,
      [roomId],
    );
    return (result.values ?? []).map((row) => ({
      id: str((row as Row)['id']),
      roomId: str((row as Row)['room_id']),
      name: str((row as Row)['name']),
      isActive: bool((row as Row)['is_active']),
    }));
  }
}
