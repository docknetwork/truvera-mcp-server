/**
 * Integration tests for MessageClient
 * Uses the real Wallet SDK with SQLite storage and a stub relay service.
 * Real relay calls require network access and are covered by e2e tests.
 */

import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

import { WalletClient } from "../../../../wallet-client.js";
import { MessageClient } from "../../client.js";

function makeRelayStub(overrides: Partial<{
  getMessages: () => Promise<any[]>;
  ackMessages: () => Promise<void>;
  resolveDidcommMessage: (params: any) => Promise<any>;
  sendMessage: (params: any) => Promise<any>;
}> = {}): any {
  return {
    getMessages: async () => [],
    ackMessages: async () => undefined,
    resolveDidcommMessage: async () => undefined,
    sendMessage: async () => ({}),
    ...overrides,
  };
}

describe("integration: MessageClient with real Wallet SDK", () => {
  let walletClient: WalletClient;
  let messageClient: MessageClient;

  beforeEach(async () => {
    const dbPath = path.join(os.tmpdir(), `wallet-msg-test-${Date.now()}-${Math.random()}.db`);
    walletClient = new WalletClient("test-wallet", "testnet", dbPath);
    const wallet = await walletClient.initialize();
    messageClient = new MessageClient(wallet);
  });

  afterEach(async () => {
    await messageClient.stop();

    if (walletClient?.isInitialized()) {
      try {
        await walletClient.waitForIdle();
        await walletClient.deleteWallet();
        await walletClient.waitForIdle();
      } catch (error) {
        console.error("Error cleaning up wallet:", error);
      }
    }
  });

  async function injectRelayStub(stub: any) {
    const { createMessageProvider } = await import("@docknetwork/wallet-sdk-core/lib/message-provider.js");
    const { createDIDProvider } = await import("@docknetwork/wallet-sdk-core/lib/did-provider.js");
    const wallet = walletClient.getWallet();
    const didProvider = createDIDProvider({ wallet });
    const provider = createMessageProvider({ wallet, didProvider, relayService: stub });
    (messageClient as any).providerPromise = Promise.resolve(provider);
    (messageClient as any).didProvider = didProvider;
  }

  describe("fetchMessages with stub relay", () => {
    it("returns empty result when relay returns no messages", async () => {
      await injectRelayStub(makeRelayStub());

      const result = await messageClient.fetchMessages();

      expect(result.success).toBe(true);
      expect(result.messages).toEqual([]);
      expect(result.decryptedCount).toBe(0);
      expect(result.message).toBe("No new messages");
    });

    it("processes and classifies a RequestPresentation message", async () => {
      const requestPresentationMsg = {
        type: "https://didcomm.org/present-proof/1.0/request-presentation",
        from: "did:key:z6MkVerifier",
        to: "did:key:z6MkHolder",
        body: { proofRequest: { id: "test-req", nonce: "abc123" }, proofRequestId: "test-req" },
      };

      const fakeEncryptedMsg = { _id: "msg-1", to: "did:key:z6MkHolder", encryptedMessage: {} };
      let callCount = 0;

      await injectRelayStub(makeRelayStub({
        getMessages: async () => callCount++ === 0 ? [fakeEncryptedMsg] : [],
        resolveDidcommMessage: async () => requestPresentationMsg,
      }));

      const result = await messageClient.fetchMessages();

      expect(result.success).toBe(true);
      expect(result.decryptedCount).toBe(1);
      expect(result.messages[0].type).toBe("https://didcomm.org/present-proof/1.0/request-presentation");
      expect(result.messages[0].suggestedAction).toContain("respond_to_proof_request");
      expect(result.messages[0].body).toMatchObject({ proofRequest: { id: "test-req" } });
    });

    it("returns failed result when relay throws", async () => {
      await injectRelayStub(makeRelayStub({
        getMessages: async () => { throw new Error("relay unreachable"); },
      }));

      const result = await messageClient.fetchMessages();

      expect(result.success).toBe(false);
      expect(result.message).toContain("relay unreachable");
      expect(result.messages).toEqual([]);
    });
  });

  describe("provider initialization", () => {
    it("initializes without error on a fresh wallet", async () => {
      await injectRelayStub(makeRelayStub());
      await expect(messageClient.fetchMessages()).resolves.toBeDefined();
    });
  });
});
