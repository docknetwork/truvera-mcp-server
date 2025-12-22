import type { RegistriesClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";

export const toolDefs: ToolDef[] = [
  { name: "list_registries", description: "List registries", inputSchema: { type: "object" } },
  { name: "create_registry", description: "Create registry", inputSchema: { type: "object" } },
  { name: "get_registry", description: "Get registry", inputSchema: { type: "object", required: ["id"] } },
  { name: "delete_registry", description: "Delete registry", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(registries: RegistriesClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("list_registries", async (args) => formatResult(await registries.listRegistries(args || {})));
  handlers.set("create_registry", async (args) => formatResult(await registries.createRegistry(args)));
  handlers.set("get_registry", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await registries.getRegistry(id));
  });
  handlers.set("delete_registry", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await registries.deleteRegistry(id));
  });

  return handlers;
}
