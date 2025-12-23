import type { TeamsClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";

export const toolDefs: ToolDef[] = [
  { name: "get_team", description: "Get team", inputSchema: { type: "object", required: ["id"] } },
  { name: "update_team", description: "Update team", inputSchema: { type: "object" } },
  { name: "list_invitations", description: "List invitations", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" }, offset: { type: "integer" }, limit: { type: "integer" } } } },
  { name: "list_members", description: "List members", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "integer" }, offset: { type: "integer" }, limit: { type: "integer" } } } },
];

export function getHandlers(teams: TeamsClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("get_team", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await teams.getTeam(id));
  });
  handlers.set("update_team", async (args) => {
    const { id, body } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await teams.updateTeam(id, body));
  });
  handlers.set("list_invitations", async (args) => {
    const { id, offset, limit } = args as any;
    if (id === undefined || id === null) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    const teamId = Number(id);
    if (!Number.isInteger(teamId)) return { content: [{ type: "text", text: "Error: 'id' must be an integer" }], isError: true };
    return formatResult(await teams.listInvitations(teamId, { offset, limit }));
  });
  handlers.set("list_members", async (args) => {
    const { id, offset, limit } = args as any;
    if (id === undefined || id === null) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    const teamId = Number(id);
    if (!Number.isInteger(teamId)) return { content: [{ type: "text", text: "Error: 'id' must be an integer" }], isError: true };
    return formatResult(await teams.listMembers(teamId, { offset, limit }));
  });

  return handlers;
}
