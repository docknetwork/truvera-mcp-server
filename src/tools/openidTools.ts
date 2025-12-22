import type { OpenIdClient } from "../clients/openid.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "create_credential_offer", description: "Create credential offer", inputSchema: { type: "object" } },
  { name: "get_credential_offer", description: "Get credential offer", inputSchema: { type: "object", required: ["id"] } },
  { name: "list_issuers", description: "List issuers", inputSchema: { type: "object" } },
  { name: "create_issuer", description: "Create issuer", inputSchema: { type: "object" } },
];

export function getHandlers(openid: OpenIdClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_credential_offer", async (args) => formatResult(await openid.createCredentialOffer(args)));
  handlers.set("get_credential_offer", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await openid.getCredentialOffer(id));
  });
  handlers.set("list_issuers", async (args) => formatResult(await openid.listIssuers(args || {})));
  handlers.set("create_issuer", async (args) => formatResult(await openid.createIssuer(args)));

  return handlers;
}
