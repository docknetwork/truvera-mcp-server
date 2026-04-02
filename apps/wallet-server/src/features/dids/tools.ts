/**
 * DID Tools
 * MCP tool definitions and handlers for DID operations
 */

import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { DIDClient } from "./client.js";
import { getDefaultDIDSchema, createDIDSchema, listDIDsSchema } from "./schemas.js";

export const didToolDefs: ToolDef[] = [
  {
    name: "get_default_did",
    title: "Get Default DID",
    description: "Retrieve the default DID for the wallet. This is the primary identity used by default in credential and messaging operations.",
    inputSchema: getDefaultDIDSchema,
  },
  {
    name: "create_did",
    title: "Create New DID",
    description: "Generate a new Decentralized Identifier (DID) in the wallet. Each DID represents a unique identity that can hold credentials and participate in verification flows.",
    inputSchema: createDIDSchema,
  },
  {
    name: "list_dids",
    title: "List DIDs",
    description: "List all DIDs stored in the wallet, including the default DID if one is set.",
    inputSchema: listDIDsSchema,
  },
];

export function getDIDHandlers(client: DIDClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  // Get default DID
  handlers.set("get_default_did", async () => {
    try {
      const defaultDID = await client.getDefaultDID();
      
      if (!defaultDID) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  defaultDID: null,
                  message: "No default DID set. Create a DID first using create_did.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                defaultDID,
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

  // Create DID
  handlers.set("create_did", async (args: unknown) => {
    try {
      const params = (args as Record<string, unknown>) || {};
      const keyType = params.keyType as string | undefined;
      const result = await client.createDID(keyType);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                did: result.did,
                keyRef: result.keyRef,
                didDocument: result.didDocument,
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

  // List DIDs
  handlers.set("list_dids", async () => {
    try {
      const result = await client.listDIDs();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                dids: result.dids,
                count: result.count,
                defaultDID: result.defaultDID,
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
