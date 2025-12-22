import type { TrustRegistriesClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";

export const toolDefs: ToolDef[] = [
  { name: "list_trust_registries", description: "List trust registries", inputSchema: { type: "object" } },
  { name: "create_trust_registry", description: "Create trust registry", inputSchema: { type: "object" } },
  { name: "get_trust_registry", description: "Get trust registry", inputSchema: { type: "object", required: ["id"] } },
  { name: "delete_trust_registry", description: "Delete trust registry", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(trustRegistries: TrustRegistriesClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("list_trust_registries", async (args) => formatResult(await trustRegistries.listTrustRegistries(args || {})));
  handlers.set("create_trust_registry", async (args) => formatResult(await trustRegistries.createTrustRegistry(args)));
  handlers.set("get_trust_registry", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await trustRegistries.getTrustRegistry(id));
  });
  handlers.set("delete_trust_registry", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await trustRegistries.deleteTrustRegistry(id));
  });

  return handlers;
}
