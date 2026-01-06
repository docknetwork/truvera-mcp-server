import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    CreateDidRequest: {
      type: "object",
      required: ["method"],
      properties: {
        method: { type: "string" },
        document: { type: "object" },
        metadata: { type: "object" }
      }
    },
    GetDidRequest: {
      type: "object",
      required: ["did"],
      properties: { did: shared.schemas.DID }
    },
    ListDidsOptions: shared.schemas.PaginationOptions,
    DeleteDidRequest: {
      type: "object",
      required: ["did"],
      properties: { did: shared.schemas.DID, fromBlockchain: { type: "boolean", default: true } }
    },
    ExportDidRequest: {
      type: "object",
      required: ["did", "password"],
      properties: { did: shared.schemas.DID, password: { type: "string" } }
    },
    ImportDidsRequest: {
      type: "object",
      required: ["data"],
      properties: { data: { type: "string" }, password: { type: "string" } }
    }
  }
};
