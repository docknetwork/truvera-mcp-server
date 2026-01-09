import type { SchemasClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "create_schema", description: "Create schema. POST /schemas. For schema structure details including properties and required fields, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.VerifiableCredentialSchema },
  { name: "list_schemas", description: "List schemas. GET /schemas. Supports offset and limit pagination. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ListSchemasOptions },
  { name: "get_schema", description: "Get schema by ID. GET /schemas/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.GetSchemaRequest },
  { name: "delete_schema", description: "Delete schema by ID. DELETE /schemas/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.DeleteSchemaRequest },
];

export function getHandlers(schemas: SchemasClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_schema", async (args) => formatResult(await schemas.createSchema(args)));
  handlers.set("list_schemas", async (args) => formatResult(await schemas.listSchemas(args || {})));
  handlers.set("get_schema", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await schemas.getSchema(id));
  });
  handlers.set("delete_schema", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await schemas.deleteSchema(id));
  });

  return handlers;
}
