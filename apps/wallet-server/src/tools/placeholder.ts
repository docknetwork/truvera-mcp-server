import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";

export const toolDefs: ToolDef[] = [
  {
    name: "get_wallet_info",
    description: "Get basic information about the wallet (placeholder for testing)",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "wallet_status",
    description: "Check if wallet is initialized and ready (placeholder for testing)",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

export function getHandlers(): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("get_wallet_info", async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              name: process.env.WALLET_NAME || "default-wallet",
              version: "0.1.0",
              status: "placeholder",
              message: "Wallet MCP server is running. SDK integration coming soon.",
            },
            null,
            2
          ),
        },
      ],
    };
  });

  handlers.set("wallet_status", async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              initialized: false,
              ready: false,
              message: "Wallet SDK not yet integrated. This is a placeholder response.",
            },
            null,
            2
          ),
        },
      ],
    };
  });

  return handlers;
}
