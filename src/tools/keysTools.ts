import type { KeysClient } from "../clients/keys.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "list_keys", description: "List keys", inputSchema: { type: "object" } },
  { name: "create_key", description: "Create key", inputSchema: { type: "object" } },
  { name: "update_key", description: "Update key", inputSchema: { type: "object" } },
  { name: "delete_key", description: "Delete key", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(keys: KeysClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("list_keys", async (args) => formatResult(await keys.listKeys(args || {})));
  handlers.set("create_key", async (args) => formatResult(await keys.createKey(args)));
  handlers.set("update_key", async (args) => {
    const { publicKey, body } = args as any;
    if (!publicKey) return { content: [{ type: "text", text: "Error: 'publicKey' is required" }], isError: true };
    return formatResult(await keys.updateKey(publicKey, body));
  });
  handlers.set("delete_key", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await keys.deleteKey(id));
  });

  return handlers;
}
