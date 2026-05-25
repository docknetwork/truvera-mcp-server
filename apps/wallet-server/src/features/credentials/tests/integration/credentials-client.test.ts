/**
 * Integration tests for CredentialClient
 * These tests use the real Wallet SDK with SQLite storage (isolated per-test temp file)
 */

import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

import { WalletClient } from "../../../../wallet-client";
import { CredentialClient } from "../../client";
import { DIDClient } from "../../../dids/client";

const OID4VCI_TEST_OFFER_URI =
  "openid-credential-offer://?credential_offer_uri=https://api-testnet.truvera.io/openid/credential-offers/fbe0a6ed-2aa8-4363-833b-6aa8fe1c6d01";

describe("integration: CredentialClient with real Wallet SDK", () => {
  let walletClient: WalletClient;
  let credentialClient: CredentialClient;
  let didClient: DIDClient;

  beforeEach(async () => {
    const dbPath = path.join(os.tmpdir(), `wallet-test-${Date.now()}-${Math.random()}.db`);
    walletClient = new WalletClient("test-wallet", "testnet", dbPath);

    const wallet = await walletClient.initialize();
    credentialClient = new CredentialClient(wallet);
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
        await walletClient.waitForIdle();
      } catch (error) {
        console.error("Error cleaning up wallet:", error);
      }
    }
  });

  describe("listCredentials", () => {
    it("returns list structure with credentials", async () => {
      const result = await credentialClient.listCredentials();

      // Validate structure
      expect(result).toHaveProperty("credentials");
      expect(result).toHaveProperty("count");
      expect(Array.isArray(result.credentials)).toBe(true);
      expect(result.count).toBe(result.credentials.length);
    });

    it("credentials have expected properties", async () => {
      const result = await credentialClient.listCredentials();

      // Check each credential has the expected structure
      result.credentials.forEach((cred) => {
        expect(cred).toHaveProperty("id");
        expect(cred).toHaveProperty("type");
        expect(cred).toHaveProperty("issuer");
        expect(Array.isArray(cred.type)).toBe(true);
      });
    });

    it("multiple calls return consistent results", async () => {
      const result1 = await credentialClient.listCredentials();
      const result2 = await credentialClient.listCredentials();

      expect(result1.count).toBe(result2.count);
      expect(result1.credentials).toEqual(result2.credentials);
    });
  });

  describe("SDK integration", () => {
    it("creates credential provider successfully", async () => {
      // This implicitly tests provider creation
      expect(async () => {
        await credentialClient.listCredentials();
      }).not.toThrow();
    });

    it("handles SDK response format correctly", async () => {
      const result = await credentialClient.listCredentials();

      // The SDK may return various document types
      // Verify we're handling the response without errors
      expect(result).toBeDefined();
      expect(typeof result.count).toBe("number");
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("importCredential", () => {
    it("returns success: false with a message when URI is malformed", async () => {
      const result = await credentialClient.importCredential("not-a-valid-uri");

      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      expect(result.message!.length).toBeGreaterThan(0);
      expect(result.credential).toBeUndefined();
    });

    it("returns success: false when the credential offer URI is unreachable", async () => {
      const result = await credentialClient.importCredential(
        "openid-credential-offer://?credential_offer_uri=https://localhost:19999/offer/does-not-exist"
      );

      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      expect(result.message!.length).toBeGreaterThan(0);
    });

    it("does not alter the credential list after a failed import", async () => {
      const before = await credentialClient.listCredentials();

      await credentialClient.importCredential("not-a-valid-uri");

      const after = await credentialClient.listCredentials();
      expect(after.count).toBe(before.count);
    });

    it("initialises the DID provider lazily alongside the credential provider", async () => {
      // Calling importCredential bootstraps both providers internally.
      // A second call should reuse them without error.
      const first = await credentialClient.importCredential("not-a-valid-uri");
      const second = await credentialClient.importCredential("not-a-valid-uri");

      expect(first.success).toBe(false);
      expect(second.success).toBe(false);
    });

    it("result always conforms to ImportCredentialResult shape", async () => {
      const result = await credentialClient.importCredential("bad-uri");

      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      // message is present on failure
      expect(result).toHaveProperty("message");
    });

    it("imports credential from OID4VCI offer URL and stores it in the wallet SDK", async () => {
      // Ensure the wallet has a DID available before import.
      await didClient.createDID();

      const before = await credentialClient.listCredentials();

      const importResult = await credentialClient.importCredential(OID4VCI_TEST_OFFER_URI);
      expect(importResult.success).toBe(true);
      expect(importResult.credential).toBeDefined();

      const after = await credentialClient.listCredentials();
      expect(after.count).toBeGreaterThan(before.count);

      // Verify the imported credential is visible via wallet-sdk provider storage too.
      const { createCredentialProvider } = await import("@docknetwork/wallet-sdk-core/lib/credential-provider.js");
      const provider = createCredentialProvider({ wallet: walletClient.getWallet() });
      const sdkCredentials = await provider.getCredentials();
      expect(sdkCredentials.length).toBeGreaterThan(0);

      const importedId = importResult.credential?.id;
      if (importedId) {
        const inSdkStore = sdkCredentials.some((doc: any) => {
          const id = doc?.id || doc?.credential?.id;
          return id === importedId;
        });
        expect(inSdkStore).toBe(true);
      }
    });
  });
});
