import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BuildInfo } from "@truvera/mcp-shared/types";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ToolDef } from "@truvera/mcp-shared/tools";

export interface StdioTransportArgs {
  server: McpServer;
  BUILD_INFO: BuildInfo;
  tools: ToolDef[];
}

export async function startStdioTransport({
  server,
  BUILD_INFO,
  tools,
}: StdioTransportArgs) {

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Truvera MCP service started (stdio mode)`);
  console.error(`  - Build: ${BUILD_INFO.buildNumber} (${BUILD_INFO.timestamp})`);
  console.error(`  - Tools available: ${tools.length}`);
}
