/**
 * Type declarations for @docknetwork/wallet-sdk-web
 * The package doesn't ship with TypeScript types, so we define them here
 */

declare module "@docknetwork/wallet-sdk-web" {
  import type { IWallet } from "@docknetwork/wallet-sdk-core/lib/types";

  export interface DIDProvider {
    createDIDKey(options?: { name?: string; keyType?: string }): Promise<{
      keyDoc: {
        id: string;
        controller: string;
        type: string;
        publicKeyMultibase: string;
        [key: string]: any;
      };
      didDocumentResolution: {
        id: string; // UUID of the wallet document
        type: string;
        correlation: string[];
        didDocument: {
          id: string; // Actual DID (e.g., did:key:z6Mk...)
          [key: string]: any;
        };
        [key: string]: any;
      };
    }>;
    getAll(): Promise<Array<{ id: string; [key: string]: any }>>;
    exportDID(params: { id: string; password: string }): Promise<any>;
    importDID(params: { encryptedJSONWallet: any; password: string }): Promise<any[]>;
  }

  export interface CredentialProvider {
    importCredentialFromURI(params: { uri: string; didProvider: any }): Promise<any>;
    getCredentials(): Promise<Array<any>>;
  }

  export interface WalletSDK {
    createDataStore(config?: { dbName?: string; defaultNetwork?: string }): Promise<any>;
    createWallet(config: { dataStore: any }): Promise<IWallet>;
    createDIDProvider(config: { wallet: IWallet }): DIDProvider;
    createCredentialProvider(config: { wallet: IWallet }): CredentialProvider;
    initialize(config: any): Promise<any>;
    initializeCloudWallet(config: any): Promise<any>;
    generateCloudWalletMasterKey(): any;
    recoverCloudWalletMasterKey(mnemonic: string): any;
    createVerificationController(config: any): any;
    createMessageProvider(config: any): any;
  }

  const WalletSDK: WalletSDK;
  export default WalletSDK;
}

declare module "@docknetwork/wallet-sdk-data-store-web" {
  export interface DataStoreConfigs {
    dbName?: string;
  }
  
  export function createDataStore(config?: DataStoreConfigs): Promise<any>;
}
