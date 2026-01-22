import { components as shared } from "../shared/schemas.js";
import { components as credentials } from "../credentials/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    ...credentials.schemas,

    CreateCredentialOfferRequest: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid", description: "The OpenID issuer UUID" },
        requestParameters: { type: "object", description: "Optional extra request parameters passed to the federated OpenID provider, such as login hint" }
      }
    },

    GetCredentialOfferRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },

    ListIssuersOptions: shared.schemas.PaginationOptions,

    OpenIDAuthProviderOptions: {
      type: "object",
      description: "OpenID provider configuration",
      properties: {
        url: { type: "string" },
        scope: { type: "array", items: { type: "string" } },
        clientId: { type: "string" },
        clientSecret: { type: "string" },
        claimsSource: { type: "string" },
        requestParameters: { type: "object", description: "Optional extra request parameters passed to the federated OpenID provider, such as login hint" }
      }
    },

    CreateIssuerRequest: {
      type: "object",
      description: "Represents the configuration and options to create an OpenID issuer, including credential options, authentication provider details, and claim mappings.",
      required: ["credentialOptions"],
      properties: {
        credentialOptions: { $ref: "#/components/schemas/CredentialIssueRequest" },
        authProvider: { $ref: "#/components/schemas/OpenIDAuthProviderOptions" },
        claimMap: { type: "object", description: "Key/value pair mapping for OpenID claims to JSON-LD terms." },
        singleUse: { type: "boolean", default: false, description: "Whether or not to expire this issuer after one credential is issued" }
      }
    }
  }
};

