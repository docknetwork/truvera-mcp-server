import "dotenv/config";
import path from "node:path";
import { LocalStorage } from "node-localstorage";
import { blockchainService } from "@docknetwork/wallet-sdk-wasm/lib/services/blockchain/service.js";
import { bootstrapMCPServer } from "@truvera/mcp-shared/server";
import type { AuthConfig, AuthContext } from "@truvera/mcp-shared/auth";
import type { ToolHandler } from "@truvera/mcp-shared/tools";
import { BUILD_INFO } from "./build-info.js";
import { WalletClientPool } from "./wallet-client-pool.js";
import { DIDClient, didToolDefs, getDIDHandlers } from "./features/dids/index.js";
import { CredentialClient, credentialToolDefs, getCredentialHandlers } from "./features/credentials/index.js";
import { MessageClient, messageToolDefs, getMessageHandlers } from "./features/messages/index.js";
import { AgentCardClient, agentCardToolDefs, getAgentCardHandlers } from "./features/agent-card/index.js";
import { DelegationClient, delegationToolDefs, getDelegationHandlers } from "./features/delegation/index.js";

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
const MCP_MODE = process.env.MCP_MODE || "stdio";
const CHEQD_NETWORK = process.env.CHEQD_NETWORK || "testnet";
const MCP_AUTH_MODE = process.env.MCP_AUTH_MODE || "none";
// Base directory for per-tenant wallet databases (JWT mode only)
const WALLET_DB_BASE_PATH = process.env.WALLET_DB_BASE_PATH || "/data/wallets";
// Public key for verifying tenant JWTs (required when MCP_AUTH_MODE=jwt)
const MCP_JWT_PUBLIC_KEY = process.env.MCP_JWT_PUBLIC_KEY;

if (MCP_AUTH_MODE === "jwt" && !MCP_JWT_PUBLIC_KEY) {
  console.error("Fatal: MCP_JWT_PUBLIC_KEY is required when MCP_AUTH_MODE=jwt");
  process.exit(1);
}

if (!process.env.WALLET_MASTER_KEY) {
  console.error("Warning: WALLET_MASTER_KEY not set. Wallet operations may be limited.");
}

// Resolve auth config for the transport layer
const authConfig: AuthConfig = MCP_AUTH_MODE === "jwt"
  ? { mode: "jwt", publicKeyPem: MCP_JWT_PUBLIC_KEY! }
  : { mode: "none" };

// Single wallet pool shared across all sessions
const walletPool = new WalletClientPool();

// Track active MessageClients so we can stop background timers on shutdown
const activeMessageClients = new Set<MessageClient>();

// Per-session handler factory. Receives the resolved AuthContext and returns
// a handler map wired to the correct tenant wallet.
async function toolHandlerFactory(context: AuthContext): Promise<Map<string, ToolHandler>> {
  const dbPath = context.mode === "jwt"
    ? path.join(WALLET_DB_BASE_PATH, context.tenantId)
    : WALLET_DB_PATH_RESOLVED;

  const walletClient = await walletPool.get(dbPath, CHEQD_NETWORK);
  const wallet = walletClient.getWallet();

  const didClient = new DIDClient(wallet);
  // Share the DID provider across clients to avoid redundant provider instances
  const didProvider = await didClient.getProvider();
  const credentialClient = new CredentialClient(wallet, didProvider);
  const messageClient = new MessageClient(wallet, didProvider);
  const agentCardClient = new AgentCardClient(didClient);
  const delegationClient = new DelegationClient(wallet);

  activeMessageClients.add(messageClient);

  return new Map([
    ...getDIDHandlers(didClient),
    ...getCredentialHandlers(credentialClient),
    ...getMessageHandlers(messageClient),
    ...getDelegationHandlers(delegationClient),
    ...getAgentCardHandlers(agentCardClient),
  ]);
}

async function main() {
  console.error("Starting Wallet MCP Server...");
  console.error(`  - Mode: ${MCP_MODE}`);
  console.error(`  - Auth: ${MCP_AUTH_MODE}`);

  const tools = [
    ...didToolDefs,
    ...credentialToolDefs,
    ...messageToolDefs,
    ...delegationToolDefs,
    ...agentCardToolDefs,
  ];

  console.error(`  - Tools available: ${tools.length}`);

  const shutdown = async () => {
    await Promise.all([...activeMessageClients].map((c) => c.stop()));
    await walletPool.shutdownAll();
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
      toolHandlerFactory,
    },
    {
      mode: MCP_MODE as "stdio" | "http",
      port: MCP_PORT,
      authConfig,
    }
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
