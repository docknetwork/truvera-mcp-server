#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CONTAINER_NAME = "truvera-wallet-mcp";
const IMAGE_NAME = "docknetwork/truvera-wallet-mcp:latest";
const CONTAINER_PORT = 3001;
const DEFAULT_HOST_PORT = Number.parseInt(process.env.WALLET_HOST_PORT || "3001", 10);
const MAX_PORT_ATTEMPTS = 100;

// Read WALLET_DB_PATH from the env file so we don't require it to already be
// exported in the shell — mirroring how --env-file works for the container.
function readEnvFile(envFilePath) {
  try {
    return Object.fromEntries(
      fs.readFileSync(envFilePath, "utf8")
        .split("\n")
        .filter(line => line && !line.startsWith("#") && line.includes("="))
        .map(line => {
          const idx = line.indexOf("=");
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const ENV_FILE = "apps/wallet-server/.env";
const envVars = { ...readEnvFile(ENV_FILE), ...process.env };
const WALLET_DB_PATH = envVars.WALLET_DB_PATH;

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

  if (!WALLET_DB_PATH) {
    console.error("Error: WALLET_DB_PATH is not set in apps/wallet-server/.env");
    console.error("Set it to a host directory where wallet data should persist.");
    console.error("  Example: WALLET_DB_PATH=/home/you/wallet-data/wallet-db");
    process.exit(1);
  }

  // Ensure the host directory exists before mounting — Docker bind mounts do
  // not create missing directories and will fail silently or with a confusing error.
  const hostDir = path.dirname(WALLET_DB_PATH);
  try {
    fs.mkdirSync(hostDir, { recursive: true });
    // Pre-create the database file so SQLite opens an existing file rather than
    // creating one inside the container (avoids permission issues on bind mounts).
    if (!fs.existsSync(WALLET_DB_PATH)) {
      fs.writeFileSync(WALLET_DB_PATH, "");
    }
  } catch (err) {
    if (err.code === "EACCES") {
      console.error(`Error: cannot create wallet data directory '${hostDir}': permission denied.`);
      console.error(`WALLET_DB_PATH must be a path you have write access to.`);
      console.error(`  Current value: WALLET_DB_PATH=${WALLET_DB_PATH}`);
      console.error(`  Example:       WALLET_DB_PATH=${process.env.HOME}/wallet-data/wallet-db`);
    } else {
      console.error(`Error: cannot create wallet data directory '${hostDir}': ${err.message}`);
    }
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

  // WALLET_DB_PATH in .env is the host-side path. Inside the container the
  // directory is always mounted at /data, so translate the path accordingly.
  const containerDbPath = `/data/${path.basename(WALLET_DB_PATH)}`;

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
    "-e",
    `WALLET_DB_PATH=${containerDbPath}`,
    "-p",
    `${hostPort}:${CONTAINER_PORT}`,
    "--mount",
    `type=bind,source=${hostDir},target=/data`,
    IMAGE_NAME,
  ]);

  console.log(`Wallet MCP container '${CONTAINER_NAME}' is running at http://localhost:${hostPort}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
