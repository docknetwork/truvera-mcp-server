import { describe, it, expect, vi, beforeEach } from "vitest";
import { messageToolDefs, getMessageHandlers } from "../../tools.js";
import type { MessageClient } from "../../client.js";

describe("unit: Message tools", () => {
  let mockClient: MessageClient;

  beforeEach(() => {
    mockClient = {
      fetchMessages: vi.fn(),
      sendMessage: vi.fn(),
      stop: vi.fn(),
    } as any;
  });

  describe("Tool Definitions", () => {
    it("exports correct tool definitions", () => {
      expect(messageToolDefs).toHaveLength(2);

      const names = messageToolDefs.map((t) => t.name);
      expect(names).toContain("fetch_messages");
      expect(names).toContain("send_message");
    });

    it("each tool has required properties", () => {
      messageToolDefs.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("title");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
      });
    });
  });

  describe("fetch_messages handler", () => {
    it("returns messages on success", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("fetch_messages")!;
      expect(handler).toBeDefined();

      const mockResult = {
        success: true,
        messages: [
          {
            type: "https://didcomm.org/present-proof/1.0/request-presentation",
            from: "did:key:z6MkVerifier",
            body: { proofRequest: {} },
            suggestedAction: "Call respond_to_proof_request...",
          },
        ],
        fetchedCount: 1,
        processedCount: 1,
        message: "Received 1 message",
      };

      (mockClient.fetchMessages as any).mockResolvedValue(mockResult);

      const result = await handler({});

      expect(result.isError).not.toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.fetchedCount).toBe(1);
      expect(response.messages).toHaveLength(1);
      expect(response.messages[0].type).toBe("https://didcomm.org/present-proof/1.0/request-presentation");
    });

    it("returns empty messages when none available", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("fetch_messages")!;

      (mockClient.fetchMessages as any).mockResolvedValue({
        success: true,
        messages: [],
        fetchedCount: 0,
        processedCount: 0,
        message: "No new messages",
      });

      const result = await handler({});

      expect(result.isError).not.toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.messages).toEqual([]);
    });

    it("returns isError when client fails", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("fetch_messages")!;

      (mockClient.fetchMessages as any).mockResolvedValue({
        success: false,
        messages: [],
        fetchedCount: 0,
        processedCount: 0,
        message: "relay service unavailable",
      });

      const result = await handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });

    it("handles thrown errors gracefully", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("fetch_messages")!;

      (mockClient.fetchMessages as any).mockRejectedValue(new Error("Unexpected error"));

      const result = await handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Unexpected error");
    });
  });

  describe("send_message handler", () => {
    it("sends a message successfully", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("send_message")!;
      expect(handler).toBeDefined();

      (mockClient.sendMessage as any).mockResolvedValue({ success: true, message: "Message sent" });

      const result = await handler({ to: "did:key:z6MkRecipient", message: { text: "hello" } });

      expect(result.isError).not.toBe(true);
      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        to: "did:key:z6MkRecipient",
        message: { text: "hello" },
        type: undefined,
        from: undefined,
      });
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it("passes optional from and type", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("send_message")!;

      (mockClient.sendMessage as any).mockResolvedValue({ success: true, message: "Message sent" });

      await handler({
        to: "did:key:z6MkRecipient",
        message: {},
        from: "did:key:z6MkSender",
        type: "https://didcomm.org/basicmessage/1.0/message",
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        to: "did:key:z6MkRecipient",
        message: {},
        from: "did:key:z6MkSender",
        type: "https://didcomm.org/basicmessage/1.0/message",
      });
    });

    it("returns error when to is missing", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("send_message")!;

      const result = await handler({ message: { text: "hello" } });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });

    it("returns error when message is missing", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("send_message")!;

      const result = await handler({ to: "did:key:z6MkRecipient" });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });

    it("returns error when client sendMessage fails", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("send_message")!;

      (mockClient.sendMessage as any).mockResolvedValue({ success: false, message: "DID not in wallet" });

      const result = await handler({ to: "did:key:z6MkRecipient", message: {} });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });

    it("handles thrown errors gracefully", async () => {
      const handlers = getMessageHandlers(mockClient);
      const handler = handlers.get("send_message")!;

      (mockClient.sendMessage as any).mockRejectedValue(new Error("Network error"));

      const result = await handler({ to: "did:key:z6MkRecipient", message: {} });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Network error");
    });
  });

  describe("Handler registration", () => {
    it("registers all handlers", () => {
      const handlers = getMessageHandlers(mockClient);
      expect(handlers.size).toBe(2);
      expect(handlers.has("fetch_messages")).toBe(true);
      expect(handlers.has("send_message")).toBe(true);
    });

    it("all handlers return MCP-compliant response format", async () => {
      const handlers = getMessageHandlers(mockClient);

      (mockClient.fetchMessages as any).mockResolvedValue({
        success: true,
        messages: [],
        fetchedCount: 0,
        processedCount: 0,
        message: "No new messages",
      });
      (mockClient.sendMessage as any).mockResolvedValue({ success: true, message: "Message sent" });

      const fetchResult = await handlers.get("fetch_messages")!({});
      expect(fetchResult).toHaveProperty("content");
      expect(() => JSON.parse(fetchResult.content[0].text)).not.toThrow();

      const sendResult = await handlers.get("send_message")!({ to: "did:key:z6Mk", message: {} });
      expect(sendResult).toHaveProperty("content");
      expect(() => JSON.parse(sendResult.content[0].text)).not.toThrow();
    });
  });
});
