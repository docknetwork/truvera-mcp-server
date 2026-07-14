import sqlite3 from "sqlite3";

interface RevocationRow {
  revoked_since: number;
}

/**
 * Tracks a per-tenant "revoked since" cutoff in a dedicated SQLite file,
 * separate from any tenant's own wallet database. A JWT is treated as
 * revoked when its `iat` predates the tenant's cutoff, so revoking a
 * tenant invalidates every token issued before the call, while tokens
 * minted afterward remain valid until the next revocation.
 */
export class RevocationStore {
  private readonly db: sqlite3.Database;
  private readonly ready: Promise<void>;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.ready = new Promise((resolve, reject) => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS revocations (
           tenant_id TEXT PRIMARY KEY,
           revoked_since INTEGER NOT NULL
         )`,
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  async revoke(tenantId: string, revokedSince: number = Math.floor(Date.now() / 1000)): Promise<void> {
    await this.ready;
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO revocations (tenant_id, revoked_since) VALUES (?, ?)
         ON CONFLICT(tenant_id) DO UPDATE SET revoked_since = excluded.revoked_since`,
        [tenantId, revokedSince],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  async isRevoked(tenantId: string, issuedAt: number): Promise<boolean> {
    await this.ready;
    return new Promise((resolve, reject) => {
      this.db.get<RevocationRow>(
        `SELECT revoked_since FROM revocations WHERE tenant_id = ?`,
        [tenantId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row !== undefined && issuedAt < row.revoked_since);
        }
      );
    });
  }

  async close(): Promise<void> {
    await this.ready;
    return new Promise((resolve, reject) => {
      this.db.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
