/**
 * Credential Tools
 * MCP tool definitions and handlers for credential operations
 */

import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { CredentialClient } from "./client.js";
import { listCredentialsSchema, importCredentialSchema } from "./schemas.js";

export const credentialToolDefs: ToolDef[] = [
  {
    name: "list_credentials",
    title: "List Credentials",
    description: "List all verifiable credentials stored in the wallet, including their type, issuer, and issuance information.",
    inputSchema: listCredentialsSchema,
  },
  {
    name: "import_credential",
    title: "Import Credential",
    description: "Import a verifiable credential from an OpenID credential offer URI. Accepts credential offers in the format: openid-credential-offer://?credential_offer_uri=https://...",
    inputSchema: importCredentialSchema,
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

  // Import credential
  handlers.set("import_credential", async (args: unknown) => {
    console.log('[import_credential handler] Received request with args:', JSON.stringify(args));
    try {
      const params = args as Record<string, unknown>;
      const uri = params.uri as string;
      
      console.log('[import_credential handler] Extracted URI:', uri);
      
      if (!uri || typeof uri !== "string") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: "URI parameter is required and must be a string",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
      
      console.log('[import_credential handler] Calling client.importCredential...');
      const result = await client.importCredential(uri);
      console.log('[import_credential handler] Client returned:', JSON.stringify({ success: result.success, hasCredential: !!result.credential, message: result.message }));

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  credential: result.credential,
                  message: result.message,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: result.message,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
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
