/**
 * Wallet Client
 * Manages wallet initialization and lifecycle
 */

import { createDataStore as createBaseDataStore } from "@docknetwork/wallet-sdk-data-store/lib/index.js";
import type { DataStore, LocalStorage } from "@docknetwork/wallet-sdk-data-store/lib/types.js";
import {
  createDocument,
  removeDocument,
  updateDocument,
  getDocumentById,
  getDocumentsByType,
  getDocumentsById,
  getAllDocuments,
  removeAllDocuments,
  getDocumentCorrelations,
} from "@docknetwork/wallet-sdk-data-store-web/lib/entities/document/index.js";
import {
  createWallet as createWalletRecord,
  getWallet,
  updateWallet,
} from "@docknetwork/wallet-sdk-data-store-web/lib/entities/wallet.entity.js";
import { createWallet } from "@docknetwork/wallet-sdk-core/lib/wallet.js";
import type { IWallet } from "@docknetwork/wallet-sdk-core/lib/types.js";

class InMemoryLocalStorage implements LocalStorage {
  private readonly storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.has(key) ? this.storage.get(key)! : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

export class WalletClient {
  private wallet: IWallet | null = null;
  private walletName: string;
  private networkId: string;
  private dataStore: DataStore | null = null;
  private inFlightDocumentOps = 0;
  private idleWaiters: Array<() => void> = [];

  constructor(walletName: string = "default-wallet", networkId: string = "testnet") {
    this.walletName = walletName;
    this.networkId = networkId;
  }

  private trackDocumentOperation<T>(operation: Promise<T>): Promise<T> {
    this.inFlightDocumentOps += 1;

    return operation.finally(() => {
      this.inFlightDocumentOps = Math.max(0, this.inFlightDocumentOps - 1);

      if (this.inFlightDocumentOps === 0) {
        const waiters = this.idleWaiters.splice(0);
        for (const resolve of waiters) {
          resolve();
        }
      }
    });
  }

  /**
   * Wait until tracked document operations settle.
   * This avoids brittle fixed sleeps in integration tests.
   */
  async waitForIdle(timeoutMs: number = 10000): Promise<void> {
    const start = Date.now();

    while (true) {
      if (this.inFlightDocumentOps === 0) {
        // Ensure no new operations were queued in the same tick.
        await new Promise<void>((resolve) => setImmediate(resolve));
        if (this.inFlightDocumentOps === 0) {
          return;
        }
      }

      const elapsed = Date.now() - start;
      const remaining = timeoutMs - elapsed;
      if (remaining <= 0) {
        throw new Error(`Timed out waiting for wallet document operations to settle after ${timeoutMs}ms`);
      }

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timed out waiting for wallet document operations to settle after ${timeoutMs}ms`));
        }, remaining);

        this.idleWaiters.push(() => {
          clearTimeout(timeoutId);
          resolve();
        });
      });
    }
  }

  /**
   * Initialize the wallet
   */
  async initialize(): Promise<IWallet> {
    if (this.wallet) {
      return this.wallet;
    }

    let dataStore: DataStore;
    const localStorageImpl = new InMemoryLocalStorage();

    const dataSource = {
      destroy: async () => {},
      initialize: async () => {},
    };

    dataStore = await createBaseDataStore({
      configs: {
        // Use in-memory database for tests to avoid persistent files and resource leaks
        databasePath: `:memory:${Date.now()}`,
        defaultNetwork: this.networkId,
      },
      dataSource,
      documentStore: {
        addDocument: (json, options) => this.trackDocumentOperation(createDocument({ dataStore, json, options })),
        removeDocument: (id, options) => this.trackDocumentOperation(removeDocument({ dataStore, id, options })),
        updateDocument: (document, options) => this.trackDocumentOperation(updateDocument({ dataStore, document, options })),
        getDocumentById: (id) => getDocumentById({ dataStore, id }),
        getDocumentsByType: (type) => getDocumentsByType({ dataStore, type }),
        getDocumentsById: (idList) => getDocumentsById({ dataStore, idList }),
        getAllDocuments: (allNetworks) => getAllDocuments({ dataStore, allNetworks }),
        removeAllDocuments: () => this.trackDocumentOperation(removeAllDocuments({ dataStore })),
        getDocumentCorrelations: (documentId) => getDocumentCorrelations({ dataStore, documentId }),
      },
      localStorageImpl,
      walletStore: {
        getWallet: () => getWallet({ dataStore }),
        updateWallet: () => updateWallet({ dataStore }),
      },
    });

    // Store dataStore reference for cleanup
    this.dataStore = dataStore;

    let walletRecord = await dataStore.wallet.getWallet();
    if (!walletRecord) {
      walletRecord = await createWalletRecord({ dataStore });
    }

    dataStore.networkId = walletRecord.networkId;
    dataStore.network = dataStore.networks.find((item) => item.id === walletRecord.networkId)!;

    // Create wallet instance using core SDK directly
    this.wallet = await createWallet({
      dataStore,
    });

    // Ensure wallet starts on requested network.
    if (this.wallet.getNetworkId() !== this.networkId) {
      await this.wallet.setNetwork(this.networkId);
    }

    console.error(`[Wallet] Initialized wallet: ${this.walletName} (network: ${this.wallet.getNetworkId()})`);
    return this.wallet;
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

      // Remove all documents from the dataStore
      if (this.dataStore && typeof (this.dataStore as any).documents?.removeAllDocuments === "function") {
        try {
          await (this.dataStore as any).documents.removeAllDocuments();
        } catch (err) {
          console.debug("Error removing all documents:", err);
        }
      }

      // Call wallet cleanup
      try {
        await this.waitForIdle();
        await this.wallet.deleteWallet();
        await this.waitForIdle();
      } catch (err) {
        console.debug("Error in wallet.deleteWallet():", err);
      }

      // Null out references to allow garbage collection
      this.wallet = null;
      this.dataStore = null;
      console.error(`[Wallet] Deleted wallet: ${this.walletName}`);
    } catch (error) {
      // Log the error but don't rethrow to allow cleanup to complete
      console.error(`[Wallet] Error during cleanup for ${this.walletName}:`, error);
      this.wallet = null;
      this.dataStore = null;
    }
  }
}
