import { describe, it, expect, vi, beforeEach } from "vitest";
import { toolDefs, getHandlers } from "../../tools.js";
import type { DelegationClient } from "../../client.js";

describe("unit: delegation tools", () => {
  let mockClient: DelegationClient;

  beforeEach(() => {
    mockClient = {
      listDelegationRules: vi.fn(),
      getDelegationRule: vi.fn(),
      revokeDelegatableCredential: vi.fn(),
    } as any;
  });

  describe("tool definitions", () => {
    it("exports the correct tool names", () => {
      const names = toolDefs.map((t) => t.name);
      expect(names).toContain("list_delegation_rules");
      expect(names).toContain("get_delegation_rule");
      expect(names).toContain("revoke_delegatable_credential");
      expect(names).toHaveLength(3);
    });

    it("each tool has name, description, and inputSchema", () => {
      toolDefs.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
      });
    });

    it("get_delegation_rule requires id", () => {
      const tool = toolDefs.find((t) => t.name === "get_delegation_rule")!;
      expect((tool.inputSchema as any).required).toContain("id");
    });

    it("revoke_delegatable_credential requires action and credentialId", () => {
      const tool = toolDefs.find((t) => t.name === "revoke_delegatable_credential")!;
      const required = (tool.inputSchema as any).required as string[];
      expect(required).toContain("action");
      expect(required).toContain("credentialId");
    });

    it("revoke_delegatable_credential description mentions chain membership requirement", () => {
      const tool = toolDefs.find((t) => t.name === "revoke_delegatable_credential")!;
      expect(tool.description).toMatch(/delegation chain/i);
    });
  });

  describe("list_delegation_rules handler", () => {
    it("calls client.listDelegationRules and returns the rule list", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("list_delegation_rules")!;

      const mockRules = [{ id: "rule-1", name: "Travel Policy", schemaIds: [] }];
      (mockClient.listDelegationRules as any).mockResolvedValue({ success: true, data: mockRules });

      const result = await handler({});

      expect(mockClient.listDelegationRules).toHaveBeenCalledOnce();
      expect(result.isError).not.toBe(true);
      // formatResult serialises result.data directly, not a {success, data} wrapper
      const body = JSON.parse(result.content[0].text);
      expect(body).toEqual(mockRules);
    });

    it("surfaces client errors as isError", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("list_delegation_rules")!;

      (mockClient.listDelegationRules as any).mockResolvedValue({ success: false, error: "Unauthorized" });

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Unauthorized");
    });
  });

  describe("get_delegation_rule handler", () => {
    it("calls client.getDelegationRule with the provided id", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("get_delegation_rule")!;

      const mockRule = { id: "rule-1", name: "Travel Policy", policy: {}, schemaIds: [] };
      (mockClient.getDelegationRule as any).mockResolvedValue({ success: true, data: mockRule });

      const result = await handler({ id: "rule-1" });

      expect(mockClient.getDelegationRule).toHaveBeenCalledWith("rule-1");
      expect(result.isError).not.toBe(true);
      expect(JSON.parse(result.content[0].text)).toEqual(mockRule);
    });

    it("returns isError when id is missing", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("get_delegation_rule")!;

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(mockClient.getDelegationRule).not.toHaveBeenCalled();
    });

    it("surfaces client errors as isError", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("get_delegation_rule")!;

      (mockClient.getDelegationRule as any).mockResolvedValue({ success: false, error: "Not found" });

      const result = await handler({ id: "missing-id" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Not found");
    });
  });

  describe("revoke_delegatable_credential handler", () => {
    it("calls client with revoke action and credentialId", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("revoke_delegatable_credential")!;

      const mockResponse = { action: "revoke", credentialId: "cred-1" };
      (mockClient.revokeDelegatableCredential as any).mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await handler({ action: "revoke", credentialId: "cred-1" });

      expect(mockClient.revokeDelegatableCredential).toHaveBeenCalledWith({
        action: "revoke",
        credentialId: "cred-1",
      });
      expect(result.isError).not.toBe(true);
      expect(JSON.parse(result.content[0].text)).toEqual(mockResponse);
    });

    it("calls client with unrevoke action", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("revoke_delegatable_credential")!;

      (mockClient.revokeDelegatableCredential as any).mockResolvedValue({
        success: true,
        data: { action: "unrevoke", credentialId: "cred-1" },
      });

      await handler({ action: "unrevoke", credentialId: "cred-1" });

      expect(mockClient.revokeDelegatableCredential).toHaveBeenCalledWith({
        action: "unrevoke",
        credentialId: "cred-1",
      });
    });

    it("passes optional registryId to client", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("revoke_delegatable_credential")!;

      (mockClient.revokeDelegatableCredential as any).mockResolvedValue({ success: true, data: {} });

      await handler({ action: "revoke", credentialId: "cred-1", registryId: "0xdeadbeef" });

      expect(mockClient.revokeDelegatableCredential).toHaveBeenCalledWith({
        action: "revoke",
        credentialId: "cred-1",
        registryId: "0xdeadbeef",
      });
    });

    it("surfaces client errors as isError", async () => {
      const handlers = getHandlers(mockClient);
      const handler = handlers.get("revoke_delegatable_credential")!;

      (mockClient.revokeDelegatableCredential as any).mockResolvedValue({
        success: false,
        error: "Not a chain member",
      });

      const result = await handler({ action: "revoke", credentialId: "cred-1" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Not a chain member");
    });
  });

  describe("handler registration", () => {
    it("registers all three handlers", () => {
      const handlers = getHandlers(mockClient);
      expect(handlers.size).toBe(3);
      expect(handlers.has("list_delegation_rules")).toBe(true);
      expect(handlers.has("get_delegation_rule")).toBe(true);
      expect(handlers.has("revoke_delegatable_credential")).toBe(true);
    });

    it("all handlers return parseable JSON content on success", async () => {
      const handlers = getHandlers(mockClient);

      (mockClient.listDelegationRules as any).mockResolvedValue({ success: true, data: [] });
      (mockClient.getDelegationRule as any).mockResolvedValue({ success: true, data: {} });
      (mockClient.revokeDelegatableCredential as any).mockResolvedValue({ success: true, data: {} });

      for (const [name, handler] of handlers) {
        const args = name === "get_delegation_rule"
          ? { id: "rule-1" }
          : name === "revoke_delegatable_credential"
          ? { action: "revoke", credentialId: "cred-1" }
          : {};
        const result = await handler(args);
        expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      }
    });
  });
});
