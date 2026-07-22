import dotenv from "dotenv";
import "dotenv/config";
import { bootstrapMCPServer } from "@truvera/mcp-shared/server";
import type { AuthConfig, AuthContext } from "@truvera/mcp-shared/auth";
import type { ToolHandler } from "@truvera/mcp-shared/tools";
import { TruveraClient } from "./clients/index.js";
import { buildToolList, buildHandlerMapFromTruvera } from "./tools/composeTools.js";
import { BUILD_INFO } from "./build-info.js";
import { AP2Client, getAP2ToolDefs, getAP2Handlers, initializeAP2Schemas } from "./features/ap2/index.js";
import { OpenIdClient } from "./features/openid/index.js";

dotenv.config();

const API_ENDPOINT = process.env.TRUVERA_API_ENDPOINT || "https://api.truvera.com";
const MCP_PORT = parseInt(process.env.MCP_PORT || "3000", 10);
const MCP_MODE = process.env.MCP_MODE || "stdio";
const AP2_ENABLED = process.env.AP2_ENABLED !== "false";

// Tool definitions are stateless — built once and shared across all sessions.
// AgentCardClient holds a reference to this array so AP2 tools pushed below are visible to it.
const tools = buildToolList();

// Set to true once AP2 schemas are successfully initialised at startup.
let ap2Initialized = false;

function buildHandlers(truvera: TruveraClient): Map<string, ToolHandler> {
  const handlers = buildHandlerMapFromTruvera(truvera, tools);
  if (ap2Initialized) {
    const openIdClient = new OpenIdClient(truvera);
    const ap2Client = new AP2Client(truvera, openIdClient);
    for (const [name, handler] of getAP2Handlers(ap2Client)) {
      handlers.set(name, handler);
    }
  }
  return handlers;
}

async function main() {
  if (AP2_ENABLED) {
    try {
      console.error("[AP2] Initializing AP2 support...");
      const schemas = await initializeAP2Schemas();

      const availableSchemas = [schemas.cartMandateSchema, schemas.intentMandateSchema, schemas.paymentMandateSchema]
        .filter((s) => s !== null).length;

      if (availableSchemas === 0) {
        console.error("[AP2] Note: No schemas could be fetched (this is expected - AP2 JSON-LD schemas not yet published)");
        console.error("[AP2] AP2 tools will function using schema URLs as references for Truvera API");
      }

      const ap2Tools = getAP2ToolDefs();
      tools.push(...ap2Tools);
      ap2Initialized = true;
      console.error(`[AP2] Successfully initialized ${ap2Tools.length} AP2 tools`);
    } catch (error) {
      console.error("[AP2] Failed to initialize AP2 support:", error);
      console.error("[AP2] Continuing without AP2 support. Set AP2_ENABLED=false to disable this warning.");
    }
  } else {
    console.error("[AP2] AP2 support is disabled (AP2_ENABLED=false)");
  }

  if (MCP_MODE === "http") {
    // HTTP mode: the bearer token IS the caller's Truvera API key.
    // If a client omits the Authorization header, fall back to TRUVERA_API_KEY
    // from the environment — useful for a single-account/shared-team deployment
    // that doesn't want every client to supply its own key.
    const authConfig: AuthConfig = { mode: "passthrough", fallbackApiKey: process.env.TRUVERA_API_KEY };

    async function toolHandlerFactory(context: AuthContext): Promise<Map<string, ToolHandler>> {
      if (context.mode !== "passthrough") {
        throw new Error(`Unexpected auth context mode in HTTP mode: ${context.mode}`);
      }
      return buildHandlers(new TruveraClient(context.apiKey, API_ENDPOINT));
    }

    await bootstrapMCPServer(
      { name: "truvera-mcp-service", version: BUILD_INFO.version, buildInfo: BUILD_INFO, tools, toolHandlerFactory },
      { mode: "http", port: MCP_PORT, authConfig },
    );
  } else {
    // stdio mode: use TRUVERA_API_KEY from environment (local dev / CLI usage)
    const API_KEY = process.env.TRUVERA_API_KEY;
    if (!API_KEY) {
      throw new Error("TRUVERA_API_KEY environment variable is required in stdio mode");
    }

    await bootstrapMCPServer(
      {
        name: "truvera-mcp-service",
        version: BUILD_INFO.version,
        buildInfo: BUILD_INFO,
        tools,
        toolHandlers: buildHandlers(new TruveraClient(API_KEY, API_ENDPOINT)),
      },
      { mode: "stdio", port: MCP_PORT },
    );
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
