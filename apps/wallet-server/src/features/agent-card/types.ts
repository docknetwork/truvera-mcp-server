export interface AgentCardSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
}

/** This server's contribution to an agent's A2A identity. */
export interface AgentCardDetails {
  /** Wallet DID — used for DIDComm routing and as the holder identity. */
  did?: string;
  skills: AgentCardSkill[];
}

export interface GetAgentCardDetailsResult {
  success: boolean;
  details?: AgentCardDetails;
  message?: string;
}
