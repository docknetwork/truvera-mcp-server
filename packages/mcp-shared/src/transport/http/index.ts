import http, { type IncomingMessage, type ServerResponse } from "node:http";
import net from "node:net";
import readline from "node:readline/promises";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDef } from "../../tools/types.js";
import type { BuildInfo } from "../../types/build-info.js";

export interface HTTPTransportArgs {
  serverFactory: () => McpServer;
  MCP_PORT: number;
  BUILD_INFO: BuildInfo;
  tools: ToolDef[];
  serviceName?: string;
}

interface ResolvePortConflictOptions {
  isInteractive?: boolean;
  findNextAvailablePort?: (startPort: number) => Promise<number>;
  promptUser?: (message: string) => Promise<string>;
}

function isPortInUseError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EADDRINUSE";
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const probeServer = net.createServer();

    probeServer.once("error", (error: Error) => {
      if (isPortInUseError(error)) {
        resolve(false);
        return;
      }

      reject(error);
    });

    probeServer.once("listening", () => {
      probeServer.close((closeError?: Error) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(true);
      });
    });

    probeServer.listen(port, "0.0.0.0");
  });
}

export async function findNextAvailablePort(startPort: number): Promise<number> {
  for (let candidatePort = startPort; candidatePort <= 65535; candidatePort += 1) {
    if (await isPortAvailable(candidatePort)) {
      return candidatePort;
    }
  }

  throw new Error(`No available port found starting at ${startPort}.`);
}

async function promptUserForAlternatePort(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  try {
    return await rl.question(message);
  } finally {
    rl.close();
  }
}

export async function resolvePortConflict(
  requestedPort: number,
  serviceName: string,
  options: ResolvePortConflictOptions = {}
): Promise<number> {
  const isInteractive = options.isInteractive ?? Boolean(process.stdin.isTTY && process.stderr.isTTY);
  const nextAvailablePort = await (options.findNextAvailablePort ?? findNextAvailablePort)(requestedPort + 1);

  if (!isInteractive) {
    throw new Error(
      `Port ${requestedPort} is already in use. ${serviceName} can run on ${nextAvailablePort}, but no interactive terminal is available to confirm it.`
    );
  }

  const answer = await (options.promptUser ?? promptUserForAlternatePort)(
    `Port ${requestedPort} is already in use. Start ${serviceName} on port ${nextAvailablePort} instead? [Y/n] `
  );
  const normalizedAnswer = answer.trim().toLowerCase();

  if (normalizedAnswer === "" || normalizedAnswer === "y" || normalizedAnswer === "yes") {
    return nextAvailablePort;
  }

  throw new Error(`Startup cancelled because port ${requestedPort} is already in use.`);
}

async function listenOnPort(httpServer: http.Server, requestedPort: number, serviceName: string): Promise<number> {
  let port = requestedPort;

  while (true) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };

        const onListening = () => {
          cleanup();
          resolve();
        };

        const cleanup = () => {
          httpServer.off("error", onError);
          httpServer.off("listening", onListening);
        };

        httpServer.once("error", onError);
        httpServer.once("listening", onListening);
        httpServer.listen(port, "0.0.0.0");
      });

      return port;
    } catch (error) {
      if (!isPortInUseError(error)) {
        throw error;
      }

      port = await resolvePortConflict(port, serviceName);
      console.error(`[HTTP] Retrying ${serviceName} on port ${port}`);
    }
  }
}

export async function startHTTPTransport({
  serverFactory,
  MCP_PORT,
  BUILD_INFO,
  tools,
  serviceName = "MCP service",
}: HTTPTransportArgs) {
  const transports: { [key: string]: { transport: StreamableHTTPServerTransport; server: McpServer } } = {};

  function isInitializeRequest(body: unknown): boolean {
    return !!body && typeof body === "object" && "method" in body && (body as Record<string, unknown>).method === "initialize";
  }

  const httpServer = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
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
        service: serviceName,
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
          req.on("data", (chunk: Buffer) => {
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
      const initializeRequest = isInitializeRequest(body);

      console.error("[DEBUG] MCP session resolution:", {
        method: req.method,
        hasSessionHeader: typeof sessionId === "string" && sessionId.length > 0,
        sessionId: typeof sessionId === "string" ? sessionId : null,
        isInitializeRequest: initializeRequest,
        knownSessionCount: Object.keys(transports).length,
      });

      let transport: StreamableHTTPServerTransport | undefined;
      let server: McpServer | undefined;
      let initializedSessionId: string | undefined;
      if (sessionId && typeof sessionId === "string" && transports[sessionId]) {
        // Existing session: reuse transport and server
        console.error(`[DEBUG] Reusing existing MCP session: ${sessionId}`);
        const session = transports[sessionId];
        transport = session.transport;
        server = session.server;
      } else if (!sessionId && initializeRequest) {
        // New session: create transport and server instance
        console.error("[DEBUG] Creating new MCP session for initialize request");
        server = serverFactory();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: randomUUID,
          onsessioninitialized: (newSessionId: string) => {
            console.error(`[DEBUG] Session initialized with ID: ${newSessionId}`);
            transports[newSessionId] = { transport: transport!, server: server! };
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
        const knownSessions = Object.keys(transports);
        console.error("[DEBUG] Rejecting MCP request due to invalid session state", {
          method: req.method,
          sessionId: typeof sessionId === "string" ? sessionId : null,
          isInitializeRequest: initializeRequest,
          knownSessionCount: knownSessions.length,
          knownSessionsSample: knownSessions.slice(0, 5),
          reason: !sessionId
            ? "Missing mcp-session-id header for non-initialize request"
            : "Unknown or expired mcp-session-id",
        });
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
      if (initializeRequest && initializedSessionId) {
        res.setHeader('Mcp-Session-Id', initializedSessionId);
        console.error(`[DEBUG] Returning initialized session header Mcp-Session-Id: ${initializedSessionId}`);
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

  const activePort = await listenOnPort(httpServer, MCP_PORT, serviceName);

  console.error(`${serviceName} started (HTTP streaming mode on port ${activePort})`);
  console.error(`  - Build: ${BUILD_INFO.buildNumber} (${BUILD_INFO.timestamp})`);
  console.error(`  - MCP endpoint: POST http://localhost:${activePort}/mcp`);
  console.error(`  - Health check: GET http://localhost:${activePort}/health`);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.error("Shutting down HTTP MCP server...");
    httpServer.close(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    console.error("Shutting down HTTP MCP server...");
    httpServer.close(() => process.exit(0));
  });
}
