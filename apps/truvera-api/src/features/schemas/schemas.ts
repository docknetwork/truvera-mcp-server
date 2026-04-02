import { components as shared } from "../shared/schemas.js";


export const components = {
  schemas: {
    ...shared.schemas,
    VerifiableCredentialSchema: {
      type: "object",
      properties: {
          $schema: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          type: { type: "string" },
          properties: { type: "object", additionalProperties: true },
          required: { type: "array", items: { type: "string" } },
          additionalProperties: { type: "boolean" }
        }
    },
    Profile: {
      type: "object",
      required: ["did", "name"],
      properties: {
        did: { $ref: "#/components/schemas/DID" },
        name: { type: "string" },
        logo: { type: "string" }
      }
    },
    ListSchemasOptions: shared.schemas.PaginationOptions,
    GetSchemaRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    DeleteSchemaRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
  }
};


