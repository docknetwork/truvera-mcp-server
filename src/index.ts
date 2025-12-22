import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { TruveraClient } from "./clients/truvera.js";
import http from "http";

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

// Create server instance
const server = new Server(
  {
    name: "truvera-mcp-service",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('ListToolsRequest received');
  return {
    tools: [
      {
        name: "call_truvera_api",
        description: "Call the Truvera REST API with specified endpoint and parameters",
        inputSchema: {
          type: "object",
          properties: {
            endpoint: {
              type: "string",
              description: "API endpoint path (e.g., /v1/data)",
            },
            method: {
              type: "string",
              enum: ["GET", "POST", "PUT", "DELETE"],
              description: "HTTP method",
            },
            payload: {
              type: "object",
              description: "Request payload for POST/PUT requests",
            },
          },
          required: ["endpoint", "method"],
        },
      },
      {
        name: "create_did",
        description: "Create a Decentralized Identifier (DID) in Truvera",
        inputSchema: {
          type: "object",
          properties: {
            method: {
              type: "string",
              description: "DID method (e.g., key, web)",
            },
            document: {
              type: "object",
              description: "Initial DID document payload",
            },
            metadata: {
              type: "object",
              description: "Optional metadata for the DID",
            },
          },
          required: ["method"],
        },
      },
    ],
  };
});

// Handler for tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { params } = request;
  const { name, arguments: args } = params;
  console.error(`CallToolRequest received: params=${JSON.stringify(params)}`);
  console.error(`CallToolRequest details: name=${name} args=${JSON.stringify(args)}`);

  try {
    if (name === "call_truvera_api") {
      const { endpoint, method, payload } = args as {
        endpoint: string;
        method: "GET" | "POST" | "PUT" | "DELETE";
        payload?: object;
      };

      console.error(`Invoking call_truvera_api -> ${method} ${endpoint}`);

      const result = await truveraClient.request({
        method,
        endpoint,
        body: payload,
      });

      console.error(`call_truvera_api result: success=${result.success}` + (result.error ? ` error=${result.error}` : ""));

      if (!result.success) {
        return {
          content: [
            {
              type: "text",
              text: result.error || "Unknown error",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }

    if (name === "create_did") {
      const { method: didMethod, document, metadata } = args as any;

      console.error(`Invoking create_did -> method=${didMethod}`);

      // Validate required fields
      if (!didMethod) {
        console.error("create_did missing method");
        return {
          content: [
            {
              type: "text",
              text: "Error: 'method' is required for DID creation (e.g., 'cheqd', 'dock', 'key')",
            },
          ],
          isError: true,
        };
      }

      // Validate method is one of the supported types
      const validMethods = ["cheqd", "dock", "key"];
      if (!validMethods.includes(didMethod)) {
        console.error(`create_did invalid method: ${didMethod}`);
        return {
          content: [
            {
              type: "text",
              text: `Error: 'method' must be one of ${validMethods.join(", ")}, got '${didMethod}'`,
            },
          ],
          isError: true,
        };
      }

      const result = await truveraClient.createDid({
        method: didMethod,
        // Pass through optional fields if provided
        ...(document && { document }),
        ...(metadata && { metadata }),
      });

      console.error(`create_did result: success=${result.success}` + (result.error ? ` error=${result.error}` : ""));

      if (!result.success) {
        return {
          content: [
            {
              type: "text",
              text: result.error || "Failed to create DID",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
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
});

// Start server
async function main() {
  if (MCP_MODE === "http") {
    // HTTP mode using SSE transport
    // Map of active SSE transports keyed by sessionId
    const transports: Map<string, SSEServerTransport> = new Map();

    const httpServer = http.createServer(async (req, res) => {
      // Enable CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      // Health check endpoint
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "truvera-mcp-service" }));
        return;
      }

      // SSE endpoint for MCP communication
          if (req.method === "GET" && req.url === "/sse") {
            const transport = new SSEServerTransport("/messages", res);
            // Connect registers and starts the transport; do not call start() again.
            await server.connect(transport);
            // Track transport by sessionId so POSTs can be routed to it.
            transports.set(transport.sessionId, transport);
            // Remove from map when transport closes
            transport.onclose = () => transports.delete(transport.sessionId);
            return;
          }

      // POST endpoint for client messages
      if (req.method === "POST" && req.url && req.url.startsWith("/messages")) {
        // Route POSTs to the correct SSE transport based on sessionId query param
        try {
          const url = new URL(req.url, `http://localhost:${MCP_PORT}`);
          const sessionId = url.searchParams.get("sessionId");
          if (!sessionId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "sessionId query parameter is required" }));
            return;
          }

          const transport = transports.get(sessionId);
          if (!transport) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "SSE session not found" }));
            return;
          }

          await transport.handlePostMessage(req, res);
        } catch (err) {
          console.error("Error routing POST /messages:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
        return;
      }

      // 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    httpServer.listen(MCP_PORT, "0.0.0.0", () => {
      console.error(`Truvera MCP service started (HTTP mode on port ${MCP_PORT})`);
      console.error(`  - SSE endpoint: http://localhost:${MCP_PORT}/sse`);
      console.error(`  - Message endpoint: http://localhost:${MCP_PORT}/messages`);
      console.error(`  - Health check: http://localhost:${MCP_PORT}/health`);
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
    console.error("Truvera MCP service started (stdio mode)");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
