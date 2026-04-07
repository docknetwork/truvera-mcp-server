module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 60000,
  testMatch: ["<rootDir>/src/**/tests/integration/**/*.test.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
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
    "^@docknetwork/wallet-sdk-wasm/src/(.*)$": "@docknetwork/wallet-sdk-wasm/lib/$1",
    "^@docknetwork/wallet-sdk-data-store/src/(.*)$": "@docknetwork/wallet-sdk-data-store/lib/$1",
    "^@docknetwork/wallet-sdk-data-store/src$": "@docknetwork/wallet-sdk-data-store/lib",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@babel|@docknetwork|@digitalbazaar|base58-universal|multiformats|p-limit|yocto-queue|@cheqd/ts-proto|ky|did-jwt-cjs|@scure/base)",
  ],
};
