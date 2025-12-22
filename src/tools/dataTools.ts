import type { DataClient } from "../clients/data.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "get_profile_data", description: "Get profile data", inputSchema: { type: "object" } },
  { name: "update_profile_data", description: "Update profile data", inputSchema: { type: "object" } },
  { name: "list_notifications", description: "List notifications", inputSchema: { type: "object" } },
];

export function getHandlers(data: DataClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("get_profile_data", async () => formatResult(await data.getProfile()));
  handlers.set("update_profile_data", async (args) => formatResult(await data.updateProfile(args)));
  handlers.set("list_notifications", async (args) => formatResult(await data.listNotifications(args || {})));

  return handlers;
}
