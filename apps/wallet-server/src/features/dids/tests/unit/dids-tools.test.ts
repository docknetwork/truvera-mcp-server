import { describe, it, expect, vi, beforeEach } from "vitest";
import { didToolDefs, getDIDHandlers } from "../../tools.js";
import type { DIDClient } from "../../client.js";

describe("unit: DID tools", () => {
  let mockClient: DIDClient;

  beforeEach(() => {
    // Create a fresh mock client for each test
    mockClient = {
      getDefaultDID: vi.fn(),
      createDID: vi.fn(),
      listDIDs: vi.fn(),
      ensureProvider: vi.fn(),
    } as any;
  });

  describe("Tool Definitions", () => {
    it("exports correct tool definitions", () => {
      expect(didToolDefs).toHaveLength(3);
      
      const toolNames = didToolDefs.map((t) => t.name);
      expect(toolNames).toContain("get_default_did");
      expect(toolNames).toContain("create_did");
      expect(toolNames).toContain("list_dids");
    });

    it("each tool has required properties", () => {
      didToolDefs.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("title");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
      });
    });
  });

  describe("get_default_did handler", () => {
    it("returns default DID when one exists", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("get_default_did")!;
      expect(handler).toBeDefined();

      (mockClient.getDefaultDID as any).mockResolvedValue("did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK");

      const result = await handler({});

      expect(mockClient.getDefaultDID).toHaveBeenCalledOnce();
      expect(result.isError).not.toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.defaultDID).toBe("did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK");
    });

    it("returns null when no default DID exists", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("get_default_did")!;

      (mockClient.getDefaultDID as any).mockResolvedValue(null);

      const result = await handler({});

      expect(mockClient.getDefaultDID).toHaveBeenCalledOnce();
      expect(result.isError).not.toBe(true);
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.defaultDID).toBeNull();
      expect(response.message).toContain("No default DID set");
    });

    it("handles errors gracefully", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("get_default_did")!;

      (mockClient.getDefaultDID as any).mockRejectedValue(new Error("Provider not initialized"));

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Provider not initialized");
    });
  });

  describe("create_did handler", () => {
    it("creates a DID with default key type", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("create_did")!;
      expect(handler).toBeDefined();

      const mockResult = {
        did: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
        keyRef: "key-1",
        didDocument: { id: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK" },
      };

      (mockClient.createDID as any).mockResolvedValue(mockResult);

      const result = await handler({});

      expect(mockClient.createDID).toHaveBeenCalledWith(undefined);
      expect(result.isError).not.toBe(true);
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.did).toBe(mockResult.did);
      expect(response.keyRef).toBe(mockResult.keyRef);
      expect(response.didDocument).toEqual(mockResult.didDocument);
    });

    it("creates a DID with specified key type", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("create_did")!;

      const mockResult = {
        did: "did:key:z6Lsabc123",
        keyRef: "key-ed25519",
        didDocument: { id: "did:key:z6Lsabc123" },
      };

      (mockClient.createDID as any).mockResolvedValue(mockResult);

      const result = await handler({ keyType: "ed25519" });

      expect(mockClient.createDID).toHaveBeenCalledWith("ed25519");
      expect(result.isError).not.toBe(true);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.did).toBe(mockResult.did);
    });

    it("handles creation errors", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("create_did")!;

      (mockClient.createDID as any).mockRejectedValue(new Error("Invalid key type"));

      const result = await handler({ keyType: "invalid" });

      expect(result.isError).toBe(true);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Invalid key type");
    });
  });

  describe("list_dids handler", () => {
    it("returns list of DIDs with default", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("list_dids")!;
      expect(handler).toBeDefined();

      const mockResult = {
        dids: [
          "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
          "did:key:z6Lsabc123xyz",
        ],
        count: 2,
        defaultDID: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      };

      (mockClient.listDIDs as any).mockResolvedValue(mockResult);

      const result = await handler({});

      expect(mockClient.listDIDs).toHaveBeenCalledOnce();
      expect(result.isError).not.toBe(true);
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.dids).toEqual(mockResult.dids);
      expect(response.count).toBe(2);
      expect(response.defaultDID).toBe(mockResult.defaultDID);
    });

    it("returns empty list when no DIDs exist", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("list_dids")!;

      const mockResult = {
        dids: [],
        count: 0,
        defaultDID: undefined,
      };

      (mockClient.listDIDs as any).mockResolvedValue(mockResult);

      const result = await handler({});

      expect(result.isError).not.toBe(true);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.dids).toEqual([]);
      expect(response.count).toBe(0);
      expect(response.defaultDID).toBeUndefined();
    });

    it("handles listing errors", async () => {
      const handlers = getDIDHandlers(mockClient);
      const handler = handlers.get("list_dids")!;

      (mockClient.listDIDs as any).mockRejectedValue(new Error("Database connection failed"));

      const result = await handler({});

      expect(result.isError).toBe(true);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Database connection failed");
    });
  });

  describe("Handler registration", () => {
    it("registers all three handlers", () => {
      const handlers = getDIDHandlers(mockClient);
      
      expect(handlers.size).toBe(3);
      expect(handlers.has("get_default_did")).toBe(true);
      expect(handlers.has("create_did")).toBe(true);
      expect(handlers.has("list_dids")).toBe(true);
    });

    it("all handlers return MCP-compliant response format", async () => {
      const handlers = getDIDHandlers(mockClient);

      // Mock all client methods
      (mockClient.getDefaultDID as any).mockResolvedValue("did:key:test");
      (mockClient.createDID as any).mockResolvedValue({
        did: "did:key:new",
        keyRef: "key-1",
        didDocument: {},
      });
      (mockClient.listDIDs as any).mockResolvedValue({
        dids: ["did:key:test"],
        count: 1,
        defaultDID: "did:key:test",
      });

      // Test each handler returns proper structure
      for (const [name, handler] of handlers.entries()) {
        const result = await handler({});
        
        expect(result).toHaveProperty("content");
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0]).toHaveProperty("type", "text");
        expect(result.content[0]).toHaveProperty("text");
        
        // Verify it's valid JSON
        expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      }
    });
  });
});
