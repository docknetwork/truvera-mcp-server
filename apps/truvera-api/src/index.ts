import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startHTTPTransport } from "./transport/http/index.js";
import { startStdioTransport } from "./transport/stdio/index.js";
import { TruveraClient } from "./clients/index.js";
import { buildToolList, buildHandlerMapFromTruvera } from "./tools/composeTools.js";
import { BUILD_INFO } from "./build-info.js";

// Configuration from environment variables
dotenv.config();
const API_KEY = process.env.TRUVERA_API_KEY;
const API_ENDPOINT = process.env.TRUVERA_API_ENDPOINT || "https://api.truvera.com";
const MCP_PORT = parseInt(process.env.MCP_PORT || "3000", 10);
const MCP_MODE = process.env.MCP_MODE || "stdio"; // "stdio" or "http"

// Validate required environment variables
if (!API_KEY) {
  throw new Error("TRUVERA_API_KEY environment variable is required");
}

// Initialize Truvera API client
const truveraClient = new TruveraClient(API_KEY, API_ENDPOINT);

// Build tools and handlers
const tools = buildToolList();
const toolHandlers = buildHandlerMapFromTruvera(truveraClient);

// Create MCP server instance
const server = new McpServer({
  name: "truvera-mcp-service",
  version: BUILD_INFO.version,
});

// Register all tools with the MCP server
for (const tool of tools) {
  const handler = toolHandlers.get(tool.name);
  if (handler) {
    server.registerTool(
      tool.name,
      {
        title: tool.title ?? tool.name,
        description: tool.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: (tool.inputSchema ?? {}) as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler as any
    );
  } else {
    console.error(`No handler found for tool: ${tool.name}`);
  }
}

// Handler for listing available tools
function serializeSchema(schema: unknown) {
  if (!schema) return {};
  // Assume canonical JSON Schema objects are provided by feature modules
  if (typeof schema === "object") return schema;
  return {};
}

server.server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error(`ListToolsRequest received [Build: ${BUILD_INFO.buildNumber}]`);
  const serialized = tools.map((t) => ({
    name: t.name,
    title: t.title ?? t.name,
    description: t.description ?? null,
    inputSchema: serializeSchema(t.inputSchema),
  }));
  // Emit the serialized tools payload for debugging (inspector clients will request ListTools)
  try {
    console.error("ListTools payload:", JSON.stringify({ tools: serialized }, null, 2));
  } catch (err) {
    console.error("Failed to stringify ListTools payload", err);
  }

  return { tools: serialized };
});

// Handler for tool calls
server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
});

// Start server

async function main() {
  if (MCP_MODE === "http") {
    startHTTPTransport({ server, MCP_PORT, BUILD_INFO, tools });
  } else {
    await startStdioTransport({ server, BUILD_INFO, tools });
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
