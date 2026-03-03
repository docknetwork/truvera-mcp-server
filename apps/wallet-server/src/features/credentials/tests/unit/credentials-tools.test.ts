import { describe, it, expect, vi, beforeEach } from "vitest";
import { credentialToolDefs, getCredentialHandlers } from "../../tools.js";
import type { CredentialClient } from "../../client.js";

describe("unit: Credential tools", () => {
  let mockClient: CredentialClient;

  beforeEach(() => {
    // Create a fresh mock client for each test
    mockClient = {
      listCredentials: vi.fn(),
      importCredential: vi.fn(),
      ensureProvider: vi.fn(),
    } as any;
  });

  describe("Tool Definitions", () => {
    it("exports correct tool definitions", () => {
      expect(credentialToolDefs).toHaveLength(2);
      
      const toolNames = credentialToolDefs.map((t) => t.name);
      expect(toolNames).toContain("list_credentials");
      expect(toolNames).toContain("import_credential");
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
    it("registers all credential handlers", () => {
      const handlers = getCredentialHandlers(mockClient);
      
      expect(handlers.size).toBe(2);
      expect(handlers.has("list_credentials")).toBe(true);
      expect(handlers.has("import_credential")).toBe(true);
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

  describe("import_credential handler", () => {
    it("successfully imports credential from OpenID offer URI", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("import_credential")!;
      expect(handler).toBeDefined();

      const mockCredential = {
        id: "urn:uuid:456",
        type: ["VerifiableCredential", "EmployeeCredential"],
        issuer: "did:key:z6Mk...",
        issuanceDate: "2023-02-01T00:00:00Z",
        credentialSubject: { employeeId: "12345" },
      };

      vi.mocked(mockClient.importCredential).mockResolvedValue({
        success: true,
        credential: mockCredential,
        message: "Credential imported successfully",
      });

      const result = await handler({ uri: "openid-credential-offer://?credential_offer_uri=https://example.com" });

      expect(mockClient.importCredential).toHaveBeenCalledWith("openid-credential-offer://?credential_offer_uri=https://example.com");
      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.credential).toEqual(mockCredential);
    });

    it("returns error when URI parameter is missing", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("import_credential")!;

      const result = await handler({});

      expect(mockClient.importCredential).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain("URI parameter is required");
    });

    it("returns error when URI parameter is not a string", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("import_credential")!;

      const result = await handler({ uri: 123 });

      expect(mockClient.importCredential).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain("URI parameter is required");
    });

    it("handles import failure from client", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("import_credential")!;

      vi.mocked(mockClient.importCredential).mockResolvedValue({
        success: false,
        message: "Invalid credential offer URI",
      });

      const result = await handler({ uri: "invalid-uri" });

      expect(mockClient.importCredential).toHaveBeenCalledWith("invalid-uri");
      expect(result.isError).toBe(true);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Invalid credential offer URI");
    });

    it("handles unexpected errors during import", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("import_credential")!;

      vi.mocked(mockClient.importCredential).mockRejectedValue(new Error("Network error"));

      const result = await handler({ uri: "openid-credential-offer://?credential_offer_uri=https://example.com" });

      expect(result.isError).toBe(true);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Network error");
    });

    it("returns properly structured MCP response", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("import_credential")!;

      vi.mocked(mockClient.importCredential).mockResolvedValue({
        success: true,
        credential: {
          id: "urn:uuid:789",
          type: ["VerifiableCredential"],
          issuer: "did:key:z6Mk...",
          issuanceDate: "2023-03-01T00:00:00Z",
          credentialSubject: {},
        },
      });

      const result = await handler({ uri: "openid-credential-offer://?credential_offer_uri=https://example.com" });

      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0]).toHaveProperty("text");
      
      // Verify it's valid JSON
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });
  });
});
