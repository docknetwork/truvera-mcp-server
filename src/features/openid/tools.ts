import type { OpenIdClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "create_credential_offer", description: "Create credential offer", inputSchema: components.schemas.CreateCredentialOfferRequest },
  { name: "get_credential_offer", description: "Get credential offer", inputSchema: components.schemas.GetCredentialOfferRequest },
  { name: "list_issuers", description: "List issuers", inputSchema: components.schemas.ListIssuersOptions },
  { name: "create_issuer", description: "Create issuer", inputSchema: components.schemas.CreateIssuerRequest },
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
