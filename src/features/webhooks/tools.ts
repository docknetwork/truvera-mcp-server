import type { WebhooksClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";

export const toolDefs: ToolDef[] = [
  { name: "create_webhook", description: "Create webhook", inputSchema: { type: "object" } },
  { name: "list_webhooks", description: "List webhooks", inputSchema: { type: "object" } },
  { name: "get_webhook", description: "Get webhook", inputSchema: { type: "object", required: ["id"] } },
  { name: "update_webhook", description: "Update webhook", inputSchema: { type: "object" } },
  { name: "delete_webhook", description: "Delete webhook", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(webhooks: WebhooksClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_webhook", async (args) => formatResult(await webhooks.createWebhook(args)));
  handlers.set("list_webhooks", async () => formatResult(await webhooks.listWebhooks()));
  handlers.set("get_webhook", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await webhooks.getWebhook(id));
  });
  handlers.set("update_webhook", async (args) => {
    const { id, body } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await webhooks.updateWebhook(id, body));
  });
  handlers.set("delete_webhook", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await webhooks.deleteWebhook(id));
  });

  return handlers;
}
