import { components as shared } from "../shared/schemas.js";


export const components = {
  schemas: {
    ...shared.schemas,
    CreateProfileRequest: { type: "object", required: ["did", "name"], properties: { did: shared.schemas.DID, name: { type: "string" }, logo: { type: "string" } } },
    ListProfilesOptions: shared.schemas.PaginationOptions,
    GetProfileRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    UpdateProfileRequest: { type: "object", required: ["did", "body"], properties: { did: shared.schemas.DID, body: { $ref: "#/components/schemas/Profile" } } },
    DeleteProfileRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
  }
};

