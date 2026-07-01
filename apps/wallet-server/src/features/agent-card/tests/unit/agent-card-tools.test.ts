import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentCardToolDefs, getAgentCardHandlers } from "../../tools.js";
import type { AgentCardClient } from "../../client.js";

describe("unit: Agent card tools", () => {
  let mockClient: AgentCardClient;

  beforeEach(() => {
    mockClient = {
      getAgentCardDetails: vi.fn(),
    } as any;
  });

  describe("Tool Definitions", () => {
    it("exports one tool definition", () => {
      expect(agentCardToolDefs).toHaveLength(1);
    });

    it("tool has required properties", () => {
      const tool = agentCardToolDefs[0];
      expect(tool.name).toBe("get_agent_card_details");
      expect(tool).toHaveProperty("title");
      expect(tool).toHaveProperty("description");
      expect(tool.inputSchema).toHaveProperty("type", "object");
    });
  });

  describe("Handler registration", () => {
    it("registers one handler", () => {
      const handlers = getAgentCardHandlers(mockClient);
      expect(handlers.size).toBe(1);
      expect(handlers.has("get_agent_card_details")).toBe(true);
    });
  });

  describe("get_agent_card_details handler", () => {
    it("returns details on success with DID", async () => {
      const handlers = getAgentCardHandlers(mockClient);
      const handler = handlers.get("get_agent_card_details")!;

      vi.mocked(mockClient.getAgentCardDetails).mockResolvedValue({
        success: true,
        details: {
          did: "did:key:z6MkTest",
          skills: [
            { id: "credential-presentation", name: "Present Verifiable Credentials", description: "..." },
          ],
        },
      });

      const result = await handler({});
      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(true);
      expect(parsed.details.did).toBe("did:key:z6MkTest");
      expect(parsed.details.skills).toHaveLength(1);
    });

    it("returns details without DID when wallet has none", async () => {
      const handlers = getAgentCardHandlers(mockClient);
      const handler = handlers.get("get_agent_card_details")!;

      vi.mocked(mockClient.getAgentCardDetails).mockResolvedValue({
        success: true,
        details: {
          skills: [
            { id: "credential-presentation", name: "Present Verifiable Credentials", description: "..." },
          ],
        },
      });

      const result = await handler({});
      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.details.did).toBeUndefined();
    });

    it("returns error response when getAgentCardDetails fails", async () => {
      const handlers = getAgentCardHandlers(mockClient);
      const handler = handlers.get("get_agent_card_details")!;

      vi.mocked(mockClient.getAgentCardDetails).mockResolvedValue({
        success: false,
        message: "DID provider failed",
      });

      const result = await handler({});
      expect(result.isError).toBe(true);
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.message).toBe("DID provider failed");
    });
  });
});
