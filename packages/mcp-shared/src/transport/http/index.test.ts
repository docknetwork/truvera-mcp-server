import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { findNextAvailablePort, resolvePortConflict } from "./index.js";

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