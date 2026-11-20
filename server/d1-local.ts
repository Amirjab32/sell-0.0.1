import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
} from './db-types';

class LocalD1PreparedStatement implements D1PreparedStatementLike {
  private readonly db: DatabaseSync;
  private readonly query: string;
  private readonly values: SQLInputValue[];

  constructor(db: DatabaseSync, query: string, values: SQLInputValue[] = []) {
    this.db = db;
    this.query = query;
    this.values = values;
  }

  bind(...values: unknown[]): D1PreparedStatementLike {
    return new LocalD1PreparedStatement(
      this.db,
      this.query,
      values.map((v) => {
        if (v === undefined) return null;
        if (typeof v === 'boolean') return v ? 1 : 0;
        return v as SQLInputValue;
      })
    );
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.query);
    const row = stmt.get(...this.values) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (colName) {
      return (row[colName] ?? null) as T | null;
    }
    return row as T;
  }

  async run<T = Record<string, unknown>>(): Promise<D1ResultLike<T>> {
    const stmt = this.db.prepare(this.query);
    const info = stmt.run(...this.values);
    return {
      results: [],
      success: true,
      meta: {
        changes: Number(info.changes ?? 0),
        last_row_id: Number(info.lastInsertRowid ?? 0),
      },
    };
  }

  async all<T = Record<string, unknown>>(): Promise<D1ResultLike<T>> {
    const stmt = this.db.prepare(this.query);
    const rows = stmt.all(...this.values) as T[];
    return {
      results: rows,
      success: true,
      meta: {},
    };
  }

  executeSync(): D1ResultLike {
    const trimmed = this.query.trim().toUpperCase();
    const stmt = this.db.prepare(this.query);
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const rows = stmt.all(...this.values) as Record<string, unknown>[];
      return { results: rows, success: true, meta: {} };
    }
    const info = stmt.run(...this.values);
    return {
      results: [],
      success: true,
      meta: {
        changes: Number(info.changes ?? 0),
        last_row_id: Number(info.lastInsertRowid ?? 0),
      },
    };
  }
}

export class LocalD1Database implements D1DatabaseLike {
  readonly rawDb: DatabaseSync;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.rawDb = new DatabaseSync(dbPath);
    this.rawDb.exec('PRAGMA journal_mode = WAL;');
    this.rawDb.exec('PRAGMA foreign_keys = ON;');
  }

  applyMigration(sqlFilePath: string): void {
    const sql = fs.readFileSync(sqlFilePath, 'utf-8');
    this.rawDb.exec(sql);
  }

  prepare(query: string): D1PreparedStatementLike {
    return new LocalD1PreparedStatement(this.rawDb, query);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatementLike[]
  ): Promise<D1ResultLike<T>[]> {
    if (statements.length === 0) return [];
    const results: D1ResultLike<T>[] = [];
    this.rawDb.exec('BEGIN');
    try {
      for (const stmt of statements) {
        if (stmt instanceof LocalD1PreparedStatement) {
          results.push(stmt.executeSync() as D1ResultLike<T>);
        } else {
          results.push(await stmt.run<T>());
        }
      }
      this.rawDb.exec('COMMIT');
      return results;
    } catch (err) {
      this.rawDb.exec('ROLLBACK');
      throw err;
    }
  }
}
