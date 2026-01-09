import type { MessagingClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "send_message", description: "Send message. POST /messages. ⚠️ IMPORTANT: DIDComm message format and field structure in Truvera may differ from standard DIDComm specifications. ALWAYS check the Truvera API spec for exact field names, message types, and envelope structure: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.SendMessageRequest },
  { name: "list_messages", description: "List messages. GET /messages. Supports offset and limit pagination. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ListMessagesOptions },
  { name: "get_message", description: "Get message by ID. GET /messages/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.GetMessageRequest },
  { name: "delete_message", description: "Delete message by ID. DELETE /messages/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.DeleteMessageRequest },
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
