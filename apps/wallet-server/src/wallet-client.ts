/**
 * Wallet Client
 * Manages wallet initialization and lifecycle
 */

import WalletSDK from "@docknetwork/wallet-sdk-web";
import type { IWallet } from "@docknetwork/wallet-sdk-core/lib/types";

export class WalletClient {
  private wallet: IWallet | null = null;
  private walletName: string;
  private networkId: string;

  constructor(walletName: string = "default-wallet", networkId: string = "testnet") {
    this.walletName = walletName;
    this.networkId = networkId;
  }

  /**
   * Initialize the wallet
   */
  async initialize(): Promise<IWallet> {
    if (this.wallet) {
      return this.wallet;
    }

    // Create in-memory data store (IndexedDB in browser, in-memory in Node)
    const dataStore = await WalletSDK.createDataStore({
      dbName: this.walletName,
      defaultNetwork: this.networkId,
    });

    // Create wallet instance
    this.wallet = await WalletSDK.createWallet({
      dataStore,
    });

    console.error(`[Wallet] Initialized wallet: ${this.walletName} (network: ${this.networkId})`);
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
   * Delete the wallet
   */
  async deleteWallet(): Promise<void> {
    if (!this.wallet) {
      throw new Error("No wallet to delete");
    }

    await this.wallet.deleteWallet();
    this.wallet = null;
    console.error(`[Wallet] Deleted wallet: ${this.walletName}`);
  }
}
