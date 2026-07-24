import Ajv, { type ValidateFunction } from "ajv";
import type { ToolDef } from "../tools/types.js";

const ajv = new Ajv({ allErrors: true, strict: false });

function formatValidationErrors(errors: ValidateFunction["errors"]): string {
  return (errors ?? [])
    .map(({ instancePath, message, params }) => {
      const path = instancePath || "/";
      const missingProperty = (params as { missingProperty?: string })?.missingProperty;
      const property = missingProperty ? `${path === "/" ? "" : path}/${missingProperty}` : path;
      return `${property} ${message}`;
    })
    .join("; ");
}

// Compiles each tool's inputSchema once (per server/session instance) rather
// than on every call. A tool with no inputSchema, or one that fails to
// compile (malformed schema), is left unvalidated -- permissive, matching
// the prior behavior of every tool before this validation existed.
function compileValidators(tools: ToolDef[]): Map<string, ValidateFunction> {
  const validators = new Map<string, ValidateFunction>();
  for (const tool of tools) {
    if (!tool.inputSchema) continue;
    try {
      validators.set(tool.name, ajv.compile(tool.inputSchema));
    } catch (err) {
      console.error(`Failed to compile inputSchema for tool "${tool.name}", skipping validation:`, err);
    }
  }
  return validators;
}

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
 *
 * `tools` (optional) supplies each tool's inputSchema for validation via ajv
 * before the handler runs -- a request whose arguments don't match are
 * rejected with a descriptive error instead of reaching the handler.
 * Omitting `tools` (or a tool with no inputSchema) skips validation
 * entirely, matching this handler's behavior before validation existed.
 */
export function createCallToolHandler(
  toolHandlers: Map<string, (args: unknown) => Promise<unknown>>,
  tools: ToolDef[] = []
) {
  const validators = compileValidators(tools);

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

      const validate = validators.get(name);
      if (validate && !validate(args ?? {})) {
        const message = `Invalid arguments for tool "${name}": ${formatValidationErrors(validate.errors)}`;
        console.error(message);
        return {
          content: [
            {
              type: "text",
              text: message,
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
