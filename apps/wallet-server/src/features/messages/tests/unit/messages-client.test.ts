import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageClient } from "../../client.js";

function makeClient(overrides: Partial<{
  fetchMessages: () => Promise<void>;
  processDIDCommMessages: () => Promise<void>;
  addMessageListener: (handler: (msg: any) => void) => () => void;
  sendMessage: (params: any) => Promise<any>;
  stop: () => void;
}> = {}): MessageClient {
  const mockWallet = {} as any;
  const client = new MessageClient(mockWallet);

  // Inject a mock message provider directly
  const mockProvider = {
    fetchMessages: vi.fn().mockResolvedValue(undefined),
    processDIDCommMessages: vi.fn().mockResolvedValue(undefined),
    addMessageListener: vi.fn().mockReturnValue(vi.fn()),
    sendMessage: vi.fn().mockResolvedValue({}),
    stop: vi.fn(),
    ...overrides,
  };
  (client as any).messageProvider = mockProvider;

  // Inject a mock DID provider
  (client as any).didProvider = {
    getAll: vi.fn().mockResolvedValue([
      {
        type: "DIDResolutionResponse",
        didDocument: { id: "did:key:z6MkDefault" },
      },
    ]),
  };

  return client;
}

describe("unit: MessageClient", () => {
  describe("fetchMessages", () => {
    it("returns empty result when no messages arrive", async () => {
      const client = makeClient();

      const result = await client.fetchMessages();

      expect(result.success).toBe(true);
      expect(result.messages).toEqual([]);
      expect(result.fetchedCount).toBe(0);
      expect(result.processedCount).toBe(0);
      expect(result.message).toBe("No new messages");
    });

    it("calls fetchMessages then processDIDCommMessages on the provider", async () => {
      const fetchMessages = vi.fn().mockResolvedValue(undefined);
      const processDIDCommMessages = vi.fn().mockResolvedValue(undefined);
      const addMessageListener = vi.fn().mockReturnValue(vi.fn());

      const client = makeClient({ fetchMessages, processDIDCommMessages, addMessageListener });

      await client.fetchMessages();

      expect(fetchMessages).toHaveBeenCalledOnce();
      expect(processDIDCommMessages).toHaveBeenCalledOnce();
    });

    it("removes listener after processing even if an error occurs", async () => {
      const removeListener = vi.fn();
      const addMessageListener = vi.fn().mockReturnValue(removeListener);
      const fetchMessages = vi.fn().mockRejectedValue(new Error("relay down"));

      const client = makeClient({ fetchMessages, addMessageListener });

      const result = await client.fetchMessages();

      expect(result.success).toBe(false);
      expect(removeListener).toHaveBeenCalledOnce();
    });

    it("classifies RequestPresentation messages and adds suggestedAction", async () => {
      const decryptedMsg = {
        type: "https://didcomm.org/present-proof/1.0/request-presentation",
        from: "did:key:z6MkVerifier",
        to: "did:key:z6MkHolder",
        body: { proofRequest: { id: "req-1" }, proofRequestId: "req-1" },
      };

      let capturedListener: ((msg: any) => void) | null = null;
      const addMessageListener = vi.fn().mockImplementation((handler: (msg: any) => void) => {
        capturedListener = handler;
        return vi.fn();
      });
      const processDIDCommMessages = vi.fn().mockImplementation(async () => {
        if (capturedListener) capturedListener(decryptedMsg);
      });

      const client = makeClient({ addMessageListener, processDIDCommMessages });

      const result = await client.fetchMessages();

      expect(result.success).toBe(true);
      expect(result.fetchedCount).toBe(1);
      expect(result.messages[0].type).toBe("https://didcomm.org/present-proof/1.0/request-presentation");
      expect(result.messages[0].suggestedAction).toContain("respond_to_proof_request");
    });

    it("classifies IssueWithData messages with import_credential suggestion", async () => {
      const decryptedMsg = {
        type: "https://didcomm.org/issue-credential/2.0/offer-credential",
        from: "did:key:z6MkIssuer",
        body: { offerUri: "openid-credential-offer://..." },
      };

      let capturedListener: ((msg: any) => void) | null = null;
      const addMessageListener = vi.fn().mockImplementation((handler: (msg: any) => void) => {
        capturedListener = handler;
        return vi.fn();
      });
      const processDIDCommMessages = vi.fn().mockImplementation(async () => {
        if (capturedListener) capturedListener(decryptedMsg);
      });

      const client = makeClient({ addMessageListener, processDIDCommMessages });

      const result = await client.fetchMessages();

      expect(result.messages[0].suggestedAction).toContain("import_credential");
    });

    it("returns error result when provider throws", async () => {
      const fetchMessages = vi.fn().mockRejectedValue(new Error("relay service unavailable"));
      const client = makeClient({ fetchMessages });

      const result = await client.fetchMessages();

      expect(result.success).toBe(false);
      expect(result.message).toBe("relay service unavailable");
      expect(result.messages).toEqual([]);
    });
  });

  describe("sendMessage", () => {
    it("sends a message to recipient DID", async () => {
      const sendMessage = vi.fn().mockResolvedValue({});
      const client = makeClient({ sendMessage });

      const result = await client.sendMessage({
        to: "did:key:z6MkRecipient",
        message: { text: "hello" },
      });

      expect(result.success).toBe(true);
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ to: "did:key:z6MkRecipient", message: { text: "hello" } })
      );
    });

    it("uses provided from DID instead of default", async () => {
      const sendMessage = vi.fn().mockResolvedValue({});
      const client = makeClient({ sendMessage });

      await client.sendMessage({
        to: "did:key:z6MkRecipient",
        from: "did:key:z6MkCustomSender",
        message: { text: "hello" },
      });

      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ from: "did:key:z6MkCustomSender" })
      );
    });

    it("defaults from to wallet default DID when not provided", async () => {
      const sendMessage = vi.fn().mockResolvedValue({});
      const client = makeClient({ sendMessage });

      await client.sendMessage({ to: "did:key:z6MkRecipient", message: {} });

      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ from: "did:key:z6MkDefault" })
      );
    });

    it("returns error when sendMessage throws", async () => {
      const sendMessage = vi.fn().mockRejectedValue(new Error("DID not found in wallet"));
      const client = makeClient({ sendMessage });

      const result = await client.sendMessage({
        to: "did:key:z6MkRecipient",
        message: {},
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("DID not found in wallet");
    });
  });
});
