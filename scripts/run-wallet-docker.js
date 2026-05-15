#!/usr/bin/env node

import net from "node:net";
import { spawnSync } from "node:child_process";

const CONTAINER_NAME = "truvera-wallet-mcp";
const IMAGE_NAME = "docknetwork/truvera-wallet-mcp:latest";
const CONTAINER_PORT = 3001;
const DEFAULT_HOST_PORT = Number.parseInt(process.env.WALLET_HOST_PORT || "3001", 10);
const MAX_PORT_ATTEMPTS = 100;

function runDocker(args, { allowFailure = false } = {}) {
  const result = spawnSync("docker", args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  if (!allowFailure && result.status !== 0) {
    process.exit(result.status || 1);
  }

  return result;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "0.0.0.0");
  });
}

async function findAvailablePort(startPort) {
  let port = startPort;

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port += 1;
  }

  throw new Error(
    `Unable to find an available host port after checking ${MAX_PORT_ATTEMPTS} ports starting at ${startPort}.`
  );
}

async function main() {
  if (!Number.isFinite(DEFAULT_HOST_PORT) || DEFAULT_HOST_PORT <= 0) {
    console.error("WALLET_HOST_PORT must be a positive integer if provided.");
    process.exit(1);
  }

  // Remove any previous wallet container so reruns are idempotent.
  runDocker(["rm", "-f", CONTAINER_NAME], { allowFailure: true });

  const hostPort = await findAvailablePort(DEFAULT_HOST_PORT);
  if (hostPort !== DEFAULT_HOST_PORT) {
    console.log(`Port ${DEFAULT_HOST_PORT} is in use. Using available port ${hostPort} instead.`);
  } else {
    console.log(`Using default host port ${hostPort}.`);
  }

  runDocker([
    "run",
    "-d",
    "--name",
    CONTAINER_NAME,
    "--env-file",
    "apps/wallet-server/.env",
    "-e",
    "MCP_MODE=http",
    "-e",
    `MCP_PORT=${CONTAINER_PORT}`,
    "-p",
    `${hostPort}:${CONTAINER_PORT}`,
    IMAGE_NAME,
  ]);

  console.log(`Wallet MCP container '${CONTAINER_NAME}' is running at http://localhost:${hostPort}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
