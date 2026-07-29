import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { findNextAvailablePort, resolvePortConflict, startHTTPTransport } from "./index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SignJWT, exportSPKI, generateKeyPair } from "jose";

describe("findNextAvailablePort", () => {
  let occupiedServer: http.Server | undefined;

  afterEach(async () => {
    if (!occupiedServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      occupiedServer!.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    occupiedServer = undefined;
  });

  it("returns a higher port when the starting port is occupied", async () => {
    occupiedServer = http.createServer();

    await new Promise<void>((resolve) => {
      occupiedServer!.listen(0, "127.0.0.1", () => resolve());
    });

    const occupiedPort = (occupiedServer.address() as AddressInfo).port;
    const availablePort = await findNextAvailablePort(occupiedPort);

    expect(availablePort).toBeGreaterThan(occupiedPort);
  });
});

describe("resolvePortConflict", () => {
  it("returns the next port when the user accepts the prompt", async () => {
    const promptUser = vi.fn().mockResolvedValue("");
    const findPort = vi.fn().mockResolvedValue(3001);

    await expect(
      resolvePortConflict(3000, "wallet-mcp-service", {
        isInteractive: true,
        findNextAvailablePort: findPort,
        promptUser,
      })
    ).resolves.toBe(3001);

    expect(findPort).toHaveBeenCalledWith(3001);
    expect(promptUser).toHaveBeenCalledWith(
      "Port 3000 is already in use. Start wallet-mcp-service on port 3001 instead? [Y/n] "
    );
  });

  it("throws when no interactive terminal is available", async () => {
    const promptUser = vi.fn();

    await expect(
      resolvePortConflict(3000, "wallet-mcp-service", {
        isInteractive: false,
        findNextAvailablePort: vi.fn().mockResolvedValue(3001),
        promptUser,
      })
    ).rejects.toThrow(
      "Port 3000 is already in use. wallet-mcp-service can run on 3001, but no interactive terminal is available to confirm it."
    );

    expect(promptUser).not.toHaveBeenCalled();
  });

  it("throws when the user declines the alternate port", async () => {
    await expect(
      resolvePortConflict(3000, "wallet-mcp-service", {
        isInteractive: true,
        findNextAvailablePort: vi.fn().mockResolvedValue(3001),
        promptUser: vi.fn().mockResolvedValue("n"),
      })
    ).rejects.toThrow("Startup cancelled because port 3000 is already in use.");
  });
});

describe("startHTTPTransport /admin/revoke-tenant", () => {
  let server: http.Server | undefined;
  let baseUrl: string;

  async function start(adminRevoke?: { secret: string; onRevoke: (tenantId: string) => void | Promise<void> }) {
    const port = await findNextAvailablePort(41000);
    server = await startHTTPTransport({
      serverFactory: () => ({ server: {} as McpServer }),
      MCP_PORT: port,
      BUILD_INFO: { timestamp: "2026-01-01T00:00:00Z", buildNumber: 1, version: "0.0.0-test" },
      tools: [],
      serviceName: "test-service",
      adminRevoke,
    });
    baseUrl = `http://127.0.0.1:${port}`;
  }

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  });

  it("404s when adminRevoke is not configured", async () => {
    await start(undefined);
    const res = await fetch(`${baseUrl}/admin/revoke-tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "alice" }),
    });
    expect(res.status).toBe(404);
  });

  it("401s when the admin secret is missing or wrong", async () => {
    const onRevoke = vi.fn();
    await start({ secret: "correct-secret", onRevoke });

    const res = await fetch(`${baseUrl}/admin/revoke-tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": "wrong-secret" },
      body: JSON.stringify({ tenantId: "alice" }),
    });

    expect(res.status).toBe(401);
    expect(onRevoke).not.toHaveBeenCalled();
  });

  it("400s when tenantId is missing from the body", async () => {
    const onRevoke = vi.fn();
    await start({ secret: "correct-secret", onRevoke });

    const res = await fetch(`${baseUrl}/admin/revoke-tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": "correct-secret" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(onRevoke).not.toHaveBeenCalled();
  });

  it("revokes the tenant and returns 200 when the secret matches", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    await start({ secret: "correct-secret", onRevoke });

    const res = await fetch(`${baseUrl}/admin/revoke-tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": "correct-secret" },
      body: JSON.stringify({ tenantId: "alice" }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, tenantId: "alice" });
    expect(onRevoke).toHaveBeenCalledWith("alice");
  });
});

describe("startHTTPTransport JWT session reuse", () => {
  let server: http.Server | undefined;
  let baseUrl: string;
  let publicKeyPem: string;
  // jose types generateKeyPair's return generically; ES256 always yields a KeyLike/CryptoKey.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let privateKey: any;

  beforeAll(async () => {
    const { publicKey, privateKey: priv } = await generateKeyPair("ES256", { extractable: true });
    publicKeyPem = await exportSPKI(publicKey);
    privateKey = priv;
  });

  async function signToken(tenantId: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256" })
      .setSubject(tenantId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
  }

  async function start() {
    const port = await findNextAvailablePort(41200);
    server = await startHTTPTransport({
      serverFactory: () => ({ server: new McpServer({ name: "test-service", version: "0.0.0" }) }),
      MCP_PORT: port,
      BUILD_INFO: { timestamp: "2026-01-01T00:00:00Z", buildNumber: 1, version: "0.0.0-test" },
      tools: [],
      serviceName: "test-service",
      authConfig: { mode: "jwt", publicKeyPem },
    });
    baseUrl = `http://127.0.0.1:${port}`;
  }

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  });

  async function initialize(token: string) {
    return fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0.0.0" } },
      }),
    });
  }

  function reuseSession(sessionId: string, headers: Record<string, string> = {}) {
    return fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-session-id": sessionId,
        ...headers,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    });
  }

  it("rejects reuse of a session with no Authorization header", async () => {
    await start();
    const initRes = await initialize(await signToken("tenant-a"));
    expect(initRes.status).toBe(200);
    const sessionId = initRes.headers.get("mcp-session-id")!;
    expect(sessionId).toBeTruthy();

    const res = await reuseSession(sessionId);
    expect(res.status).toBe(401);
  });

  it("rejects reuse of a session with a different tenant's token", async () => {
    await start();
    const initRes = await initialize(await signToken("tenant-a"));
    const sessionId = initRes.headers.get("mcp-session-id")!;

    const res = await reuseSession(sessionId, { authorization: `Bearer ${await signToken("tenant-b")}` });
    expect(res.status).toBe(403);
  });

  it("allows reuse of a session with the same tenant's token", async () => {
    await start();
    const token = await signToken("tenant-a");
    const initRes = await initialize(token);
    const sessionId = initRes.headers.get("mcp-session-id")!;

    const res = await reuseSession(sessionId, { authorization: `Bearer ${token}` });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});