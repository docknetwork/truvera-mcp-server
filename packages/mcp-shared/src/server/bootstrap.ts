import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startHTTPTransport } from "../transport/http/index.js";
import { startStdioTransport } from "../transport/stdio/index.js";
import { createListToolsHandler, createCallToolHandler } from "./handlers.js";
import type { ServerConfig, TransportConfig } from "./types.js";

/**
 * Bootstrap an MCP server with the given configuration
 * 
 * This function:
 * 1. Creates an MCP server instance (or factory for HTTP mode)
 * 2. Registers all tools with their handlers
 * 3. Sets up ListTools and CallTool request handlers
 * 4. Starts the appropriate transport (stdio or http)
 * 
 * @param serverConfig - Server configuration including name, version, tools, and handlers
 * @param transportConfig - Transport configuration (stdio or http)
 */
export async function bootstrapMCPServer(
  serverConfig: ServerConfig,
  transportConfig: TransportConfig
): Promise<void> {
  const { name, version, buildInfo, tools, toolHandlers } = serverConfig;

  // Factory function to create a configured MCP server
  const createServer = () => {
    const server = new McpServer({
      name,
      version,
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
            inputSchema: (tool.inputSchema ?? { type: "object", properties: {}, required: [] }) as any,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          handler as any
        );
      } else {
        console.error(`No handler found for tool: ${tool.name}`);
      }
    }

    // Set up request handlers
    server.server.setRequestHandler(
      ListToolsRequestSchema,
      createListToolsHandler(tools, buildInfo.buildNumber.toString())
    );

    server.server.setRequestHandler(
      CallToolRequestSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createCallToolHandler(toolHandlers) as any
    );

    return server;
  };

  // Start the appropriate transport
  if (transportConfig.mode === "http") {
    const port = transportConfig.port ?? 3000;
    startHTTPTransport({
      serverFactory: createServer,
      MCP_PORT: port,
      BUILD_INFO: buildInfo,
      tools,
    });
  } else {
    const server = createServer();
    await startStdioTransport({
      server,
      BUILD_INFO: buildInfo,
      tools,
    });
  }
}
