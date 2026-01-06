import type { ProfilesClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "create_profile", description: "Create profile", inputSchema: components.schemas.CreateProfileRequest },
  { name: "list_profiles", description: "List profiles", inputSchema: components.schemas.ListProfilesOptions },
  { name: "get_profile", description: "Get profile", inputSchema: components.schemas.GetProfileRequest },
  { name: "update_profile", description: "Update profile", inputSchema: components.schemas.UpdateProfileRequest },
  { name: "delete_profile", description: "Delete profile", inputSchema: components.schemas.DeleteProfileRequest },
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
