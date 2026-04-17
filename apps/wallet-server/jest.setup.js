// Mock the blockchain service to prevent actual network connections in tests
jest.mock('@docknetwork/wallet-sdk-wasm/src/services/blockchain', () => ({
  blockchainService: {
    init: jest.fn().mockResolvedValue(true),
    ensureBlockchainReady: jest.fn().mockResolvedValue(true),
    isApiConnected: jest.fn().mockReturnValue(true),
    isBlockchainReady: true,
  },
}));

// The wallet SDK can emit late debug logs from background status updates.
// Keep integration tests deterministic by silencing data-store logger output.
jest.mock('@docknetwork/wallet-sdk-data-store/src/logger', () => ({
  logger: {
    debug: jest.fn(),
    performance: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));
