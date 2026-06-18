import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { AgentCardClient } from "./client.js";
import { getAgentCardDetailsSchema } from "./schemas.js";

export const agentCardToolDefs: ToolDef[] = [
  {
    name: "get_agent_card_details",
    title: "Get Agent Card Details",
    description:
      "Returns this wallet server's contribution to the agent's A2A identity: the holder DID (for DIDComm routing) and the credential/messaging skills this server provides. Combine with details from other connected MCP servers to assemble a complete Agent Card.",
    inputSchema: getAgentCardDetailsSchema,
  },
];

export function getAgentCardHandlers(client: AgentCardClient): Map<string, ToolHandler> {
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
