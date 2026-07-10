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
    "^base58-universal$": "<rootDir>/../../node_modules/base58-universal/main.js",
    "^base64url-universal$": "<rootDir>/../../node_modules/base64url-universal/lib/index.js",
    "^@digitalbazaar/http-client$": "<rootDir>/../../node_modules/jsonld/node_modules/@digitalbazaar/http-client/dist/cjs/index.cjs",
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
