export interface AgentCardSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
}

/** This server's contribution to an agent's A2A identity. */
export interface AgentCardDetails {
  skills: AgentCardSkill[];
}

export interface GetAgentCardDetailsResult {
  success: boolean;
  details?: AgentCardDetails;
  message?: string;
}
