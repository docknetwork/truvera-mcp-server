import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { AgentCardClient } from "./client.js";
import { getAgentCardDetailsSchema } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  {
    name: "get_agent_card_details",
    title: "Get Agent Card Details",
    description:
      "Returns this API server's contribution to the agent's A2A identity: the credential issuance, verification, and DID management skills it provides. Combine with details from other connected MCP servers to assemble a complete Agent Card. Use list_dids to discover available issuer/verifier DIDs.",
    inputSchema: getAgentCardDetailsSchema,
  },
];

export function getHandlers(client: AgentCardClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("get_agent_card_details", async () => {
    const result = await client.getAgentCardDetails();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.success,
    };
  });

  return handlers;
}
