import type { CredentialsClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import type { IssueCredentialRequest } from "./types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "list_credentials", description: "List credentials. GET /credentials. Supports offset and limit pagination. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ListCredentialsOptions },
  { name: "issue_credential", description: "Issue a verifiable credential using the Truvera API. POST /credentials. ⚠️ IMPORTANT: Do NOT assume W3C VC standard conventions—field names and structure may differ significantly (e.g., 'subject' not 'credentialSubject'). ALWAYS consult the Truvera API spec for exact field names and requirements: https://swagger-api.truvera.io/openapi.yaml. Before constructing the payload, always fetch and parse the credential schema JSON from the provided 'schema' URI to determine the required structure of the 'subject' object. The payload must match the schema’s required fields and nesting exactly. If any required subject fields (as determined from the schema) are missing from the user’s input, prompt the user to provide those specific values before proceeding. Do not generate or assume values for required fields without user confirmation.", inputSchema: components.schemas.CredentialIssueRequest },
  { name: "get_credential", description: "Get credential by ID. GET /credentials/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.GetCredentialRequest },
  { name: "delete_credential", description: "Delete credential by ID. DELETE /credentials/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.DeleteCredentialRequest },
];

export function getHandlers(credentials: CredentialsClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("list_credentials", async (args) => formatResult(await credentials.listCredentials(args || {})));
  handlers.set("issue_credential", async (args) => formatResult(await credentials.issueCredential(args as IssueCredentialRequest)));
  handlers.set("get_credential", async (args) => {
    const { id, password } = args as { id?: string; password?: string };
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await credentials.getCredential(id, password));
  });
  handlers.set("delete_credential", async (args) => {
    const { id } = args as { id?: string };
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await credentials.deleteCredential(id));
  });

  return handlers;
}
