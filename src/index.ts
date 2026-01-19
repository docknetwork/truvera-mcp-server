import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TruveraClient } from "./clients/index.js";
import { buildToolList, buildHandlerMapFromTruvera } from "./tools/composeTools.js";
import { BUILD_INFO } from "./build-info.js";
import http from "http";
import { randomUUID } from "crypto";

// Configuration from environment variables
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

// Create server instance
const server = new Server(
  {
    name: "truvera-mcp-service",
    version: BUILD_INFO.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error(`ListToolsRequest received [Build: ${BUILD_INFO.buildNumber}]`);
  return {
    tools,
  };
});

// Handler for tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
    // HTTP mode using HTTP streaming transport
    // Session transport map
    const transports: { [key: string]: StreamableHTTPServerTransport } = {};
    // Helper to check if request is an MCP initialize request
    function isInitializeRequest(body: unknown): boolean {
      return (
        !!body &&
        typeof body === "object" &&
        (body as any).method === "initialize"
      );
    }

    const httpServer = http.createServer(async (req, res) => {
      // Debug: Log all incoming requests
      console.error("[DEBUG] Incoming request:", {
        method: req.method,
        url: req.url,
        headers: req.headers
      });

      // Enable CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      // Health check endpoint
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          service: "truvera-mcp-service",
          version: BUILD_INFO.version,
          buildNumber: BUILD_INFO.buildNumber,
          buildTime: BUILD_INFO.timestamp,
          toolCount: tools.length,
          tools: tools.map((t) => ({ name: t.name, description: t.description ?? null })),
        }));
        return;
      }

      // MCP streaming endpoint
      if ((req.method === "POST" || req.method === "GET") && req.url === "/mcp") {
        let body: unknown;
        if (req.method === "POST") {
          body = await new Promise((resolve, reject) => {
            let data = "";
            req.on("data", (chunk) => {
              data += chunk;
            });
            req.on("end", () => {
              try {
                resolve(data ? JSON.parse(data) : undefined);
              } catch (e) {
                reject(e);
              }
            });
            req.on("error", reject);
          }).catch((err) => {
            console.error("Error parsing request body:", err);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON in request body" }));
            return;
          });
          if (!(body instanceof Error)) {
            console.error("[DEBUG] Parsed request body:", body);
          }
        }
        if (body instanceof Error) {
          console.error("Aborting request due to body parsing error." + body.message);
          return;
        }

        // Get session ID from header and normalize to string
        const sessionIdRaw = req.headers["mcp-session-id"];
        const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw;

        let transport: StreamableHTTPServerTransport | undefined;
        let initializedSessionId: string | undefined;
        if (sessionId && typeof sessionId === "string" && transports[sessionId]) {
          // Existing session: reuse transport
          transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(body)) {
          // New session: create transport
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: randomUUID,
            onsessioninitialized: (newSessionId: string) => {
              console.error(`[DEBUG] Session initialized with ID: ${newSessionId}`);
              transports[newSessionId] = transport!;
              initializedSessionId = newSessionId;
            }
          });
          // Assign onclose after instantiation
          transport.onclose = () => {
            const sid = transport!.sessionId;
            if (sid && transports[sid]) {
              console.error(`[DEBUG] Transport closed for session ${sid}, removing from map`);
              delete transports[sid];
            }
          };
          await server.connect(transport);
        } else {
          // Invalid request: no session or not initialize
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Bad Request: No valid session ID provided"
            },
            id: null
          }));
          return;
        }

        // If this is an initialize request, forcibly set the session ID header as 'Mcp-Session-Id'
        if (isInitializeRequest(body) && initializedSessionId) {
          res.setHeader('Mcp-Session-Id', initializedSessionId);
        }

        try {
          await transport.handleRequest(req, res, body);
        } catch (err) {
          console.error("Error handling MCP request:", err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        }
        return;
      }

      // 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found. Use POST /mcp for MCP communication." }));
    });

    httpServer.listen(MCP_PORT, "0.0.0.0", () => {
      console.error(`Truvera MCP service started (HTTP streaming mode on port ${MCP_PORT})`);
      console.error(`  - Build: ${BUILD_INFO.buildNumber} (${BUILD_INFO.timestamp})`);
      console.error(`  - MCP endpoint: POST http://localhost:${MCP_PORT}/mcp`);
      console.error(`  - Health check: GET http://localhost:${MCP_PORT}/health`);
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.error("Shutting down HTTP MCP server...");
      httpServer.close(() => process.exit(0));
    });

    process.on("SIGTERM", () => {
      console.error("Shutting down HTTP MCP server...");
      httpServer.close(() => process.exit(0));
    });
  } else {
    // Default: stdio mode for direct MCP communication
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Truvera MCP service started (stdio mode)`);
    console.error(`  - Build: ${BUILD_INFO.buildNumber} (${BUILD_INFO.timestamp})`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
