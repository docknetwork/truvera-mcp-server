import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startHTTPTransport } from "../transport/http/index.js";
import { startStdioTransport } from "../transport/stdio/index.js";
import { createListToolsHandler, createCallToolHandler } from "./handlers.js";
import type { ServerConfig, TransportConfig, AuthContext } from "./types.js";

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
  const { name, version, buildInfo, tools, toolHandlers, toolHandlerFactory } = serverConfig;

  if (!toolHandlers && !toolHandlerFactory) {
    throw new Error("ServerConfig requires either toolHandlers or toolHandlerFactory");
  }

  // Factory function to create a configured MCP server for a given auth context.
  // In HTTP mode this is called once per session; in stdio mode it is called once at startup.
  const createServer = async (context: AuthContext) => {
    const handlers = toolHandlerFactory
      ? await toolHandlerFactory(context)
      : toolHandlers!;

    const server = new McpServer({ name, version });

    // Validate that every declared tool has a handler.
    // Tool discovery/execution is handled by our explicit request handlers below,
    // which allows feature modules to continue supplying JSON Schema inputSchema.
    for (const tool of tools) {
      if (!handlers.get(tool.name)) {
        console.error(`No handler found for tool: ${tool.name}`);
      }
    }

    // MCP SDK now requires declaring the tools capability before registering
    // tools/list or tools/call handlers on the low-level server.
    server.server.registerCapabilities({
      tools: {
        listChanged: true,
      },
    });

    // Set up request handlers
    server.server.setRequestHandler(
      ListToolsRequestSchema,
      createListToolsHandler(tools, buildInfo.buildNumber.toString())
    );

    server.server.setRequestHandler(
      CallToolRequestSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createCallToolHandler(handlers) as any
    );

    return server;
  };

  // Start the appropriate transport
  if (transportConfig.mode === "http") {
    const port = transportConfig.port ?? 3000;
    await startHTTPTransport({
      serverFactory: createServer,
      MCP_PORT: port,
      BUILD_INFO: buildInfo,
      tools,
      serviceName: name,
      authConfig: transportConfig.authConfig,
    });
  } else {
    // stdio is always single-tenant; resolve with no-auth context
    const server = await createServer({ mode: "none" });
    await startStdioTransport({
      server,
      BUILD_INFO: buildInfo,
      tools,
    });
  }
}
