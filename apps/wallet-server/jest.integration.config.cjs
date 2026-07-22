const path = require("path");

// Resolved dynamically (rather than a hardcoded relative path) because
// @docknetwork/wallet-sdk-wasm resolves its own dependencies — including
// this one — from wherever it itself is installed, whether that's a normal
// hoisted npm package or a `file:` link to a local checkout. A hardcoded
// "<rootDir>/../../node_modules/..." path breaks the moment wallet-sdk-wasm
// stops being hoisted into this repo's own node_modules.
const wasmPackageDir = path.dirname(require.resolve("@docknetwork/wallet-sdk-wasm/package.json"));
const digitalbazaarHttpClientPath = require.resolve("@digitalbazaar/http-client", { paths: [wasmPackageDir] });
const base58UniversalPath = require.resolve("base58-universal", { paths: [wasmPackageDir] });
const base64urlUniversalPath = require.resolve("base64url-universal", { paths: [wasmPackageDir] });

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 60000,
  testMatch: ["<rootDir>/src/**/tests/integration/**/*.test.ts"],
  // Run tests serially to avoid resource contention between wallet instances
  maxWorkers: 1,
  // The wallet SDK's async-mutex queue has in-flight writes that outlive the
  // test cleanup hooks. forceExit exits cleanly after all tests pass rather
  // than waiting for those stragglers (which would cause "Cannot log after
  // tests are done" warnings and exit code 1).
  forceExit: true,
  // Setup file to mock blockchain service
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
        isolatedModules: true,
      },
    ],
    "^.+\\.(js|jsx|mjs|cjs|ts|tsx)$": [
      "babel-jest",
      {
        configFile: require.resolve("./babel.jest.config.cjs"),
      },
    ],
  },
  moduleNameMapper: {
    // Resolve TypeScript ESM-style .js extension imports to their source .ts files
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^ky-universal$": "ky",
    "^base58-universal$": base58UniversalPath,
    "^base64url-universal$": base64urlUniversalPath,
    "^@digitalbazaar/http-client$": digitalbazaarHttpClientPath,
    "^@digitalbazaar/x25519-key-agreement-key-2020$": "@digitalbazaar/x25519-key-agreement-key-2020/lib/X25519KeyAgreementKey2020",
    "^@digitalbazaar/x25519-key-agreement-key-2019$": "@digitalbazaar/x25519-key-agreement-key-2019/lib/main",
    "^@digitalbazaar/ed25519-verification-key-2020$": "@digitalbazaar/ed25519-verification-key-2020/lib/Ed25519VerificationKey2020",
    "^@digitalbazaar/ed25519-verification-key-2018$": "@digitalbazaar/ed25519-verification-key-2018/src/Ed25519VerificationKey2018",
    "^@digitalbazaar/did-method-key$": "@digitalbazaar/did-method-key/lib/main",
    "^@digitalbazaar/did-io$": "@digitalbazaar/did-io/lib/main",
    "^@digitalbazaar/http-digest-header$": "@digitalbazaar/http-digest-header/lib/main",
    "^@digitalbazaar/lru-memoize$": "@digitalbazaar/lru-memoize/lib/main",
    "^@digitalbazaar/security-document-loader$": "@digitalbazaar/security-document-loader/lib/main",
    "^@digitalbazaar/minimal-cipher$": "@digitalbazaar/minimal-cipher/Cipher",
    "^typeorm$": require.resolve("typeorm"),
    "^@docknetwork/wallet-sdk-data-store/src/(.*)$": "@docknetwork/wallet-sdk-data-store/lib/$1",
    "^@docknetwork/wallet-sdk-data-store/src$": "@docknetwork/wallet-sdk-data-store/lib",
    // Not installed — mocked here so message-provider can be loaded in tests
    "^@docknetwork/wallet-sdk-relay-service/(lib|src)$": "<rootDir>/src/__mocks__/wallet-sdk-relay-service.cjs",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@babel|@docknetwork|@digitalbazaar|base58-universal|multiformats|p-limit|yocto-queue|@cheqd/ts-proto|ky|did-jwt-cjs|@scure/base)",
  ],
};
