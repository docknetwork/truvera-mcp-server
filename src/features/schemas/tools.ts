import type { SchemasClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "create_schema", description: "Create schema", inputSchema: components.schemas.VerifiableCredentialSchema },
  { name: "list_schemas", description: "List schemas", inputSchema: components.schemas.ListSchemasOptions },
  { name: "get_schema", description: "Get schema", inputSchema: components.schemas.GetSchemaRequest },
  { name: "delete_schema", description: "Delete schema", inputSchema: components.schemas.DeleteSchemaRequest },
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
