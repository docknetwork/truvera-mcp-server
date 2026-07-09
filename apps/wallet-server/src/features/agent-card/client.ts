import type { DIDClient } from "../dids/client.js";
import type { AgentCardDetails, GetAgentCardDetailsResult } from "./types.js";

export class AgentCardClient {
  private didClient: DIDClient;

  constructor(didClient: DIDClient) {
    this.didClient = didClient;
  }

  async getAgentCardDetails(): Promise<GetAgentCardDetailsResult> {
    try {
      const did = await this.didClient.getDefaultDID();

      const details: AgentCardDetails = {
        ...(did ? { did } : {}),
        skills: [
          {
            id: "credential-presentation",
            name: "Present Verifiable Credentials",
            description:
              "Respond to proof requests by building and submitting verifiable presentations from stored credentials.",
            tags: ["verifiable-credentials", "didcomm", "ap2", "a2a"],
          },
          {
            id: "credential-import",
            name: "Import Verifiable Credentials",
            description: "Accept and store verifiable credentials from OpenID credential offers.",
            tags: ["verifiable-credentials", "openid4vci"],
          },
          {
            id: "didcomm-messaging",
            name: "DIDComm Messaging",
            description:
              "Send and receive DIDComm messages for agent-to-agent credential exchange.",
            tags: ["didcomm", "a2a"],
          },
        ],
      };

      return { success: true, details };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
