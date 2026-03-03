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
