// Mock the blockchain service to prevent actual network connections in tests
jest.mock('@docknetwork/wallet-sdk-wasm/src/services/blockchain', () => ({
  blockchainService: {
    init: jest.fn().mockResolvedValue(true),
    ensureBlockchainReady: jest.fn().mockResolvedValue(true),
    isApiConnected: jest.fn().mockReturnValue(true),
    isBlockchainReady: true,
  },
}));
