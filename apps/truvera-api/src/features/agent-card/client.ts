import type { ToolDef } from "@truvera/mcp-shared/tools";
import type { AgentCardDetails, GetAgentCardDetailsResult } from "./types.js";

export class AgentCardClient {
  private tools: ToolDef[];

  constructor(tools: ToolDef[]) {
    this.tools = tools;
  }

  async getAgentCardDetails(): Promise<GetAgentCardDetailsResult> {
    const details: AgentCardDetails = {
      skills: this.tools
        .filter((t) => t.name !== "get_agent_card_details")
        .map((t) => ({
          id: t.name,
          name: t.title ?? t.name.replace(/_/g, " "),
          description: t.description,
        })),
    };

    return { success: true, details };
  }
}
