import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    CreateProfileRequest: { type: "object" },
    ListProfilesOptions: shared.schemas.PaginationOptions,
    GetProfileRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    UpdateProfileRequest: { type: "object", required: ["did", "body"], properties: { did: shared.schemas.DID, body: { type: "object" } } },
    DeleteProfileRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
  }
};
