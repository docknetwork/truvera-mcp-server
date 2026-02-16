import type { ToolDef } from "../tools/types.js";

/**
 * Serialize a schema for MCP protocol
 */
export function serializeSchema(schema: unknown): Record<string, unknown> {
  if (!schema) return {};
  // Assume canonical JSON Schema objects are provided by feature modules
  if (typeof schema === "object") return schema as Record<string, unknown>;
  return {};
}

/**
 * Create ListTools handler
 */
export function createListToolsHandler(tools: ToolDef[], buildNumber?: string) {
  return async () => {
    if (buildNumber) {
      console.error(`ListToolsRequest received [Build: ${buildNumber}]`);
    } else {
      console.error(`ListToolsRequest received`);
    }
    
    const serialized = tools.map((t) => ({
      name: t.name,
      title: t.title ?? t.name,
      description: t.description ?? null,
      inputSchema: serializeSchema(t.inputSchema),
    }));
    
    // Emit the serialized tools payload for debugging
    try {
      console.error("ListTools payload:", JSON.stringify({ tools: serialized }, null, 2));
    } catch (err) {
      console.error("Failed to stringify ListTools payload", err);
    }

    return { tools: serialized };
  };
}

/**
 * Create CallTool handler
 */
export function createCallToolHandler(toolHandlers: Map<string, (args: unknown) => Promise<unknown>>) {
  return async (request: { params: { name: string; arguments?: unknown } }) => {
    const { params } = request;
    const { name, arguments: args } = params;
    
    console.error(`CallToolRequest received: params=${JSON.stringify(params)}`);
    console.error(`CallToolRequest details: name=${name} args=${JSON.stringify(args)}`);

    try {
      const handler = toolHandlers.get(name);
      if (!handler) {
        console.error(`Unknown tool requested: ${name}`);
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
      }

      return await handler(args);
    } catch (err) {
      console.error('Error handling CallToolRequest:', err);
      return {
        content: [
          {
            type: 'text',
            text: `Internal server error: ${String(err)}`,
          },
        ],
        isError: true,
      };
    }
  };
}
