import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    ListProofTemplatesOptions: shared.schemas.PaginationOptions,
    CreateProofTemplateRequest: { type: "object" },
    GetProofTemplateRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    CreateProofRequest: { type: "object", required: ["templateId", "body"], properties: { templateId: { type: "string" }, body: { type: "object" } } }
  }
};
