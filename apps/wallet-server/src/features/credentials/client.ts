/**
 * Credential Client
 * Manages credential operations using the Dock Wallet SDK
 */

import WalletSDK from "@docknetwork/wallet-sdk-web";
import type { CredentialProvider } from "@docknetwork/wallet-sdk-web";
import type { IWallet } from "@docknetwork/wallet-sdk-core/lib/types";
import type { CredentialListResult, CredentialInfo } from "./types.js";

export class CredentialClient {
  private wallet: IWallet;
  private credentialProvider: CredentialProvider | null = null;

  constructor(wallet: IWallet) {
    this.wallet = wallet;
  }

  /**
   * Initialize the credential provider
   */
  private ensureProvider(): CredentialProvider {
    if (!this.credentialProvider) {
      this.credentialProvider = WalletSDK.createCredentialProvider({ wallet: this.wallet });
    }
    return this.credentialProvider;
  }

  /**
   * List all credentials in the wallet
   */
  async listCredentials(): Promise<CredentialListResult> {
    const provider = this.ensureProvider();
    const allDocs = await provider.getCredentials();
    
    // Map credentials to our standardized format
    const credentials: CredentialInfo[] = allDocs.map((doc: any) => ({
      id: doc.id || doc.credential?.id,
      type: doc.type || doc.credential?.type || [],
      issuer: doc.issuer || doc.credential?.issuer || "unknown",
      issuanceDate: doc.issuanceDate || doc.credential?.issuanceDate || "",
      expirationDate: doc.expirationDate || doc.credential?.expirationDate,
      credentialSubject: doc.credentialSubject || doc.credential?.credentialSubject,
      ...doc,
    }));
    
    return {
      credentials,
      count: credentials.length,
    };
  }
}
