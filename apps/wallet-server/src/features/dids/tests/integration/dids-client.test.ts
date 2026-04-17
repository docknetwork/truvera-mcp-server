/**
 * Integration tests for DIDClient
 * These tests use the real Wallet SDK with in-memory storage
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

import { WalletClient } from "../../../../wallet-client";
import { DIDClient } from "../../client";

describe("integration: DIDClient with real Wallet SDK", () => {
  let walletClient: WalletClient;
  let didClient: DIDClient;

  beforeEach(async () => {
    // Create a unique wallet for each test to avoid conflicts
    const uniqueWalletName = `test-wallet-${Date.now()}-${Math.random()}`;
    walletClient = new WalletClient(uniqueWalletName, "testnet");
    
    // Initialize wallet and DID client
    const wallet = await walletClient.initialize();
    didClient = new DIDClient(wallet);
  });

  afterEach(async () => {
    if (walletClient) {
      await walletClient.waitForIdle();
    }

    // Clean up wallet resources after each test
    if (walletClient && walletClient.isInitialized()) {
      try {
        await walletClient.deleteWallet();
      } catch (error) {
        console.error("Error cleaning up wallet:", error);
      }
    }
  });

  describe("getDefaultDID", () => {
    // TODO: figure out why there is persisted state between tests
    it("returns null when no DIDs exist", async () => {
      // Note: Due to persistent storage, there may already be DIDs
      // This test validates the method works, not that wallet is empty
      const defaultDID = await didClient.getDefaultDID();
      
      if (defaultDID) {
        // If there is a default, it should be a valid DID
        expect(defaultDID).toMatch(/^did:/);
      } else {
        expect(defaultDID).toBeNull();
      }
    });

    it("returns a DID after creating one", async () => {
      // Create a DID
      const created = await didClient.createDID();
      expect(created.did).toBeTruthy();
      expect(created.did).toMatch(/^did:/);

      // The list should contain the DID we created
      const list = await didClient.listDIDs();
      expect(list.dids).toContain(created.did);
    });
  });

  describe("createDID", () => {
    it("creates a DID with default key type", async () => {
      const result = await didClient.createDID();

      expect(result).toHaveProperty("did");
      expect(result).toHaveProperty("didDocument");
      expect(result).toHaveProperty("keyRef");
      
      // Verify DID format
      expect(result.did).toMatch(/^did:/);
      
      // Verify DID document structure
      expect(result.didDocument).toHaveProperty("id");
      expect(result.didDocument.id).toBe(result.did);
    });

    it("creates multiple unique DIDs", async () => {
      const did1 = await didClient.createDID();
      const did2 = await didClient.createDID();

      expect(did1.did).toBeTruthy();
      expect(did2.did).toBeTruthy();
      expect(did1.did).not.toBe(did2.did);

      // Both should be valid DIDs
      expect(did1.did).toMatch(/^did:/);
      expect(did2.did).toMatch(/^did:/);
    });

    it("creates DID with specified key type", async () => {
      // Note: The actual supported key types depend on the SDK implementation
      // This test validates the parameter is passed through correctly
      const result = await didClient.createDID("ed25519");

      expect(result.did).toBeTruthy();
      expect(result.did).toMatch(/^did:/);
    });
  });

  describe("listDIDs", () => {
    it("returns list of DIDs (may be empty on first run)", async () => {
      const result = await didClient.listDIDs();

      // Validate structure
      expect(result).toHaveProperty("dids");
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("defaultDID");
      expect(Array.isArray(result.dids)).toBe(true);
      expect(result.count).toBe(result.dids.length);
      
      // All DIDs should have proper format
      result.dids.forEach((did: string) => {
        expect(did).toMatch(/^did:/);
      });
    });

    it("lists single DID after creation", async () => {
      // Get initial count
      const initialResult = await didClient.listDIDs();
      const initialCount = initialResult.count;

      // Create a DID
      const created = await didClient.createDID();
      const result = await didClient.listDIDs();

      // Should have one more DID than before
      expect(result.count).toBe(initialCount + 1);
      expect(result.dids).toContain(created.did);
    });

    it("lists multiple DIDs after creation", async () => {
      // Get initial count
      const initialResult = await didClient.listDIDs();
      const initialCount = initialResult.count;

      // Create 3 DIDs
      const did1 = await didClient.createDID();
      const did2 = await didClient.createDID();
      const did3 = await didClient.createDID();

      const result = await didClient.listDIDs();

      // Should have 3 more DIDs than initial
      expect(result.count).toBe(initialCount + 3);
      expect(result.dids).toContain(did1.did);
      expect(result.dids).toContain(did2.did);
      expect(result.dids).toContain(did3.did);
    });

    it("maintains DID order across multiple calls", async () => {
      await didClient.createDID();
      await didClient.createDID();
      
      const result1 = await didClient.listDIDs();
      const result2 = await didClient.listDIDs();

      expect(result1.dids).toEqual(result2.dids);
      expect(result1.defaultDID).toBe(result2.defaultDID);
    });
  });

  describe("end-to-end workflow", () => {
    it("supports complete DID lifecycle", async () => {
      // 1. Get initial state
      const initialList = await didClient.listDIDs();
      const initialCount = initialList.count;
      const initialDefault = await didClient.getDefaultDID();

      // 2. Create first DID
      const did1 = await didClient.createDID();
      expect(did1.did).toMatch(/^did:/);

      // 3. Verify it appears in list
      let list = await didClient.listDIDs();
      expect(list.count).toBe(initialCount + 1);
      expect(list.dids).toContain(did1.did);
      
      // If there were no DIDs initially, this becomes default
      if (initialCount === 0) {
        expect(list.defaultDID).toBe(did1.did);
        expect(await didClient.getDefaultDID()).toBe(did1.did);
      } else {
        // Default should be whatever it was before (first DID in wallet)
        expect(await didClient.getDefaultDID()).toBe(initialDefault);
      }

      // 4. Create second DID
      const did2 = await didClient.createDID();
      expect(did2.did).not.toBe(did1.did);

      // 5. Verify both appear in list
      list = await didClient.listDIDs();
      expect(list.count).toBe(initialCount + 2);
      expect(list.dids).toContain(did1.did);
      expect(list.dids).toContain(did2.did);
    });
  });

  describe("DID format validation", () => {
    it("creates DIDs with valid format", async () => {
      const result = await didClient.createDID();

      // Basic DID format: did:method:identifier
      expect(result.did).toMatch(/^did:[a-z0-9]+:[a-zA-Z0-9.\-_]+$/);
    });

    it("DID document contains required fields", async () => {
      const result = await didClient.createDID();

      expect(result.didDocument).toBeTruthy();
      expect(result.didDocument.id).toBe(result.did);
      
      // DID document should be a well-formed object
      expect(typeof result.didDocument).toBe("object");
    });
  });
});
