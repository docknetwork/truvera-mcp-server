import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    CreateDidRequest: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["cheqd", "key", "dock"], default: "cheqd" },
        did: { $ref: "#/components/schemas/DID" },
        controller: { $ref: "#/components/schemas/DID" },
        keyType: { type: "string" },
        didcommServiceUrl: { type: "string", format: "uri" },
        includeDidcommService: { type: "boolean", default: true }
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
