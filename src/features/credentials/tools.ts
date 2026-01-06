import type { CredentialsClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "list_credentials", description: "List credentials", inputSchema: components.schemas.ListCredentialsOptions },
  { name: "issue_credential", description: "Issue a verifiable credential using the Truvera API.", inputSchema: components.schemas.CredentialIssueRequest },
  { name: "get_credential", description: "Get credential", inputSchema: components.schemas.GetCredentialRequest },
  { name: "delete_credential", description: "Delete credential", inputSchema: components.schemas.DeleteCredentialRequest },
];

export function getHandlers(credentials: CredentialsClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("list_credentials", async (args) => formatResult(await credentials.listCredentials(args || {})));
  handlers.set("issue_credential", async (args) => formatResult(await credentials.issueCredential(args)));
  handlers.set("get_credential", async (args) => {
    const { id, password } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await credentials.getCredential(id, password));
  });
  handlers.set("delete_credential", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await credentials.deleteCredential(id));
  });

  return handlers;
}
