import type { TeamsClient } from "../clients/teams.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "get_team", description: "Get team", inputSchema: { type: "object", required: ["id"] } },
  { name: "update_team", description: "Update team", inputSchema: { type: "object" } },
  { name: "list_invitations", description: "List invitations", inputSchema: { type: "object" } },
  { name: "list_members", description: "List members", inputSchema: { type: "object" } },
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
  handlers.set("list_invitations", async (args) => formatResult(await teams.listInvitations(args || {})));
  handlers.set("list_members", async (args) => formatResult(await teams.listMembers(args || {})));

  return handlers;
}
