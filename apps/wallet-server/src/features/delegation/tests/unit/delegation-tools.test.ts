import { describe, it, expect, vi, beforeEach } from "vitest";
import { delegationToolDefs, getDelegationHandlers } from "../../tools.js";
import type { DelegationClient } from "../../client.js";

const MOCK_POLICY = {
  id: "policy-1",
  type: "DelegationPolicy",
  ruleset: {
    roles: [{ roleId: "agent-role", label: "Agent", attributes: [], parentRoleId: null, capabilityGrants: [] }],
    capabilities: [],
    delegationTarget: "travel",
    overallConstraints: { maxDelegationDepth: 3, delegatedCredentialLifetime: { unit: "days", value: 30 } },
  },
  createdAt: "2026-07-01T00:00:00Z",
};

describe("unit: delegation tools (wallet-server)", () => {
  let mockClient: DelegationClient;

  beforeEach(() => {
    mockClient = {
      createDelegationOffer: vi.fn(),
      acceptDelegationOffer: vi.fn(),
      handleDelegationMessage: vi.fn(),
      listDelegationOffers: vi.fn(),
      getDelegationDetails: vi.fn(),
    } as any;
  });

  describe("tool definitions", () => {
    it("exports the correct tool names", () => {
      const names = delegationToolDefs.map((t) => t.name);
      expect(names).toContain("create_delegation_offer");
      expect(names).toContain("accept_delegation_offer");
      expect(names).toContain("handle_delegation_message");
      expect(names).toContain("list_delegation_offers");
      expect(names).toContain("get_delegation_details");
      expect(names).toHaveLength(5);
    });

    it("each tool has name, title, description, and inputSchema", () => {
      delegationToolDefs.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("title");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
      });
    });

    it("create_delegation_offer requires credentialId, delegationPolicy, and delegationRole", () => {
      const tool = delegationToolDefs.find((t) => t.name === "create_delegation_offer")!;
      const required = (tool.inputSchema as any).required as string[];
      expect(required).toContain("credentialId");
      expect(required).toContain("delegationPolicy");
      expect(required).toContain("delegationRole");
    });

    it("create_delegation_offer has optional issuerDID parameter", () => {
      const tool = delegationToolDefs.find((t) => t.name === "create_delegation_offer")!;
      const properties = (tool.inputSchema as any).properties;
      expect(properties).toHaveProperty("issuerDID");
      expect((tool.inputSchema as any).required).not.toContain("issuerDID");
    });

    it("accept_delegation_offer requires offerId", () => {
      const tool = delegationToolDefs.find((t) => t.name === "accept_delegation_offer")!;
      expect((tool.inputSchema as any).required).toContain("offerId");
    });

    it("handle_delegation_message requires message", () => {
      const tool = delegationToolDefs.find((t) => t.name === "handle_delegation_message")!;
      expect((tool.inputSchema as any).required).toContain("message");
    });

    it("get_delegation_details requires credentialId", () => {
      const tool = delegationToolDefs.find((t) => t.name === "get_delegation_details")!;
      expect((tool.inputSchema as any).required).toContain("credentialId");
    });
  });

  describe("create_delegation_offer handler", () => {
    it("calls client with all required params and returns oobUrl", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("create_delegation_offer")!;

      const mockOffer = { id: "offer-1", status: "sent", issuerDID: "did:key:z6MkIssuer" };
      (mockClient.createDelegationOffer as any).mockResolvedValue({
        offer: mockOffer,
        oobUrl: "didcomm://?_oob=abc123",
      });

      const result = await handler({
        credentialId: "cred-1",
        delegationPolicy: MOCK_POLICY,
        delegationRole: "agent-role",
      });

      expect(mockClient.createDelegationOffer).toHaveBeenCalledWith({
        credentialId: "cred-1",
        delegationPolicy: MOCK_POLICY,
        delegationRole: "agent-role",
      });
      expect(result.isError).not.toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.success).toBe(true);
      expect(body.oobUrl).toBe("didcomm://?_oob=abc123");
      expect(body.offer).toEqual(mockOffer);
    });

    it("passes optional issuerDID to client", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("create_delegation_offer")!;

      (mockClient.createDelegationOffer as any).mockResolvedValue({
        offer: { id: "offer-1" },
        oobUrl: "didcomm://?_oob=xyz",
      });

      await handler({
        credentialId: "cred-1",
        delegationPolicy: MOCK_POLICY,
        delegationRole: "agent-role",
        issuerDID: "did:key:z6MkSpecific",
      });

      expect(mockClient.createDelegationOffer).toHaveBeenCalledWith(
        expect.objectContaining({ issuerDID: "did:key:z6MkSpecific" })
      );
    });

    it("returns isError when client throws", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("create_delegation_offer")!;

      (mockClient.createDelegationOffer as any).mockRejectedValue(
        new Error("DID did:key:z6MkBad is not owned by this wallet. Use list_dids to see available DIDs.")
      );

      const result = await handler({
        credentialId: "cred-1",
        delegationPolicy: MOCK_POLICY,
        delegationRole: "agent-role",
        issuerDID: "did:key:z6MkBad",
      });

      expect(result.isError).toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.success).toBe(false);
      expect(body.error).toContain("not owned by this wallet");
    });
  });

  describe("accept_delegation_offer handler", () => {
    it("calls client.acceptDelegationOffer with the offerId", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("accept_delegation_offer")!;

      (mockClient.acceptDelegationOffer as any).mockResolvedValue(undefined);

      const result = await handler({ offerId: "offer-1" });

      expect(mockClient.acceptDelegationOffer).toHaveBeenCalledWith("offer-1");
      expect(result.isError).not.toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.success).toBe(true);
    });

    it("returns isError when client throws", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("accept_delegation_offer")!;

      (mockClient.acceptDelegationOffer as any).mockRejectedValue(
        new Error("No delegation offer found with id: missing-id")
      );

      const result = await handler({ offerId: "missing-id" });

      expect(result.isError).toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.error).toContain("missing-id");
    });
  });

  describe("handle_delegation_message handler", () => {
    it("returns success when client handles the message", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("handle_delegation_message")!;

      (mockClient.handleDelegationMessage as any).mockResolvedValue({
        handled: true,
        type: "https://didcomm.org/out-of-band/2.0/invitation",
      });

      const result = await handler({ message: "didcomm://?_oob=abc123" });

      expect(mockClient.handleDelegationMessage).toHaveBeenCalledWith("didcomm://?_oob=abc123");
      expect(result.isError).not.toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.success).toBe(true);
      expect(body.type).toBe("https://didcomm.org/out-of-band/2.0/invitation");
    });

    it("returns isError when message could not be decoded", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("handle_delegation_message")!;

      (mockClient.handleDelegationMessage as any).mockResolvedValue({ handled: false });

      const result = await handler({ message: "not-a-didcomm-url" });

      expect(result.isError).toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.success).toBe(false);
    });

    it("accepts raw DIDComm JSON objects", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("handle_delegation_message")!;

      (mockClient.handleDelegationMessage as any).mockResolvedValue({
        handled: true,
        type: "https://didcomm.org/issue-credential/3.0/issue-credential",
      });

      const rawMsg = { type: "https://didcomm.org/issue-credential/3.0/issue-credential", body: {} };
      const result = await handler({ message: rawMsg });

      expect(mockClient.handleDelegationMessage).toHaveBeenCalledWith(rawMsg);
      expect(result.isError).not.toBe(true);
    });

    it("returns isError when client throws", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("handle_delegation_message")!;

      (mockClient.handleDelegationMessage as any).mockRejectedValue(new Error("Wallet error"));

      const result = await handler({ message: "didcomm://?_oob=abc" });

      expect(result.isError).toBe(true);
    });
  });

  describe("list_delegation_offers handler", () => {
    it("returns all offers with count", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("list_delegation_offers")!;

      const mockOffers = [
        { id: "offer-1", status: "sent", issuerDID: "did:key:z6MkIssuer" },
        { id: "offer-2", status: "accepted", issuerDID: "did:key:z6MkOther" },
      ];
      (mockClient.listDelegationOffers as any).mockResolvedValue(mockOffers);

      const result = await handler({});

      expect(result.isError).not.toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.success).toBe(true);
      expect(body.offers).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it("returns empty list when no offers exist", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("list_delegation_offers")!;

      (mockClient.listDelegationOffers as any).mockResolvedValue([]);

      const result = await handler({});

      const body = JSON.parse(result.content[0].text);
      expect(body.success).toBe(true);
      expect(body.offers).toEqual([]);
      expect(body.count).toBe(0);
    });

    it("returns isError when client throws", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("list_delegation_offers")!;

      (mockClient.listDelegationOffers as any).mockRejectedValue(new Error("DB error"));

      const result = await handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe("get_delegation_details handler", () => {
    it("calls client with credentialId and returns details", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("get_delegation_details")!;

      const mockDetails = {
        delegationPolicy: MOCK_POLICY,
        delegationChain: [],
        role: { roleId: "agent-role", label: "Agent" },
        remainingDelegationDepth: 2,
        delegationOptions: [],
      };
      (mockClient.getDelegationDetails as any).mockResolvedValue(mockDetails);

      const result = await handler({ credentialId: "cred-1" });

      expect(mockClient.getDelegationDetails).toHaveBeenCalledWith("cred-1");
      expect(result.isError).not.toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.success).toBe(true);
      expect(body.remainingDelegationDepth).toBe(2);
    });

    it("returns isError when credential not found", async () => {
      const handlers = getDelegationHandlers(mockClient);
      const handler = handlers.get("get_delegation_details")!;

      (mockClient.getDelegationDetails as any).mockRejectedValue(
        new Error("Credential not found: missing-cred")
      );

      const result = await handler({ credentialId: "missing-cred" });

      expect(result.isError).toBe(true);
      const body = JSON.parse(result.content[0].text);
      expect(body.error).toContain("missing-cred");
    });
  });

  describe("handler registration", () => {
    it("registers all five handlers", () => {
      const handlers = getDelegationHandlers(mockClient);
      expect(handlers.size).toBe(5);
      expect(handlers.has("create_delegation_offer")).toBe(true);
      expect(handlers.has("accept_delegation_offer")).toBe(true);
      expect(handlers.has("handle_delegation_message")).toBe(true);
      expect(handlers.has("list_delegation_offers")).toBe(true);
      expect(handlers.has("get_delegation_details")).toBe(true);
    });

    it("all handlers return parseable JSON content", async () => {
      const handlers = getDelegationHandlers(mockClient);

      (mockClient.createDelegationOffer as any).mockResolvedValue({ offer: {}, oobUrl: "" });
      (mockClient.acceptDelegationOffer as any).mockResolvedValue(undefined);
      (mockClient.handleDelegationMessage as any).mockResolvedValue({ handled: true, type: "test" });
      (mockClient.listDelegationOffers as any).mockResolvedValue([]);
      (mockClient.getDelegationDetails as any).mockResolvedValue({});

      const cases: [string, unknown][] = [
        ["create_delegation_offer", { credentialId: "c", delegationPolicy: {}, delegationRole: "r" }],
        ["accept_delegation_offer", { offerId: "o" }],
        ["handle_delegation_message", { message: "didcomm://?_oob=x" }],
        ["list_delegation_offers", {}],
        ["get_delegation_details", { credentialId: "c" }],
      ];

      for (const [name, args] of cases) {
        const result = await handlers.get(name)!(args);
        expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      }
    });
  });
});
