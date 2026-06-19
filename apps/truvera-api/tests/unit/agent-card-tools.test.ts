import { describe, it, expect } from "vitest";
import { AgentCardClient } from "../../src/features/agent-card/client.js";
import { toolDefs, getHandlers } from "../../src/features/agent-card/tools.js";
import type { ToolDef } from "@truvera/mcp-shared/tools";

const fakeTools: ToolDef[] = [
  { name: "create_did", title: "Create DID", description: "Create a new DID." },
  { name: "list_dids", title: "List DIDs", description: "List all DIDs." },
  { name: "issue_credential", title: "Issue Credential", description: "Issue a verifiable credential." },
  { name: "get_agent_card_details", title: "Get Agent Card Details", description: "Returns agent card details." },
];

describe("unit: agent-card tools", () => {
  describe("toolDefs", () => {
    it("exports one tool", () => {
      expect(toolDefs).toHaveLength(1);
      expect(toolDefs[0].name).toBe("get_agent_card_details");
      expect(toolDefs[0]).toHaveProperty("title");
      expect(toolDefs[0]).toHaveProperty("description");
      expect(toolDefs[0].inputSchema).toHaveProperty("type", "object");
    });
  });

  describe("getHandlers", () => {
    it("registers one handler", () => {
      const handlers = getHandlers(new AgentCardClient(fakeTools));
      expect(handlers.size).toBe(1);
      expect(handlers.has("get_agent_card_details")).toBe(true);
    });
  });

  describe("get_agent_card_details handler", () => {
    it("derives skills from the provided tool list, excluding itself", async () => {
      const handlers = getHandlers(new AgentCardClient(fakeTools));
      const result = await handlers.get("get_agent_card_details")!({});
      expect(result.isError).toBeFalsy();
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(true);
      const ids = parsed.details.skills.map((s: any) => s.id);
      expect(ids).toContain("create_did");
      expect(ids).toContain("list_dids");
      expect(ids).toContain("issue_credential");
      expect(ids).not.toContain("get_agent_card_details");
    });

    it("uses title as skill name when available", async () => {
      const handlers = getHandlers(new AgentCardClient(fakeTools));
      const result = await handlers.get("get_agent_card_details")!({});
      const parsed = JSON.parse((result.content[0] as any).text);
      const createDid = parsed.details.skills.find((s: any) => s.id === "create_did");
      expect(createDid.name).toBe("Create DID");
    });

    it("falls back to formatted tool name when title is absent", async () => {
      const tools: ToolDef[] = [{ name: "my_tool", description: "Does something." }];
      const handlers = getHandlers(new AgentCardClient(tools));
      const result = await handlers.get("get_agent_card_details")!({});
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.details.skills[0].name).toBe("my tool");
    });

    it("reflects tools added after construction (by-reference array)", async () => {
      const tools: ToolDef[] = [
        { name: "create_did", title: "Create DID", description: "Create a DID." },
      ];
      const client = new AgentCardClient(tools);
      tools.push({ name: "new_tool", title: "New Tool", description: "Added later." });

      const handlers = getHandlers(client);
      const result = await handlers.get("get_agent_card_details")!({});
      const parsed = JSON.parse((result.content[0] as any).text);
      const ids = parsed.details.skills.map((s: any) => s.id);
      expect(ids).toContain("new_tool");
    });
  });

  describe("composeTools integration", () => {
    it("get_agent_card_details is included in buildToolList", async () => {
      const { buildToolList, buildHandlerMapFromTruvera } = await import("../../src/tools/composeTools.js");
      const { TruveraClient } = await import("../../src/clients/index.js");
      const tools = buildToolList();
      expect(tools.map((t) => t.name)).toContain("get_agent_card_details");
      const handlers = buildHandlerMapFromTruvera(new TruveraClient("test-key", "http://localhost"), tools);
      expect(handlers.has("get_agent_card_details")).toBe(true);
    });
  });
});
