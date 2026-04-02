import { components as shared } from "../shared/schemas.js";


export const components = {
  schemas: {
    ...shared.schemas,
    ListProofTemplatesOptions: shared.schemas.PaginationOptions,
    ProofTemplatePayload: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        cedarVerificationPolicy: { type: "string" },
        request: { type: "object", additionalProperties: true },
        expirationTime: { $ref: "#/components/schemas/IntervalObject" },
        did: { $ref: "#/components/schemas/DID" }
      }
    },
    ProofRequestPayload: {
      type: "object",
      properties: {
        attributes: { type: "object", additionalProperties: { $ref: "#/components/schemas/IndyProofReqAttrSpec" } },
        name: { type: "string" },
        cedarVerificationPolicy: { type: "string" },
        template: { type: "string", format: "uuid" },
        nonce: { type: "string" },
        did: { $ref: "#/components/schemas/DID" },
        request: { type: "object", additionalProperties: true }
      }
    },
    CreateProofTemplateRequest: { $ref: '#/components/schemas/ProofTemplatePayload' },
    GetProofTemplateRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    CreateProofRequest: { $ref: '#/components/schemas/ProofRequestPayload' },
    GetProofRequestResultRequest: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", format: "uuid" }
      }
    },
    // Input arguments for POST /proof-templates/{templateId}/request
    CreateProofRequestArgs: {
      type: "object",
      // Either supply `templateId` (path param) or include `template` inside the `body`.
      // The `body` property is required; `templateId` is optional but preferred.
      required: ["body"],
      properties: {
        templateId: { type: "string", format: "uuid" },
        body: { $ref: '#/components/schemas/ProofRequestPayload' }
      }
    }
  }
};

