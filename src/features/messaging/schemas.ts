import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    SendMessageRequest: {
      type: "object",
      required: ["to", "body"],
      properties: {
        to: { type: "string", description: "Recipient DID or address" },
        from: { type: "string", description: "Sender DID or address" },
        type: { type: "string" },
        body: { oneOf: [{ type: "string" }, { type: "object" }] },
        metadata: { type: "object" }
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
