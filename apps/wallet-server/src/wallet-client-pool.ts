import { WalletClient } from "./wallet-client.js";

/**
 * Lazily initialises one WalletClient per unique database path and caches it
 * for the lifetime of the process. Promise-based deduplication ensures that
 * two concurrent sessions for the same tenant don't double-initialise the same
 * SQLite database.
 *
 * Concurrency across processes: SQLite is single-writer. This pool assumes a
 * single running process per storage volume — desired_count must stay at 1
 * regardless of storage backend (EFS is fine under that constraint; see
 * terraform/efs.tf).
 */
export class WalletClientPool {
  private readonly pool = new Map<string, Promise<WalletClient>>();

  async get(dbPath: string, networkId: string): Promise<WalletClient> {
    if (!this.pool.has(dbPath)) {
      const promise = this.init(dbPath, networkId).catch((err) => {
        // Remove the failed entry so a subsequent request can retry.
        this.pool.delete(dbPath);
        throw err;
      });
      this.pool.set(dbPath, promise);
    }
    return this.pool.get(dbPath)!;
  }

  private async init(dbPath: string, networkId: string): Promise<WalletClient> {
    // Use the last path segment as a human-readable wallet name for logging.
    const walletName = dbPath.split("/").filter(Boolean).at(-1) ?? dbPath;
    const client = new WalletClient(walletName, networkId, dbPath);
    await client.initialize();
    return client;
  }

  async shutdownAll(): Promise<void> {
    for (const [dbPath, walletPromise] of this.pool.entries()) {
      try {
        const client = await walletPromise;
        await client.close();
      } catch (err) {
        console.error(`[WalletPool] Error shutting down wallet at ${dbPath}:`, err);
      }
    }
    this.pool.clear();
  }
}
