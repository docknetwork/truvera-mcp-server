import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BuildInfo } from "../../types/build-info.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ToolDef } from "../../tools/types.js";

export interface StdioTransportArgs {
  server: McpServer;
  BUILD_INFO: BuildInfo;
  tools: ToolDef[];
  serviceName?: string;
}

export async function startStdioTransport({
  server,
  BUILD_INFO,
  tools,
  serviceName = "MCP service",
}: StdioTransportArgs) {

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${serviceName} started (stdio mode)`);
  console.error(`  - Build: ${BUILD_INFO.buildNumber} (${BUILD_INFO.timestamp})`);
  console.error(`  - Tools available: ${tools.length}`);
}
