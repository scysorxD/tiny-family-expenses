import { Injectable } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root',
})
export class LocalDatabaseService {
  private static readonly databaseName = 'tiny_family_expenses';
  private static readonly schemaVersion = 4;

  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private database?: SQLiteDBConnection;

  async initialize(): Promise<void> {
    if (this.database) {
      return;
    }

    const existingConnection = await this.sqlite.isConnection(
      LocalDatabaseService.databaseName,
      false,
    );

    this.database = existingConnection.result
      ? await this.sqlite.retrieveConnection(LocalDatabaseService.databaseName, false)
      : await this.sqlite.createConnection(
          LocalDatabaseService.databaseName,
          false,
          'no-encryption',
          LocalDatabaseService.schemaVersion,
          false,
        );

    await this.database.open();
    await this.database.execute('PRAGMA foreign_keys = ON;');
    await this.applyMigrations();
  }

  async getConnection(): Promise<SQLiteDBConnection> {
    await this.initialize();

    if (!this.database) {
      throw new Error('Local database failed to initialize.');
    }

    return this.database;
  }

  private async applyMigrations(): Promise<void> {
    const database = await this.requireDatabase();

    await database.execute(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const currentVersion = await this.getCurrentSchemaVersion();

    if (currentVersion < 1) {
      await this.applyVersion1Schema(database);
      await this.setCurrentSchemaVersion(1);
    }

    if (currentVersion < 2) {
      await this.applyVersion2Schema(database);
      await this.setCurrentSchemaVersion(2);
    }

    if (currentVersion < 3) {
      await this.applyVersion3Schema(database);
      await this.setCurrentSchemaVersion(3);
    }

    if (currentVersion < 4) {
      await this.applyVersion4Schema(database);
      await this.setCurrentSchemaVersion(4);
    }
  }

  private async applyVersion1Schema(database: SQLiteDBConnection): Promise<void> {
    const statements = [
      `
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'synced'
            CHECK (sync_status IN ('pending_sync', 'syncing', 'synced', 'sync_failed', 'conflict')),
          UNIQUE (room_id, name)
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          description TEXT,
          expense_date TEXT NOT NULL,
          month_key TEXT NOT NULL,
          created_by TEXT NOT NULL,
          updated_by TEXT,
          deleted_by TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending_sync'
            CHECK (sync_status IN ('pending_sync', 'syncing', 'synced', 'sync_failed', 'conflict')),
          FOREIGN KEY (category_id) REFERENCES categories(id)
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS expense_beneficiaries (
          expense_id TEXT NOT NULL,
          beneficiary_id TEXT NOT NULL,
          PRIMARY KEY (expense_id, beneficiary_id),
          FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS sync_queue (
          local_id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL CHECK (entity_type IN ('expense', 'category')),
          operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
          payload TEXT NOT NULL,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TEXT,
          status TEXT NOT NULL CHECK (status IN ('pending_sync', 'syncing', 'synced', 'sync_failed', 'conflict')),
          error_message TEXT,
          created_at TEXT NOT NULL
        );
      `,
      'CREATE INDEX IF NOT EXISTS idx_local_categories_room_active ON categories(room_id, is_active);',
      'CREATE INDEX IF NOT EXISTS idx_local_expenses_room_month ON expenses(room_id, month_key);',
      'CREATE INDEX IF NOT EXISTS idx_local_expenses_room_date ON expenses(room_id, expense_date);',
      'CREATE INDEX IF NOT EXISTS idx_local_expenses_sync_status ON expenses(sync_status);',
      'CREATE INDEX IF NOT EXISTS idx_local_sync_queue_status_created ON sync_queue(status, created_at);',
    ];

    for (const statement of statements) {
      await database.execute(statement);
    }
  }

  private async applyVersion2Schema(database: SQLiteDBConnection): Promise<void> {
    const statements = [
      `
        CREATE TABLE IF NOT EXISTS beneficiaries (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          cached_at TEXT NOT NULL
        );
      `,
      'CREATE INDEX IF NOT EXISTS idx_local_beneficiaries_room_active ON beneficiaries(room_id, is_active);',
      `ALTER TABLE categories ADD COLUMN cached_at TEXT;`,
    ];

    for (const statement of statements) {
      await database.execute(statement);
    }
  }

  private async applyVersion3Schema(database: SQLiteDBConnection): Promise<void> {
    const statements = [
      `
        CREATE TABLE IF NOT EXISTS payers (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          cached_at TEXT NOT NULL
        );
      `,
      'CREATE INDEX IF NOT EXISTS idx_local_payers_room_active ON payers(room_id, is_active);',
    ];

    for (const statement of statements) {
      await database.execute(statement);
    }
  }

  // Widen sync_queue.entity_type to allow reference-data writes (categories,
  // beneficiaries, payers) to be queued offline, not just expenses. SQLite
  // cannot alter a CHECK constraint in place, so the table is rebuilt.
  private async applyVersion4Schema(database: SQLiteDBConnection): Promise<void> {
    const statements = [
      `
        CREATE TABLE IF NOT EXISTS sync_queue_v4 (
          local_id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL CHECK (entity_type IN ('expense', 'category', 'beneficiary', 'payer')),
          operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
          payload TEXT NOT NULL,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TEXT,
          status TEXT NOT NULL CHECK (status IN ('pending_sync', 'syncing', 'synced', 'sync_failed', 'conflict')),
          error_message TEXT,
          created_at TEXT NOT NULL
        );
      `,
      `
        INSERT INTO sync_queue_v4
          (local_id, entity_type, operation, payload, attempt_count, last_attempt_at, status, error_message, created_at)
        SELECT
          local_id, entity_type, operation, payload, attempt_count, last_attempt_at, status, error_message, created_at
        FROM sync_queue;
      `,
      'DROP TABLE sync_queue;',
      'ALTER TABLE sync_queue_v4 RENAME TO sync_queue;',
      'CREATE INDEX IF NOT EXISTS idx_local_sync_queue_status_created ON sync_queue(status, created_at);',
    ];

    for (const statement of statements) {
      await database.execute(statement);
    }
  }

  private async getCurrentSchemaVersion(): Promise<number> {
    const database = await this.requireDatabase();
    const result = await database.query("SELECT value FROM meta WHERE key = 'schema_version';");
    const rawVersion = result.values?.[0]?.['value'];

    return typeof rawVersion === 'string' ? Number(rawVersion) : 0;
  }

  private async setCurrentSchemaVersion(version: number): Promise<void> {
    const database = await this.requireDatabase();

    await database.run(
      `
        INSERT INTO meta (key, value)
        VALUES ('schema_version', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value;
      `,
      [String(version)],
    );
  }

  private async requireDatabase(): Promise<SQLiteDBConnection> {
    if (!this.database) {
      throw new Error('Local database is not open.');
    }

    return this.database;
  }
}
