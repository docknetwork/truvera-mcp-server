/**
 * Credential Client
 * Manages credential operations using the Dock Wallet SDK
 */

import type { IWallet, ICredentialProvider, IDIDProvider } from "@docknetwork/wallet-sdk-core/lib/types.js";
import type { CredentialListResult, CredentialInfo, ImportCredentialResult } from "./types.js";

export class CredentialClient {
  private wallet: IWallet;
  private credentialProvider: ICredentialProvider | null = null;
  private didProvider: IDIDProvider | null = null;

  constructor(wallet: IWallet, didProvider?: IDIDProvider) {
    this.wallet = wallet;
    this.didProvider = didProvider || null;
  }

  /**
   * Initialize the credential provider
   */
  private async ensureProvider(): Promise<ICredentialProvider> {
    if (!this.credentialProvider) {
      const { createCredentialProvider } = await import("@docknetwork/wallet-sdk-core/lib/credential-provider.js");
      this.credentialProvider = createCredentialProvider({ wallet: this.wallet });
    }
    return this.credentialProvider;
  }

  /**
   * Initialize the DID provider (required for credential import)
   */
  private async ensureDIDProvider(): Promise<IDIDProvider> {
    if (!this.didProvider) {
      const { createDIDProvider } = await import("@docknetwork/wallet-sdk-core/lib/did-provider.js");
      this.didProvider = createDIDProvider({ wallet: this.wallet });
    }
    return this.didProvider;
  }

  /**
   * Import a credential from an OpenID credential offer URI
   */
  async importCredential(uri: string): Promise<ImportCredentialResult> {
    try {
      const credentialProvider = await this.ensureProvider();
      const didProvider = await this.ensureDIDProvider();

      const before = await credentialProvider.getCredentials();
      const beforeIds = new Set(before.map((doc: any) => doc?.id).filter(Boolean));

      await credentialProvider.importCredentialFromURI({
        uri,
        didProvider,
      });

      const after = await credentialProvider.getCredentials();
      const imported =
        after.find((doc: any) => doc?.id && !beforeIds.has(doc.id)) ??
        after[after.length - 1];

      if (!imported) {
        return {
          success: true,
          message: "Credential import completed, but no credential was returned by the SDK.",
        };
      }

      const credential: CredentialInfo = {
        id: imported?.id || imported?.credential?.id || "unknown",
        type: imported?.type || imported?.credential?.type || ["VerifiableCredential"],
        issuer: imported?.issuer || imported?.credential?.issuer || "unknown",
        issuanceDate: imported?.issuanceDate || imported?.credential?.issuanceDate || new Date().toISOString(),
        expirationDate: imported?.expirationDate || imported?.credential?.expirationDate,
        credentialSubject: imported?.credentialSubject || imported?.credential?.credentialSubject || {},
      };

      if (imported && typeof imported === "object") {
        Object.assign(credential, imported);
      }

      return {
        success: true,
        credential,
        message: "Credential successfully imported",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all credentials in the wallet
   */
  async listCredentials(): Promise<CredentialListResult> {
    const provider = await this.ensureProvider();
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
