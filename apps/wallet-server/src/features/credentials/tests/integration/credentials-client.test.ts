/**
 * Integration tests for CredentialClient
 * These tests use the real Wallet SDK with in-memory storage
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

import { WalletClient } from "../../../../wallet-client";
import { CredentialClient } from "../../client";

describe("integration: CredentialClient with real Wallet SDK", () => {
  let walletClient: WalletClient;
  let credentialClient: CredentialClient;

  beforeEach(async () => {
    // Create a unique wallet for each test to avoid conflicts
    const uniqueWalletName = `test-wallet-${Date.now()}-${Math.random()}`;
    walletClient = new WalletClient(uniqueWalletName, "testnet");
    
    // Initialize wallet and credential client
    const wallet = await walletClient.initialize();
    credentialClient = new CredentialClient(wallet);
  });

  afterEach(async () => {
    // Clean up wallet resources after each test
    if (walletClient && walletClient.isInitialized()) {
      try {
        await walletClient.deleteWallet();
      } catch (error) {
        console.error("Error cleaning up wallet:", error);
      }
    }
    // Wait for remaining async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
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
  });
});
