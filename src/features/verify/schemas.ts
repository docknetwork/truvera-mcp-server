import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    VerifyRequest: {
      type: "object",
      required: ["data"],
      properties: { data: { oneOf: [{ type: "object" }, { type: "string" }] } }
    }
  }
};
