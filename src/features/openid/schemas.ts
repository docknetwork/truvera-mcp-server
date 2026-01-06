import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    CreateCredentialOfferRequest: { type: "object" },
    GetCredentialOfferRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    ListIssuersOptions: shared.schemas.PaginationOptions,
    CreateIssuerRequest: { type: "object" }
  }
};
