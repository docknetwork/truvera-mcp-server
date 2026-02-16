import dotenv from "dotenv";
import { bootstrapMCPServer } from "@truvera/mcp-shared/server";
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

// Start server using bootstrap
async function main() {
  await bootstrapMCPServer(
    {
      name: "truvera-mcp-service",
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
