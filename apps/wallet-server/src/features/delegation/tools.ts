import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import type { DelegationClient } from "./client.js";
import type { CreateDelegationOfferParams, AcceptDelegationOfferParams, HandleDelegationMessageParams } from "./types.js";
import {
  createDelegationOfferSchema,
  acceptDelegationOfferSchema,
  handleDelegationMessageSchema,
  getDelegationDetailsSchema,
} from "./schemas.js";

export const delegationToolDefs: ToolDef[] = [
  {
    name: "create_delegation_offer",
    title: "Create Delegation Offer",
    description: "Create a delegation offer from a delegatable credential in the wallet and return an OOB invitation URL to share with the delegatee (e.g. as a QR code or link). The credential must have a delegation context. Use get_delegation_rule on the Truvera API server to obtain the delegationPolicy.",
    inputSchema: createDelegationOfferSchema,
  },
  {
    name: "accept_delegation_offer",
    title: "Accept Delegation Offer",
    description: "Accept a delegation offer stored in the wallet by sending a DIDComm credential request to the issuer. Call handle_delegation_message first with the OOB invitation URL to store the offer, then call this tool with the returned offerId.",
    inputSchema: acceptDelegationOfferSchema,
  },
  {
    name: "handle_delegation_message",
    title: "Handle Delegation Message",
    description: "Process an incoming delegation message: a didcomm:// OOB invitation URL (from a QR code or shared link), or a raw DIDComm JSON message (request-credential, issue-credential, or ack). Stores any received delegation offers or credentials in the wallet and sends any required responses.",
    inputSchema: handleDelegationMessageSchema,
  },
  {
    name: "list_delegation_offers",
    title: "List Delegation Offers",
    description: "List all delegation offers stored in the wallet, including both sent (as issuer) and received (as delegatee) offers, along with their current status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_delegation_details",
    title: "Get Delegation Details",
    description: "Get delegation details for a delegatable credential in the wallet: the delegation chain, policy, assigned role, available sub-roles for further delegation, and remaining delegation depth.",
    inputSchema: getDelegationDetailsSchema,
  },
];

export function getDelegationHandlers(client: DelegationClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_delegation_offer", async (args: unknown) => {
    try {
      const params = args as CreateDelegationOfferParams;
      const result = await client.createDelegationOffer(params);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, ...result }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2) }],
        isError: true,
      };
    }
  });

  handlers.set("accept_delegation_offer", async (args: unknown) => {
    try {
      const { offerId } = args as AcceptDelegationOfferParams;
      await client.acceptDelegationOffer(offerId);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, message: "Credential request sent to issuer. The issuer will issue the delegated credential via DIDComm. Call handle_delegation_message when you receive the response." }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2) }],
        isError: true,
      };
    }
  });

  handlers.set("handle_delegation_message", async (args: unknown) => {
    try {
      const { message } = args as HandleDelegationMessageParams;
      const result = await client.handleDelegationMessage(message);
      if (!result.handled) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: "Message could not be decoded or matched no delegation handler. Ensure it is a valid didcomm:// OOB URL or a DIDComm delegation JSON message." }, null, 2) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, type: result.type, message: "Message processed successfully." }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2) }],
        isError: true,
      };
    }
  });

  handlers.set("list_delegation_offers", async () => {
    try {
      const offers = await client.listDelegationOffers();
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, offers, count: offers.length }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2) }],
        isError: true,
      };
    }
  });

  handlers.set("get_delegation_details", async (args: unknown) => {
    try {
      const { credentialId } = args as { credentialId: string };
      const details = await client.getDelegationDetails(credentialId);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, ...details }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2) }],
        isError: true,
      };
    }
  });

  return handlers;
}
