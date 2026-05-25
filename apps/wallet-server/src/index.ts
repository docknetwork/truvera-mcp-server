import "dotenv/config";
import { bootstrapMCPServer } from "@truvera/mcp-shared/server";
import { BUILD_INFO } from "./build-info.js";
import { WalletClient } from "./wallet-client.js";
import { DIDClient, didToolDefs, getDIDHandlers } from "./features/dids/index.js";
import { CredentialClient, credentialToolDefs, getCredentialHandlers } from "./features/credentials/index.js";

// Configuration from environment variables
const MCP_PORT = parseInt(process.env.MCP_PORT || "3001", 10);
const MCP_MODE = process.env.MCP_MODE || "stdio"; // "stdio" or "http"
const WALLET_NAME = process.env.WALLET_NAME || "mcp-wallet";
const CHEQD_NETWORK = process.env.CHEQD_NETWORK || "testnet"; // "testnet" or "mainnet"
const WALLET_DB_PATH = process.env.WALLET_DB_PATH; // defaults to /data/wallet-db inside WalletClient

// Validate required environment variables
const WALLET_MASTER_KEY = process.env.WALLET_MASTER_KEY;
if (!WALLET_MASTER_KEY) {
  console.error("Warning: WALLET_MASTER_KEY not set. Wallet operations may be limited.");
  console.error("Set WALLET_MASTER_KEY environment variable for full functionality.");
}

// Initialize wallet and clients
async function initializeClients() {
  const walletClient = new WalletClient(WALLET_NAME, CHEQD_NETWORK, WALLET_DB_PATH);
  await walletClient.initialize();
  
  const wallet = walletClient.getWallet();
  const didClient = new DIDClient(wallet);
  const credentialClient = new CredentialClient(wallet);
  
  return { walletClient, didClient, credentialClient };
}

// Start server using bootstrap
async function main() {
  console.error("Starting Wallet MCP Server...");
  console.error(`  - Mode: ${MCP_MODE}`);
  
  const { didClient, credentialClient } = await initializeClients();
  
  // Build tools and handlers
  const tools = [...didToolDefs, ...credentialToolDefs];
  const toolHandlers = new Map([
    ...getDIDHandlers(didClient),
    ...getCredentialHandlers(credentialClient),
  ]);
  
  console.error(`  - Tools available: ${tools.length}`);
  
  await bootstrapMCPServer(
    {
      name: "wallet-mcp-service",
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
