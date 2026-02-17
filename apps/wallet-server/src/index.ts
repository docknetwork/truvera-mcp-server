import "dotenv/config";
import { bootstrapMCPServer } from "@truvera/mcp-shared/server";
import { BUILD_INFO } from "./build-info.js";
import { toolDefs, getHandlers } from "./tools/placeholder.js";

// Configuration from environment variables
const MCP_PORT = parseInt(process.env.MCP_PORT || "3001", 10);
const MCP_MODE = process.env.MCP_MODE || "stdio"; // "stdio" or "http"

// Validate required environment variables
const WALLET_MASTER_KEY = process.env.WALLET_MASTER_KEY;
if (!WALLET_MASTER_KEY) {
  console.error("Warning: WALLET_MASTER_KEY not set. Wallet operations will fail.");
  console.error("Set WALLET_MASTER_KEY environment variable to continue.");
}

// Build tools and handlers
const tools = toolDefs;
const toolHandlers = getHandlers();

// Start server using bootstrap
async function main() {
  console.error("Starting Wallet MCP Server...");
  console.error(`  - Mode: ${MCP_MODE}`);
  console.error(`  - Tools available: ${tools.length}`);
  
  await bootstrapMCPServer(
    {
      name: "wallet-mcp-service",
      version: BUILD_INFO.version,
      buildInfo: BUILD_INFO,
      tools,
      toolHandlers,
    },
    {
      mode: MCP_MODE as "stdio" | "http",
      port: MCP_PORT,
    }
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
