/**
 * Regression guard for @docknetwork/wallet-sdk-wasm breaking its public API.
 *
 * Verifies the properties that wallet-server patches or relies on directly.
 * If wallet-sdk-wasm renames or removes these exports, this test fails before
 * the breakage reaches production.
 *
 * Note: jest.integration.config.cjs maps lib/ imports to src/ for this package,
 * so these tests run against TypeScript source. The explicit wallet-sdk-wasm
 * dep pin in package.json is the primary guard against missing lib/ output
 * (which caused ERR_MODULE_NOT_FOUND in production with v1.9.0).
 */

import { describe, it, expect } from "@jest/globals";
import { blockchainService } from "@docknetwork/wallet-sdk-wasm/lib/services/blockchain/service.js";
import { storageService } from "@docknetwork/wallet-sdk-wasm/lib/services/storage/service.js";

describe("wallet-sdk-wasm blockchainService API", () => {
  it("exports blockchainService", () => {
    expect(blockchainService).toBeDefined();
  });

  it("has resolver.resolve (patched by index.ts to normalise DID documents)", () => {
    expect(blockchainService.resolver).toBeDefined();
    expect(typeof blockchainService.resolver.resolve).toBe("function");
  });

  it("has connect and disconnect methods", () => {
    expect(typeof (blockchainService as any).connect === "function" || typeof (blockchainService as any).init === "function").toBe(true);
    expect(typeof blockchainService.disconnect).toBe("function");
  });
});

describe("wallet-sdk-wasm storageService API", () => {
  it("exports storageService", () => {
    expect(storageService).toBeDefined();
  });

  it("has get/set/remove item methods", () => {
    expect(typeof storageService.getItem).toBe("function");
    expect(typeof storageService.setItem).toBe("function");
    expect(typeof storageService.removeItem).toBe("function");
  });
});
