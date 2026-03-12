<<<<<<< HEAD
import dotenv from "dotenv";
=======
import "dotenv/config";
>>>>>>> 4af4311 (Initial placeholder server for the wallet)
import { bootstrapMCPServer } from "@truvera/mcp-shared/server";
import { TruveraClient } from "./clients/index.js";
import { buildToolList, buildHandlerMapFromTruvera } from "./tools/composeTools.js";
import { BUILD_INFO } from "./build-info.js";
import { AP2Client, getAP2ToolDefs, getAP2Handlers, initializeAP2Schemas } from "./features/ap2/index.js";
import { OpenIdClient } from "./features/openid/index.js";

// Configuration from environment variables
dotenv.config();
const API_KEY = process.env.TRUVERA_API_KEY;
const API_ENDPOINT = process.env.TRUVERA_API_ENDPOINT || "https://api.truvera.com";
const MCP_PORT = parseInt(process.env.MCP_PORT || "3000", 10);
const MCP_MODE = process.env.MCP_MODE || "stdio"; // "stdio" or "http"
const AP2_ENABLED = process.env.AP2_ENABLED !== "false"; // Default to enabled

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
  // Initialize AP2 schemas if enabled
  if (AP2_ENABLED) {
    try {
      console.error("[AP2] Initializing AP2 support...");
      const schemas = await initializeAP2Schemas();
      
      // AP2 is functional even without published schemas
      // Schema URLs are passed to Truvera API for future compatibility
      const availableSchemas = [schemas.cartMandateSchema, schemas.intentMandateSchema, schemas.paymentMandateSchema]
        .filter(s => s !== null).length;
      
      if (availableSchemas === 0) {
        console.error("[AP2] Note: No schemas could be fetched (this is expected - AP2 JSON-LD schemas not yet published)");
        console.error("[AP2] AP2 tools will function using schema URLs as references for Truvera API");
      }
      
      // Create AP2 client with both Truvera and OpenID clients for dual-flow support
      const openIdClient = new OpenIdClient(truveraClient);
      const ap2Client = new AP2Client(truveraClient, openIdClient);
      const ap2Tools = getAP2ToolDefs();
      const ap2Handlers = getAP2Handlers(ap2Client);
      
      // Add AP2 tools to the server
      tools.push(...ap2Tools);
      for (const [name, handler] of ap2Handlers) {
        toolHandlers.set(name, handler);
      }
      
      console.error(`[AP2] Successfully initialized ${ap2Tools.length} AP2 tools`);
    } catch (error) {
      console.error("[AP2] Failed to initialize AP2 support:", error);
      console.error("[AP2] Continuing without AP2 support. Set AP2_ENABLED=false to disable this warning.");
    }
  } else {
    console.error("[AP2] AP2 support is disabled (AP2_ENABLED=false)");
  }
  
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
