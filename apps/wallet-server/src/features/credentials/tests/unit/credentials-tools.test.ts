import { describe, it, expect, vi, beforeEach } from "vitest";
import { credentialToolDefs, getCredentialHandlers } from "../../tools.js";
import type { CredentialClient } from "../../client.js";

describe("unit: Credential tools", () => {
  let mockClient: CredentialClient;

  beforeEach(() => {
    mockClient = {
      listCredentials: vi.fn(),
      getCredential: vi.fn(),
      importCredential: vi.fn(),
      respondToProofRequest: vi.fn(),
      ensureProvider: vi.fn(),
    } as any;
  });

  describe("Tool Definitions", () => {
    it("exports correct tool definitions", () => {
      expect(credentialToolDefs).toHaveLength(4);

      const toolNames = credentialToolDefs.map((t) => t.name);
      expect(toolNames).toContain("list_credentials");
      expect(toolNames).toContain("get_credential");
      expect(toolNames).toContain("import_credential");
      expect(toolNames).toContain("respond_to_proof_request");
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
      
      expect(handlers.size).toBe(3);
      expect(handlers.has("list_credentials")).toBe(true);
      expect(handlers.has("import_credential")).toBe(true);
      expect(handlers.has("respond_to_proof_request")).toBe(true);
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

  describe("respond_to_proof_request handler", () => {
    it("returns error when proofRequest is missing", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("respond_to_proof_request")!;

      const result = await handler({});

      expect(mockClient.respondToProofRequest).not.toHaveBeenCalled();
      expect(result.isError).toBe(true);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain("proofRequest parameter is required");
    });

    it("returns a presentation when proof request response succeeds", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("respond_to_proof_request")!;
      const proofRequest = {
        request: { input_descriptors: [] },
        nonce: "nonce-123",
      };

      vi.mocked(mockClient.respondToProofRequest).mockResolvedValue({
        success: true,
        status: "completed",
        presentation: { type: ["VerifiablePresentation"] },
        selectedCredentialIds: ["urn:uuid:123"],
        selectedDID: "did:key:z6Mkholder",
        submission: {
          submitted: true,
          responseUrl: "https://example.com/response",
        },
        sharedPresentationDetails: {
          holder: "did:key:z6Mkholder",
          credentialCount: 1,
          credentials: [{ id: "urn:uuid:123" }],
        },
        message: "Presentation created successfully",
      });

      const result = await handler({ proofRequest });

      expect(mockClient.respondToProofRequest).toHaveBeenCalledWith({
        proofRequest,
        selectedCredentialIds: undefined,
        attributesToRevealByCredential: undefined,
        interactive: undefined,
        autoSubmit: undefined,
      });
      expect(result.isError).toBeUndefined();

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.status).toBe("completed");
      expect(response.presentation).toEqual({ type: ["VerifiablePresentation"] });
      expect(response.selectedCredentialIds).toEqual(["urn:uuid:123"]);
      expect(response.selectedDID).toBe("did:key:z6Mkholder");
      expect(response.submission).toEqual({
        submitted: true,
        responseUrl: "https://example.com/response",
      });
      expect(response.sharedPresentationDetails).toEqual({
        holder: "did:key:z6Mkholder",
        credentialCount: 1,
        credentials: [{ id: "urn:uuid:123" }],
      });
    });

    it("returns structured errors when presentation creation fails", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("respond_to_proof_request")!;

      vi.mocked(mockClient.respondToProofRequest).mockResolvedValue({
        success: false,
        status: "failed",
        message: "No credentials in the wallet matched the proof request.",
        errors: [{ message: "no_match" }],
      });

      const result = await handler({ proofRequest: { request: {} } });

      expect(result.isError).toBe(true);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.status).toBe("failed");
      expect(response.error).toBe("No credentials in the wallet matched the proof request.");
      expect(response.errors).toEqual([{ message: "no_match" }]);
    });

    it("returns needs_input when additional user decisions are required", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("respond_to_proof_request")!;

      vi.mocked(mockClient.respondToProofRequest).mockResolvedValue({
        success: true,
        status: "needs_input",
        message: "Additional user input is required before a presentation can be created.",
        requiredDecisions: ["Select one or more credentials using selectedCredentialIds."],
        candidateCredentials: [
          {
            credentialId: "urn:uuid:123",
            type: ["VerifiableCredential"],
            availableAttributes: ["credentialSubject.name"],
            supportsSelectiveDisclosure: true,
          },
        ],
      });

      const result = await handler({ proofRequest: { request: {} } });
      expect(result.isError).toBeUndefined();

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.status).toBe("needs_input");
      expect(response.requiredDecisions).toEqual([
        "Select one or more credentials using selectedCredentialIds.",
      ]);
      expect(response.candidateCredentials).toHaveLength(1);
    });
  });

  describe("get_credential handler", () => {
    const mockCredential = {
      id: "urn:uuid:abc123",
      type: ["VerifiableCredential", "UniversityDegreeCredential"],
      issuer: "did:key:z6Mk...",
      issuanceDate: "2023-01-01T00:00:00Z",
      credentialSubject: { name: "Alice" },
    };

    it("returns credential when found", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("get_credential")!;
      expect(handler).toBeDefined();

      (mockClient.getCredential as any).mockResolvedValue({ success: true, credential: mockCredential });

      const result = await handler({ id: "urn:uuid:abc123" });

      expect(mockClient.getCredential).toHaveBeenCalledWith("urn:uuid:abc123");
      expect(result.isError).not.toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.credential).toEqual(mockCredential);
    });

    it("returns error when credential not found", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("get_credential")!;

      (mockClient.getCredential as any).mockResolvedValue({ success: false, message: "Credential not found: urn:uuid:missing" });

      const result = await handler({ id: "urn:uuid:missing" });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain("not found");
    });

    it("returns error when id is missing", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("get_credential")!;

      const result = await handler({});

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
    });

    it("handles thrown errors gracefully", async () => {
      const handlers = getCredentialHandlers(mockClient);
      const handler = handlers.get("get_credential")!;

      (mockClient.getCredential as any).mockRejectedValue(new Error("Database error"));

      const result = await handler({ id: "urn:uuid:abc123" });

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toBe("Database error");
    });
  });
});
