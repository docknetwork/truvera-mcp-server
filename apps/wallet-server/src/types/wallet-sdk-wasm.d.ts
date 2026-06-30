declare module "@docknetwork/wallet-sdk-wasm/lib/services/blockchain/service.js" {
  export const blockchainService: {
    init: (...args: any[]) => Promise<any>;
    disconnect: () => Promise<void>;
    ensureBlockchainReady: () => Promise<void>;
    isApiConnected: () => boolean;
    readonly resolver: {
      resolve: (did: string) => Promise<any>;
      supports: (uri: string) => boolean;
    };
  };
}

declare module "@docknetwork/wallet-sdk-wasm/lib/services/storage/service.js" {
  export const storageService: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void | Promise<void>;
    removeItem(key: string): void | Promise<void>;
    getAllKeys(): Promise<string[]>;
  };
}
