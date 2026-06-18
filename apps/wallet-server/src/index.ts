import "dotenv/config";
import { LocalStorage } from "node-localstorage";
import { blockchainService } from "@docknetwork/wallet-sdk-wasm/lib/services/blockchain/service.js";
import { bootstrapMCPServer } from "@truvera/mcp-shared/server";
import { BUILD_INFO } from "./build-info.js";
import { WalletClient } from "./wallet-client.js";
import { DIDClient, didToolDefs, getDIDHandlers } from "./features/dids/index.js";
import { CredentialClient, credentialToolDefs, getCredentialHandlers } from "./features/credentials/index.js";
import { MessageClient, messageToolDefs, getMessageHandlers } from "./features/messages/index.js";
import { AgentCardClient, agentCardToolDefs, getAgentCardHandlers } from "./features/agent-card/index.js";

// wallet-sdk-wasm's storageService calls global.localStorage for DID resolution
// caching during BBS+ proof generation. Node.js has no native localStorage, so
// we use node-localstorage backed by the same /data volume as the wallet DB.
const WALLET_DB_PATH_RESOLVED = process.env.WALLET_DB_PATH || "/data/wallet-db";
const _lsPath = `${WALLET_DB_PATH_RESOLVED}-localstorage`;
(globalThis as any).localStorage = new LocalStorage(_lsPath);

// cheqd DID documents store BBS+ keys as JSON-stringified objects in
// assertionMethod/authentication rather than as proper objects in
// verificationMethod. Wrap the resolver to normalise these before jsonld.frame
// processes them, so publicKeyBase58 is always reachable.
function normalizeDIDDocument(doc: any): any {
  if (!doc || typeof doc !== "object") return doc;
  const extra: any[] = [];
  for (const prop of ["assertionMethod", "authentication", "capabilityInvocation", "capabilityDelegation"]) {
    if (!Array.isArray(doc[prop])) continue;
    doc[prop] = doc[prop].map((entry: any) => {
      if (typeof entry !== "string") return entry;
      try {
        // cheqd DID documents can be double-JSON-encoded (string → string → object)
        let parsed: any = JSON.parse(entry);
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
        if (parsed && typeof parsed === "object" && parsed.id) {
          extra.push(parsed);
          return parsed.id;
        } else if (parsed && typeof parsed === "object") {
          console.warn(`[normalizeDIDDocument] embedded key object missing id, leaving as string: ${entry.slice(0, 80)}`);
        }
      } catch {}
      return entry;
    });
  }
  if (extra.length) doc.verificationMethod = [...(doc.verificationMethod ?? []), ...extra];
  return doc;
}
const _origResolve = blockchainService.resolver.resolve.bind(blockchainService.resolver);
(blockchainService.resolver as any).resolve = async (did: string) => normalizeDIDDocument(await _origResolve(did));

// Configuration from environment variables
const MCP_PORT = parseInt(process.env.MCP_PORT || "3001", 10);
const MCP_MODE = process.env.MCP_MODE || "stdio"; // "stdio" or "http"
const WALLET_NAME = process.env.WALLET_NAME || "mcp-wallet";
const CHEQD_NETWORK = process.env.CHEQD_NETWORK || "testnet"; // "testnet" or "mainnet"

// Validate required environment variables
const WALLET_MASTER_KEY = process.env.WALLET_MASTER_KEY;
if (!WALLET_MASTER_KEY) {
  console.error("Warning: WALLET_MASTER_KEY not set. Wallet operations may be limited.");
  console.error("Set WALLET_MASTER_KEY environment variable for full functionality.");
}

// Initialize wallet and clients
async function initializeClients() {
  const walletClient = new WalletClient(WALLET_NAME, CHEQD_NETWORK, WALLET_DB_PATH_RESOLVED);
  await walletClient.initialize();

  const wallet = walletClient.getWallet();
  const didClient = new DIDClient(wallet);
  // Share the DID provider across clients to avoid redundant provider instances
  const didProvider = await didClient.getProvider();
  const credentialClient = new CredentialClient(wallet, didProvider);
  const messageClient = new MessageClient(wallet, didProvider);
  const agentCardClient = new AgentCardClient(didClient);

  return { walletClient, didClient, credentialClient, messageClient, agentCardClient };
}

// Start server using bootstrap
async function main() {
  console.error("Starting Wallet MCP Server...");
  console.error(`  - Mode: ${MCP_MODE}`);
  
  const { didClient, credentialClient, messageClient, agentCardClient } = await initializeClients();

  // Build tools and handlers
  const tools = [...didToolDefs, ...credentialToolDefs, ...messageToolDefs, ...agentCardToolDefs];
  const toolHandlers = new Map([
    ...getDIDHandlers(didClient),
    ...getCredentialHandlers(credentialClient),
    ...getMessageHandlers(messageClient),
    ...getAgentCardHandlers(agentCardClient),
  ]);

  console.error(`  - Tools available: ${tools.length}`);

  const shutdown = async () => {
    await messageClient.stop();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

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
