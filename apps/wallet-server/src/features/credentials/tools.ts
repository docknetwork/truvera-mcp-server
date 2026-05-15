/**
 * Credential Tools
 * MCP tool definitions and handlers for credential operations
 */

import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { CredentialClient } from "./client.js";
import { listCredentialsSchema, importCredentialSchema, respondToProofRequestSchema } from "./schemas.js";

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
  {
    name: "respond_to_proof_request",
    title: "Respond To Proof Request",
    description: "Create a verifiable presentation from wallet credentials that satisfies a proof request object returned by the Truvera API.",
    inputSchema: respondToProofRequestSchema,
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

  handlers.set("respond_to_proof_request", async (args: unknown) => {
    try {
      const params = (args as Record<string, unknown>) || {};
      const proofRequest = params.proofRequest;
      const selectedCredentialIds = params.selectedCredentialIds;
      const attributesToRevealByCredential = params.attributesToRevealByCredential;
      const interactive = params.interactive;
      const autoSubmit = params.autoSubmit;

      if (!proofRequest || typeof proofRequest !== "object" || Array.isArray(proofRequest)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: "proofRequest parameter is required and must be an object",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      if (
        selectedCredentialIds !== undefined &&
        (!Array.isArray(selectedCredentialIds) || selectedCredentialIds.some((id) => typeof id !== "string"))
      ) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: "selectedCredentialIds must be an array of strings when provided",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      if (attributesToRevealByCredential !== undefined) {
        if (
          typeof attributesToRevealByCredential !== "object" ||
          !attributesToRevealByCredential ||
          Array.isArray(attributesToRevealByCredential)
        ) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: "attributesToRevealByCredential must be an object when provided",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        const entries = Object.entries(attributesToRevealByCredential as Record<string, unknown>);
        const invalidEntry = entries.find(
          ([, value]) => !Array.isArray(value) || value.some((item) => typeof item !== "string")
        );
        if (invalidEntry) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    error: "attributesToRevealByCredential values must be arrays of strings",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }

      const result = await client.respondToProofRequest({
        proofRequest: proofRequest as Record<string, unknown>,
        selectedCredentialIds: selectedCredentialIds as string[] | undefined,
        attributesToRevealByCredential:
          attributesToRevealByCredential as Record<string, string[]> | undefined,
        interactive: typeof interactive === "boolean" ? interactive : undefined,
        autoSubmit: typeof autoSubmit === "boolean" ? autoSubmit : undefined,
      });

      if (result.status === "needs_input") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  status: result.status,
                  message: result.message,
                  requiredDecisions: result.requiredDecisions,
                  candidateCredentials: result.candidateCredentials,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  status: result.status,
                  presentation: result.presentation,
                  selectedCredentialIds: result.selectedCredentialIds,
                  selectedDID: result.selectedDID,
                  submission: result.submission,
                  sharedPresentationDetails: result.sharedPresentationDetails,
                  warnings: result.warnings,
                  message: result.message,
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
                success: false,
                status: result.status,
                error: result.message,
                presentation: result.presentation,
                selectedCredentialIds: result.selectedCredentialIds,
                selectedDID: result.selectedDID,
                submission: result.submission,
                sharedPresentationDetails: result.sharedPresentationDetails,
                errors: result.errors,
                warnings: result.warnings,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
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
