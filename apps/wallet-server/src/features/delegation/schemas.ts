export const createDelegationOfferSchema = {
  type: "object",
  required: ["credentialId", "delegationPolicy", "delegationRole"],
  properties: {
    credentialId: {
      type: "string",
      description: "ID of a delegatable credential already in the wallet to delegate from. The credential must have a delegation context.",
    },
    delegationPolicy: {
      type: "object",
      description: "The delegation policy JSON (obtain from get_delegation_rule on the Truvera API server). Defines the roles, capabilities, and constraints for this delegation.",
    },
    delegationRole: {
      type: "string",
      description: "The roleId from the delegation policy to assign to the delegatee.",
    },
    issuerDID: {
      type: "string",
      description: "DID in the wallet to issue the offer from. If omitted, the wallet's default (first) DID is used. Use list_dids to see available DIDs.",
    },
    expiresInMs: {
      type: "number",
      description: "How long the offer is valid in milliseconds. Defaults to 24 hours.",
    },
  },
};

export const acceptDelegationOfferSchema = {
  type: "object",
  required: ["offerId"],
  properties: {
    offerId: {
      type: "string",
      description: "ID of a DelegationOffer stored in the wallet (from handle_delegation_message or list_delegation_offers) to accept. Sends a credential request to the issuer via DIDComm.",
    },
  },
};

export const handleDelegationMessageSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: {
      description: "A delegation-related message to process. Accepts: a didcomm:// OOB invitation URL (from a QR code or link), or a raw DIDComm JSON object (request-credential, issue-credential, or ack message).",
      oneOf: [{ type: "string" }, { type: "object" }],
    },
  },
};

export const getDelegationDetailsSchema = {
  type: "object",
  required: ["credentialId"],
  properties: {
    credentialId: {
      type: "string",
      description: "ID of a delegatable credential in the wallet to inspect.",
    },
  },
};
