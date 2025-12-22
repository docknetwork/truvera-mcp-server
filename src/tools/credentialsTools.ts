import type { CredentialsClient } from "../clients/credentials.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "list_credentials", description: "List credentials", inputSchema: { type: "object" } },
  { name: "issue_credential", description: "Issue a credential", inputSchema: { type: "object" } },
  { name: "get_credential", description: "Get credential", inputSchema: { type: "object", required: ["id"] } },
  { name: "delete_credential", description: "Delete credential", inputSchema: { type: "object", required: ["id"] } },
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
