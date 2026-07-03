// Prevent actual blockchain connections in tests by patching the singleton.
//
// DID resolution is also blocked: no test should hit the UniversalResolver or the
// cheqd chain unless it explicitly opts in by calling blockchainService._realInit().
// E2E tests that need a live cheqd connection (e.g. revocable BBS+ credentials) call
// _realInit in beforeAll, which replaces _resolver with a real CoreResolver that also
// natively normalises cheqd's double-encoded BBS+ keys (via CheqdVerificationMethodAssertionLegacy).
{
  const { blockchainService } = require('@docknetwork/wallet-sdk-wasm/src/services/blockchain/service');

  // Save the real init so e2e tests can connect to cheqd for accumulator queries
  blockchainService._realInit = blockchainService.init.bind(blockchainService);
  blockchainService.init = jest.fn().mockResolvedValue(true);
  blockchainService.ensureBlockchainReady = jest.fn().mockResolvedValue(true);
  blockchainService.isApiConnected = jest.fn().mockReturnValue(true);

  // Block accidental resolver calls — tests must not reach external services
  blockchainService.resolver.resolve = jest.fn().mockRejectedValue(
    new Error('DID resolution is not available in tests without calling blockchainService._realInit()')
  );
}

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
