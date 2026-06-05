/**
 * JSON Schema definitions for credential tool inputs
 */

export const listCredentialsSchema = {
  type: "object" as const,
  properties: {},
  required: [],
  additionalProperties: false,
};

export const importCredentialSchema = {
  type: "object" as const,
  properties: {
    uri: {
      type: "string" as const,
      description: "OpenID credential offer URI (e.g., openid-credential-offer://?credential_offer_uri=https://...)",
    },
  },
  required: ["uri"],
  additionalProperties: false,
};

export const respondToProofRequestSchema = {
  type: "object" as const,
  properties: {
    proofRequest: {
      type: "object" as const,
      description: "Proof request object returned by the Truvera API create proof request endpoint.",
    },
    selectedCredentialIds: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Optional explicit credential IDs to use when multiple credentials match.",
    },
    attributesToRevealByCredential: {
      type: "object" as const,
      description:
        "Optional selective disclosure map for BBS+ credentials. Keys are credential IDs; values are arrays of attribute paths to reveal. " +
        "Use the full JSON path as returned in availableAttributes (e.g. \"credentialSubject.startDate\"). " +
        "Bare attribute names without a path separator (e.g. \"startDate\") are also accepted and will be resolved automatically if the attribute exists in credentialSubject.",
      additionalProperties: {
        type: "array" as const,
        items: { type: "string" as const },
      },
    },
    interactive: {
      type: "boolean" as const,
      description: "When true (default), returns needs_input when user decisions are required.",
    },
    autoSubmit: {
      type: "boolean" as const,
      description: "When true (default), submit presentation to proofRequest.response_url after creation.",
    },
  },
  required: ["proofRequest"],
  additionalProperties: false,
};
