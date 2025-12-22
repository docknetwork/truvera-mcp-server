import type { MessagingClient } from "../clients/messaging.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "send_message", description: "Send message", inputSchema: { type: "object" } },
  { name: "list_messages", description: "List messages", inputSchema: { type: "object" } },
  { name: "get_message", description: "Get message", inputSchema: { type: "object", required: ["id"] } },
  { name: "delete_message", description: "Delete message", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(messaging: MessagingClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("send_message", async (args) => formatResult(await messaging.sendMessage(args)));
  handlers.set("list_messages", async (args) => formatResult(await messaging.listMessages(args || {})));
  handlers.set("get_message", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await messaging.getMessage(id));
  });
  handlers.set("delete_message", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await messaging.deleteMessage(id));
  });

  return handlers;
}
