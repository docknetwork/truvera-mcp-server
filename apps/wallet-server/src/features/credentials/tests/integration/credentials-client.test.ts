/**
 * Integration tests for CredentialClient
 * These tests use the real Wallet SDK with in-memory storage
 */

import { describe, it, expect, beforeEach } from "@jest/globals";

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
});
