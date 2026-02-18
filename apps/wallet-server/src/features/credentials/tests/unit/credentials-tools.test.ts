import { describe, it, expect, vi, beforeEach } from "vitest";
import { credentialToolDefs, getCredentialHandlers } from "../../tools.js";
import type { CredentialClient } from "../../client.js";

describe("unit: Credential tools", () => {
  let mockClient: CredentialClient;

  beforeEach(() => {
    // Create a fresh mock client for each test
    mockClient = {
      listCredentials: vi.fn(),
      ensureProvider: vi.fn(),
    } as any;
  });

  describe("Tool Definitions", () => {
    it("exports correct tool definitions", () => {
      expect(credentialToolDefs).toHaveLength(1);
      
      const toolNames = credentialToolDefs.map((t) => t.name);
      expect(toolNames).toContain("list_credentials");
    });

    it("each tool has required properties", () => {
      credentialToolDefs.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("title");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
      });
    });
  });

  describe("list_credentials handler", () => {
    it("returns list of credentials", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("list_credentials")!;
      expect(handler).toBeDefined();

      const mockResult = {
        credentials: [
          {
            id: "urn:uuid:123",
            type: ["VerifiableCredential", "UniversityDegreeCredential"],
            issuer: "did:key:z6Mk...",
            issuanceDate: "2023-01-01T00:00:00Z",
            credentialSubject: { name: "Alice" },
          },
        ],
        count: 1,
      };

      (mockClient.listCredentials as any).mockResolvedValue(mockResult);

      const result = await handler({});

      expect(mockClient.listCredentials).toHaveBeenCalledOnce();
      expect(result.isError).not.toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.credentials).toEqual(mockResult.credentials);
      expect(response.count).toBe(1);
    });

    it("returns empty list when no credentials exist", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("list_credentials")!;

      const mockResult = {
        credentials: [],
        count: 0,
      };

      (mockClient.listCredentials as any).mockResolvedValue(mockResult);

      const result = await handler({});

      expect(result.isError).not.toBe(true);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.credentials).toEqual([]);
      expect(response.count).toBe(0);
    });

    it("handles listing errors", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("list_credentials")!;

      (mockClient.listCredentials as any).mockRejectedValue(new Error("Provider not initialized"));

      const result = await handler({});

      expect(result.isError).toBe(true);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Provider not initialized");
    });
  });

  describe("Handler registration", () => {
    it("registers list_credentials handler", () => {
      const handlers = getCredentialHandlers(mockClient);
      
      expect(handlers.size).toBe(1);
      expect(handlers.has("list_credentials")).toBe(true);
    });

    it("handler returns MCP-compliant response format", async () => {
      const handlers = getCredentialHandlers(mockClient);

      // Mock client method
      (mockClient.listCredentials as any).mockResolvedValue({
        credentials: [],
        count: 0,
      });

      // Test handler returns proper structure
      const handler = handlers.get("list_credentials")!;
      const result = await handler({});
      
      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0]).toHaveProperty("text");
      
      // Verify it's valid JSON
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });
  });
});
