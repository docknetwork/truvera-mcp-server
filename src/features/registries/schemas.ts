import { components as shared } from "../shared/schemas.js";

export const components = {
  schemas: {
    ...shared.schemas,
    ListRegistriesOptions: shared.schemas.PaginationOptions,
    CreateRegistryRequest: { type: "object", required: ["convener","name","description","logoUrl","ecosystemUrl","governanceFramework","governanceFrameworkVersion"], properties: { convener: shared.schemas.DID, name: { type: "string" }, description: { type: "string" }, logoUrl: { type: "string", format: "uri" }, ecosystemUrl: { type: "string", format: "uri" }, governanceFramework: { type: "string" }, governanceFrameworkVersion: { type: "string" } } },
    GetRegistryRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    DeleteRegistryRequest: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
  }
};
