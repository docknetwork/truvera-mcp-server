/**
 * Credential Tools
 * MCP tool definitions and handlers for credential operations
 */

import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { CredentialClient } from "./client.js";
import { listCredentialsSchema } from "./schemas.js";

export const credentialToolDefs: ToolDef[] = [
  {
    name: "list_credentials",
    title: "List Credentials",
    description: "List all verifiable credentials stored in the wallet, including their type, issuer, and issuance information.",
    inputSchema: listCredentialsSchema,
  },
];

export function getCredentialHandlers(client: CredentialClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // List credentials
  handlers.set("list_credentials", async () => {
    try {
      const result = await client.listCredentials();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                credentials: result.credentials,
                count: result.count,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return handlers;
}
