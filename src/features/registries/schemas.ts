import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    ListRegistriesOptions: shared.schemas.PaginationOptions,
    CreateRegistryRequest: { type: "object" },
    GetRegistryRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    DeleteRegistryRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
  }
};
