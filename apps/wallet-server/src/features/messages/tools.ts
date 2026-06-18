/**
 * Message Tools
 * MCP tool definitions and handlers for DIDComm messaging
 */

import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { MessageClient } from "./client.js";
import { fetchMessagesSchema, sendMessageSchema } from "./schemas.js";

export const messageToolDefs: ToolDef[] = [
  {
    name: "fetch_messages",
    title: "Fetch Messages",
    description:
      "Fetch and decrypt pending DIDComm messages from the relay service. Returns all new messages with their type and body. For RequestPresentation messages, call respond_to_proof_request with body.proofRequest to fulfil the request.",
    inputSchema: fetchMessagesSchema,
  },
  {
    name: "send_message",
    title: "Send Message",
    description:
      "Send a DIDComm message to a recipient DID via the relay service. Use for sending acknowledgements or basic messages to other agents.",
    inputSchema: sendMessageSchema,
  },
];

export function getMessageHandlers(client: MessageClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("fetch_messages", async () => {
    try {
      const result = await client.fetchMessages();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: result.success,
                messages: result.messages,
                fetchedCount: result.fetchedCount,
                processedCount: result.processedCount,
                message: result.message,
              },
              null,
              2
            ),
          },
        ],
        ...(result.success ? {} : { isError: true }),
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  handlers.set("send_message", async (args: unknown) => {
    try {
      const params = args as Record<string, unknown>;
      const to = params.to as string;
      const message = params.message as Record<string, unknown>;
      const type = params.type as string | undefined;
      const from = params.from as string | undefined;

      if (!to || typeof to !== "string") {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: "to parameter is required and must be a string" }, null, 2) }],
          isError: true,
        };
      }

      if (!message || typeof message !== "object" || Array.isArray(message)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: "message parameter is required and must be an object" }, null, 2) }],
          isError: true,
        };
      }

      const result = await client.sendMessage({ to, message, type, from });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: result.success, message: result.message }, null, 2),
          },
        ],
        ...(result.success ? {} : { isError: true }),
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return handlers;
}
