/**
 * DID Client
 * Manages DID operations using the Dock Wallet SDK
 */

import { createDIDProvider } from "@docknetwork/wallet-sdk-core/lib/did-provider";
import type { IDIDProvider } from "@docknetwork/wallet-sdk-core/lib/types";
import type { IWallet } from "@docknetwork/wallet-sdk-core/lib/types";
import type { CreateDIDResult, DIDListResult } from "./types.js";

export class DIDClient {
  private wallet: IWallet;
  private didProvider: IDIDProvider | null = null;

  constructor(wallet: IWallet) {
    this.wallet = wallet;
  }

  /**
   * Initialize the DID provider
   */
  private ensureProvider(): IDIDProvider {
    if (!this.didProvider) {
      this.didProvider = createDIDProvider({ wallet: this.wallet });
    }
    return this.didProvider;
  }

  /**
   * Get the default DID for this wallet
   */
  async getDefaultDID(): Promise<string | null> {
    const provider = this.ensureProvider();
    const allDocs = await provider.getAll();
    
    // Filter to only DID resolution documents and extract the DID
    const dids = allDocs
      .filter((doc: any) => doc.type === "DIDResolutionResponse" && doc.didDocument?.id)
      .map((doc: any) => doc.didDocument.id.trim()) // Trim to remove any whitespace
      .filter((id: string) => id.startsWith("did:"));

    return dids.length > 0 ? dids[0] : null;
  }

  /**
   * Create a new DID
   */
  async createDID(keyType?: string): Promise<CreateDIDResult> {
    const provider = this.ensureProvider();
    
    // Create DID using the provider
    const result = await provider.createDIDKey({
      name: 'Default DID',
      ...(keyType ? { keyType } : {}),
    });
    
    return {
      did: result.didDocumentResolution.didDocument.id,
      didDocument: result.didDocumentResolution.didDocument,
      keyRef: result.keyDoc.id,
    };
  }

  /**
   * List all DIDs in the wallet
   */
  async listDIDs(): Promise<DIDListResult> {
    const provider = this.ensureProvider();
    const allDocs = await provider.getAll();
    
    // Filter to only DID resolution documents and extract the DID
    const dids = allDocs
      .filter((doc: any) => doc.type === "DIDResolutionResponse" && doc.didDocument?.id)
      .map((doc: any) => doc.didDocument.id.trim()) // Trim to remove any whitespace
      .filter((id: string) => id.startsWith("did:"));
    
    return {
      dids,
      count: dids.length,
      defaultDID: dids.length > 0 ? dids[0] : undefined,
    };
  }
}
