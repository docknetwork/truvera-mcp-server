/**
 * Credential Client
 * Manages credential operations using the Dock Wallet SDK
 */

import WalletSDK from "@docknetwork/wallet-sdk-web";
import type { CredentialProvider, DIDProvider } from "@docknetwork/wallet-sdk-web";
import type { IWallet } from "@docknetwork/wallet-sdk-core/lib/types";
import type { CredentialListResult, CredentialInfo, ImportCredentialResult } from "./types.js";

export class CredentialClient {
  private wallet: IWallet;
  private credentialProvider: CredentialProvider | null = null;
  private didProvider: DIDProvider | null = null;

  constructor(wallet: IWallet, didProvider?: DIDProvider) {
    this.wallet = wallet;
    this.didProvider = didProvider || null;
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
   * Initialize the DID provider (required for credential import)
   */
  private ensureDIDProvider(): DIDProvider {
    if (!this.didProvider) {
      this.didProvider = WalletSDK.createDIDProvider({ wallet: this.wallet });
    }
    return this.didProvider;
  }

  /**
   * Import a credential from an OpenID credential offer URI
   */
  async importCredential(uri: string): Promise<ImportCredentialResult> {
    console.log('[CredentialClient] Starting credential import from URI:', uri);
    try {
      console.log('[CredentialClient] Ensuring credential provider...');
      const credentialProvider = this.ensureProvider();
      console.log('[CredentialClient] Credential provider ready');
      
      console.log('[CredentialClient] Ensuring DID provider...');
      const didProvider = this.ensureDIDProvider();
      console.log('[CredentialClient] DID provider ready');
      
      console.log('[CredentialClient] Calling SDK importCredentialFromURI...');
      // @ts-ignore - XMLHttpRequest is set by polyfills
      console.log('[CredentialClient] XMLHttpRequest check:', typeof XMLHttpRequest !== 'undefined' ? 'defined' : 'NOT DEFINED');
      
      // Import the credential using the SDK
      const result = await credentialProvider.importCredentialFromURI({
        uri,
        didProvider,
      });
      
      console.log('[CredentialClient] SDK import completed');
      console.log('[CredentialClient] Result type:', typeof result);
      console.log('[CredentialClient] Result keys:', result ? Object.keys(result) : 'null/undefined');
      
      // Try to safely stringify result
      try {
        console.log('[CredentialClient] Result:', JSON.stringify(result, null, 2));
      } catch (stringifyError) {
        console.log('[CredentialClient] Could not stringify result:', stringifyError);
      }
      
      // Check if result is valid
      if (!result || typeof result !== 'object') {
        return {
          success: false,
          message: "SDK returned invalid result. The credential offer may be invalid or expired.",
        };
      }
      
      // Safely extract credential info from the result with proper null checks
      const credential: CredentialInfo = {
        id: result?.id || result?.credential?.id || "unknown",
        type: result?.type || result?.credential?.type || ["VerifiableCredential"],
        issuer: result?.issuer || result?.credential?.issuer || "unknown",
        issuanceDate: result?.issuanceDate || result?.credential?.issuanceDate || new Date().toISOString(),
        expirationDate: result?.expirationDate || result?.credential?.expirationDate,
        credentialSubject: result?.credentialSubject || result?.credential?.credentialSubject || {},
      };
      
      // Only spread result properties if they exist and are safe
      if (result && typeof result === 'object') {
        Object.assign(credential, result);
      }
      
      return {
        success: true,
        credential,
        message: "Credential successfully imported",
      };
    } catch (error) {
      console.error('[CredentialClient] Import failed with error:', error);
      console.error('[CredentialClient] Error type:', error instanceof Error ? 'Error' : typeof error);
      if (error instanceof Error) {
        console.error('[CredentialClient] Error message:', error.message);
        console.error('[CredentialClient] Error stack:', error.stack);
      }
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
