import type { SchemasClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";
import type { CreateSchemaRequest } from "./types.js";

export const toolDefs: ToolDef[] = [
  { name: "list_schemas", description: "List schemas. GET /schemas. Supports offset and limit pagination. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ListSchemasOptions },
  { name: "get_schema", description: "Get schema by ID. GET /schemas/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.GetSchemaRequest },
];

export function getHandlers(schemas: SchemasClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_schema", async (args) => formatResult(await schemas.createSchema(args as CreateSchemaRequest)));
  handlers.set("list_schemas", async (args) => formatResult(await schemas.listSchemas(args || {})));
  handlers.set("get_schema", async (args) => {
    const { id } = args as { id?: string };
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await schemas.getSchema(id));
  });
  handlers.set("delete_schema", async (args) => {
    const { id } = args as { id?: string };
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await schemas.deleteSchema(id));
  });

  return handlers;
}
