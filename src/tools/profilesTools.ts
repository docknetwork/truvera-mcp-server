import type { ProfilesClient } from "../clients/profiles.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "create_profile", description: "Create profile", inputSchema: { type: "object" } },
  { name: "list_profiles", description: "List profiles", inputSchema: { type: "object" } },
  { name: "get_profile", description: "Get profile", inputSchema: { type: "object", required: ["id"] } },
  { name: "update_profile", description: "Update profile", inputSchema: { type: "object" } },
  { name: "delete_profile", description: "Delete profile", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(profiles: ProfilesClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_profile", async (args) => formatResult(await profiles.createProfile(args)));
  handlers.set("list_profiles", async (args) => formatResult(await profiles.listProfiles(args || {})));
  handlers.set("get_profile", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await profiles.getProfile(id));
  });
  handlers.set("update_profile", async (args) => {
    const { did, body } = args as any;
    if (!did) return { content: [{ type: "text", text: "Error: 'did' is required" }], isError: true };
    return formatResult(await profiles.updateProfile(did, body));
  });
  handlers.set("delete_profile", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await profiles.deleteProfile(id));
  });

  return handlers;
}
