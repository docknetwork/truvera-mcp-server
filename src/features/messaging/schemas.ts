import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    SendMessageRequest: {
      type: "object",
      required: ["to", "message"],
      properties: {
        to: { type: "string", description: "Recipient DID or address" },
        from: { type: "string", description: "Sender DID or address" },
        type: { type: "string" },
        message: { oneOf: [{ type: "string" }, { $ref: "#/components/schemas/DIDCommMessage" }, { type: "object" }] },
        metadata: { type: "object", additionalProperties: true }
      }
    },
    GetMessageRequest: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } }
    },
    ListMessagesOptions: shared.schemas.PaginationOptions,
    DeleteMessageRequest: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } }
    }
  }
};
