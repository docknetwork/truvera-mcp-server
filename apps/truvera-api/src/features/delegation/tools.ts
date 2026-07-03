import type { DelegationClient } from "./client.js";
import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";
import type { DelegatableRevocationRequest } from "./types.js";

export const toolDefs: ToolDef[] = [
  {
    name: "list_delegation_rules",
    description: "List all delegation rule sets. GET /delegationRules. Returns the available delegation policies (roles, capabilities, constraints) that can be referenced when issuing a delegatable credential. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_delegation_rule",
    description: "Get a delegation rule set by ID. GET /delegationRules/{id}. Returns the full policy including role hierarchy, capabilities, and delegation constraints. Use this to inspect the policy before creating a delegation offer on the wallet server. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml",
    inputSchema: components.schemas.GetDelegationRuleRequest,
  },
  {
    name: "revoke_delegatable_credential",
    description: "Revoke or unrevoke a delegatable credential. POST /delegatableRevocation. ⚠️ This endpoint can only be called by a member of the credential's delegation chain — only participants with delegated authority may invoke revocation. Use action='revoke' to revoke or action='unrevoke' to reinstate. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml",
    inputSchema: components.schemas.DelegatableRevocationRequest,
  },
];

export function getHandlers(delegation: DelegationClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("list_delegation_rules", async () => formatResult(await delegation.listDelegationRules()));

  handlers.set("get_delegation_rule", async (args) => {
    const { id } = args as { id?: string };
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await delegation.getDelegationRule(id));
  });

  handlers.set("revoke_delegatable_credential", async (args) =>
    formatResult(await delegation.revokeDelegatableCredential(args as DelegatableRevocationRequest))
  );

  return handlers;
}
