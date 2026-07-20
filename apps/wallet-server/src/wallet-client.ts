/**
 * Wallet Client
 * Manages wallet initialization and lifecycle
 */

import path from "path";
import { LocalStorage } from "node-localstorage";
import { createDataStore } from "@docknetwork/wallet-sdk-data-store-typeorm/lib/index.js";
import type { DataStore } from "@docknetwork/wallet-sdk-data-store/lib/types.js";
import { createWallet } from "@docknetwork/wallet-sdk-core/lib/wallet.js";
import type { IWallet } from "@docknetwork/wallet-sdk-core/lib/types.js";

export class WalletClient {
  private wallet: IWallet | null = null;
  private walletName: string;
  private networkId: string;
  private dataStore: DataStore | null = null;
  private databasePath: string;

  /**
   * @param walletName Log-only label; wallet identity is determined by `databasePath`,
   * not by this name. Two instances with different names but the same `databasePath`
   * share the same underlying wallet.
   */
  constructor(walletName: string = "default-wallet", networkId: string = "testnet", databasePath?: string) {
    this.walletName = walletName;
    this.networkId = networkId;
    // Use provided path or default to /data/wallet-db
    this.databasePath = databasePath || path.join("/data", "wallet-db");
  }

  /**
   * Initialize the wallet
   */
  async initialize(): Promise<IWallet> {
    if (this.wallet) {
      return this.wallet;
    }

    // wallet-sdk-wasm's storageService calls global.localStorage for DID resolution
    // caching during BBS+ proof generation. Install the polyfill here so any code
    // path that uses WalletClient gets it automatically, without requiring the
    // caller (index.ts, tests) to set it up first. ??= avoids overwriting a shim
    // already installed by tests or other code.
    (globalThis as any).localStorage ??= new LocalStorage(`${this.databasePath}-localstorage`);

    // Create data store using TypeORM + SQLite
    const dataStore = await createDataStore({
      databasePath: this.databasePath,
      defaultNetwork: this.networkId,
    });

    // Store dataStore reference for cleanup
    this.dataStore = dataStore;

    // Create wallet instance using core SDK
    this.wallet = await createWallet({
      dataStore,
    });

    // Ensure wallet starts on requested network
    if (this.wallet.getNetworkId() !== this.networkId) {
      await this.wallet.setNetwork(this.networkId);
    }

    console.info(
      `[Wallet] Initialized wallet: ${this.walletName} (network: ${this.wallet.getNetworkId()}, database: ${this.databasePath})`
    );
    return this.wallet;
  }

  /**
   * @internal Test cleanup only. Drains the SDK write mutex so in-flight writes
   * complete before Jest exits. Must not be called in production code — does not
   * guarantee all writes have been enqueued yet (see inline comment).
   */
  async waitForIdle(): Promise<void> {
    // Drain the SDK's global write mutex. Both createDocument and updateDocument
    // run inside writeMutex.runExclusive, so acquiring it here blocks until the
    // current in-flight write finishes. This is more reliable than a fixed delay.
    //
    // Note: syncCredentialStatus (fired without await in the SDK) makes network
    // calls between its writes, so there is a window where the mutex is free but
    // more writes are queued. Jest's forceExit handles that residual gap.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { writeMutex } = await import(
      "@docknetwork/wallet-sdk-data-store-typeorm/lib/entities/document/create-document.js" as string
    );
    await writeMutex.runExclusive(async () => {});
  }

  /**
   * Get the wallet instance (throw if not initialized)
   */
  getWallet(): IWallet {
    if (!this.wallet) {
      throw new Error("Wallet not initialized. Call initialize() first.");
    }
    return this.wallet;
  }

  /**
   * Check if wallet is initialized
   */
  isInitialized(): boolean {
    return this.wallet !== null;
  }

  /**
   * Stop background timers and close the SQLite connection without deleting
   * wallet contents. Use this for process shutdown (SIGTERM/SIGINT); reserve
   * deleteWallet() for test cleanup, since it wipes tenant data.
   */
  async close(): Promise<void> {
    if (!this.wallet) {
      return;
    }

    const walletAny = this.wallet as any;
    if (walletAny.networkCheckInterval) {
      clearInterval(walletAny.networkCheckInterval);
    }

    try {
      if (this.dataStore && typeof (this.dataStore as any).destroy === "function") {
        await (this.dataStore as any).destroy();
      }
    } catch (err) {
      console.debug("Error closing dataStore:", err);
    }

    this.wallet = null;
    this.dataStore = null;
    console.info(`[Wallet] Closed wallet: ${this.walletName}`);
  }

  /**
   * Delete the wallet and cleanup all resources
   * Follows the pattern from @docknetwork/wallet-sdk-core tests
   */
  async deleteWallet(): Promise<void> {
    if (!this.wallet) {
      throw new Error("No wallet to delete");
    }

    try {
      // Clear the network check interval timer (critical for preventing hanging)
      const walletAny = this.wallet as any;
      if (walletAny.networkCheckInterval) {
        clearInterval(walletAny.networkCheckInterval);
      }

      // Call wallet cleanup
      try {
        await this.wallet.deleteWallet();
      } catch (err) {
        console.debug("Error in wallet.deleteWallet():", err);
      }

      // Close the TypeORM/SQLite connection so the file handle is released.
      // Without this, the next createDataStore call on the same path may hit
      // SQLITE_BUSY if the SDK does not close the connection internally.
      try {
        if (this.dataStore && typeof (this.dataStore as any).destroy === "function") {
          await (this.dataStore as any).destroy();
        }
      } catch (err) {
        console.debug("Error closing dataStore:", err);
      }

      // Null out references to allow garbage collection
      this.wallet = null;
      this.dataStore = null;
      console.info(`[Wallet] Deleted wallet: ${this.walletName}`);
    } catch (error) {
      // Log the error but don't rethrow to allow cleanup to complete
      console.error(`[Wallet] Error during cleanup for ${this.walletName}:`, error);
      this.wallet = null;
      this.dataStore = null;
    }
  }
}
