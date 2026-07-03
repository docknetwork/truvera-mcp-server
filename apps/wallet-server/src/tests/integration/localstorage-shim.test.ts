/**
 * Integration test: node-localstorage shim wired to wallet-sdk-wasm storageService.
 *
 * Regression guard for "Cannot read properties of undefined (reading 'getItem')"
 * which occurs during BBS+ derived proof generation because wallet-sdk-wasm's
 * internal storageService calls global.localStorage directly and Node.js has
 * no native localStorage.
 *
 * This test verifies the shim satisfies the storageService interface so the
 * DID resolution cache used during BBS+ proof creation works correctly.
 */

import os from "os";
import path from "path";
import fs from "fs";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { LocalStorage } from "node-localstorage";

describe("integration: node-localstorage shim → wallet-sdk-wasm storageService", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wallet-ls-shim-test-"));
    (globalThis as any).localStorage = new LocalStorage(tmpDir);
  });

  afterAll(() => {
    delete (globalThis as any).localStorage;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("globalThis.localStorage is a functional object after shim setup", () => {
    const ls = (globalThis as any).localStorage;
    expect(ls).toBeDefined();
    expect(typeof ls.getItem).toBe("function");
    expect(typeof ls.setItem).toBe("function");
    expect(typeof ls.removeItem).toBe("function");
  });

  it("storageService.getItem returns null for a missing key without throwing", async () => {
    const { storageService } = await import("@docknetwork/wallet-sdk-wasm/src/services/storage/service");
    const result = storageService.getItem("missing-key");
    expect(result).toBeNull();
  });

  it("storageService set/get round-trips through node-localstorage", async () => {
    const { storageService } = await import("@docknetwork/wallet-sdk-wasm/src/services/storage/service");
    const payload = JSON.stringify({ did: "did:example:123", timestamp: 1000000 });
    await storageService.setItem("did-cache:did:example:123", payload);
    const result = storageService.getItem("did-cache:did:example:123");
    expect(result).toBe(payload);
  });

  it("storageService.removeItem clears the stored value", async () => {
    const { storageService } = await import("@docknetwork/wallet-sdk-wasm/src/services/storage/service");
    await storageService.setItem("did-cache:did:example:remove", "value");
    await storageService.removeItem("did-cache:did:example:remove");
    const result = storageService.getItem("did-cache:did:example:remove");
    expect(result).toBeNull();
  });

  it("persists values across separate LocalStorage instances (file-backed)", async () => {
    const { storageService } = await import("@docknetwork/wallet-sdk-wasm/src/services/storage/service");
    const key = "did-cache:did:example:persist-check";
    const value = JSON.stringify({ persisted: true });
    await storageService.setItem(key, value);

    // Swap to a fresh instance pointing at the same directory to simulate
    // a process restart reading from the same /data volume.
    (globalThis as any).localStorage = new LocalStorage(tmpDir);

    const result = storageService.getItem(key);
    expect(result).toBe(value);
  });
});
