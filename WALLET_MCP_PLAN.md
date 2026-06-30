# Wallet MCP Server Implementation Plan

## Overview
`apps/wallet-server` is an MCP server for the Truvera Wallet SDK. It enables LLMs/agents to hold verifiable credentials, manage DIDs, and participate in verification flows such as AP2 (Agent Payments Protocol) and A2A (Agent-to-Agent) authentication.

---

## Status Summary (updated 2026-06-18)

| Phase | Status |
|-------|--------|
| Phase 1: Shared infrastructure (mcp-shared) | ✅ Complete |
| Phase 2: Wallet client (SQLite/TypeORM) | ✅ Complete |
| Phase 3: DID feature | ✅ Complete |
| Phase 4: Credential feature | ✅ Complete |
| Phase 5: Messages / DIDComm feature | 🚧 In progress |
| Cloud wallet / EDV sync | ❌ Descoped — see decision below |
| Document management tools | ❌ Descoped (focus on credentials) |
| Biometric authentication | ❌ Descoped |

---

## Architecture Decisions

### Local storage (SQLite) over cloud EDV
Customer feedback: cloud EDV latency is unacceptable for agent flows. Many instances are short-lived. SQLite on a mounted Docker volume (`/data/wallet-db`) is the persistence strategy. No cloud wallet sync tools will be built.

### Single wallet per server instance
One wallet, initialized at startup from `WALLET_NAME` and `CHEQD_NETWORK` env vars. Multi-wallet is out of scope.

### Stateful, persistent wallet
Unlike truvera-api (stateless REST), the wallet server maintains state across tool calls. Credentials and DIDs survive restarts via SQLite.

### Feature module pattern
Each feature (`dids`, `credentials`, `messages`) contains: `client.ts`, `tools.ts`, `types.ts`, `schemas.ts`, `index.ts`, and a `tests/` directory with unit + integration tests.

---

## Environment Variables

```bash
# Required for full functionality
WALLET_MASTER_KEY=your-master-key-here   # BIP39 key for wallet operations

# Optional
WALLET_NAME=mcp-wallet                   # Wallet identifier
WALLET_DB_PATH=/data/wallet-db           # SQLite database path (default: /data/wallet-db)
CHEQD_NETWORK=testnet                    # testnet or mainnet
MCP_MODE=stdio                           # stdio or http
MCP_PORT=3001                            # HTTP port (when MCP_MODE=http)
```

---

## Implemented MCP Tools

### DID Tools
| Tool | Description |
|------|-------------|
| `get_default_did` | Get the wallet's primary DID |
| `create_did` | Create a new DID (did:key) |
| `list_dids` | List all DIDs in the wallet |

### Credential Tools
| Tool | Description |
|------|-------------|
| `list_credentials` | List all credentials with metadata |
| `get_credential` | Retrieve a specific credential by ID |
| `import_credential` | Import a credential from an OpenID credential offer URI |
| `respond_to_proof_request` | Create and submit a verifiable presentation satisfying a proof request |

### Message Tools (in progress)
| Tool | Description |
|------|-------------|
| `fetch_messages` | Fetch DIDComm messages from the relay service and return decrypted messages |
| `send_message` | Send a DIDComm message to a recipient DID |

---

## AP2 / A2A Flow Support

### AP2 (Agent Payments Protocol) — holder side
1. Issuer creates mandate credential/offer via `truvera-api` (`issue_intent_mandate`, `issue_cart_mandate`)
2. Agent wallet imports mandate: `import_credential` with the offer URI
3. Merchant sends proof request → agent calls `respond_to_proof_request` → presentation auto-submitted to `response_url`

### A2A (Agent-to-Agent) — authentication via DIDComm
1. Agent has a DID: `get_default_did` or `create_did`
2. Peer agent sends proof request via DIDComm relay
3. Agent polls for messages: `fetch_messages` → returns decrypted messages including proof requests
4. Agent responds: `respond_to_proof_request` with the proof request from message body
5. Agent optionally sends acknowledgement: `send_message`

---

## Phase Details

### ✅ Phase 1: Shared Infrastructure (`packages/mcp-shared`)

**What was built:**
- `transport/stdio/` and `transport/http/` — both transport implementations
- `server/bootstrap.ts` — common server init accepting tools + handlers
- `tools/types.ts` — `ToolDef`, `ToolHandler`, `ToolResult` interfaces

All downstream servers import from `@truvera/mcp-shared`.

---

### ✅ Phase 2: Wallet Client

**File:** [apps/wallet-server/src/wallet-client.ts](apps/wallet-server/src/wallet-client.ts)

Uses `@docknetwork/wallet-sdk-data-store-typeorm` (SQLite). Key behaviours:
- `initialize()` — creates data store + wallet, sets network
- `waitForIdle()` — drains SDK write mutex; required before wallet teardown in tests
- `deleteWallet()` — clears interval timer, calls SDK cleanup

**Test isolation pattern:** Integration tests pass a unique `os.tmpdir()` path to `WalletClient` per test. Never use the default `/data/wallet-db` in tests.

---

### ✅ Phase 3: DID Feature

**Tools:** `get_default_did`, `create_did`, `list_dids`

Note: `createDIDKey` is used (did:key method). The `getAll()` call on the DID provider returns `DIDResolutionResponse` docs — DIDs are filtered from these.

---

### ✅ Phase 4: Credential Feature

**Tools:** `list_credentials`, `get_credential`, `import_credential`, `respond_to_proof_request`

Key implementation details:
- `importCredentialFromURI` handles OpenID4VCI credential offer URIs
- `respond_to_proof_request` uses `createVerificationController` from the SDK
- Supports BBS+ selective disclosure via `attributesToRevealByCredential`
- Returns `needs_input` status when the LLM needs to select credentials or attributes
- cheqd DID normalization is applied in `index.ts` (double-JSON-encoded assertionMethod fix)
- A `node-localstorage` shim is mounted at startup for SDK DID resolution caching

---

### 🚧 Phase 5: Messages / DIDComm Feature

**Tools:** `fetch_messages`, `send_message`

**SDK internals:**
- `createMessageProvider({ wallet, didProvider })` from `@docknetwork/wallet-sdk-core`
- `fetchMessages()` — polls relay service, stores encrypted messages as `DIDCommMessage` wallet docs
- `processDIDCommMessages(limit)` — decrypts stored messages, emits `didcomm-message-decrypted`, removes from wallet
- `sendMessage({ from, to, message, type })` — sends via relay service

**Message types (from `message-helpers.js`):**
```
RequestPresentation  → 'https://didcomm.org/present-proof/1.0/request-presentation'
Presentation         → 'https://didcomm.org/present-proof/1.0/presentation'
IssueWithData        → 'https://didcomm.org/issue-credential/2.0/offer-credential'
Invitation           → 'https://didcomm.org/out-of-band/2.0/invitation'
Ack                  → 'https://didcomm.org/ack/1.0/ack'
Basic                → 'https://didcomm.org/basicmessage/1.0/message'
```

**Design:** `fetch_messages` does fetch + process in one call (sets a listener before calling `processDIDCommMessages`, collects decrypted messages). Returns messages with classified type hints so the LLM knows which subsequent tool to call (e.g. `respond_to_proof_request` for `RequestPresentation` type).

---

## ❌ Descoped Features

| Feature | Reason |
|---------|--------|
| Cloud wallet / EDV sync | Customer feedback: latency unacceptable; instances are short-lived |
| `generate_master_key`, `recover_master_key`, `initialize_cloud_wallet`, `sync_from_cloud` | Tied to cloud wallet — descoped |
| Biometric authentication | Requires platform APIs not available in container |
| Document management tools | Focus on credentials; documents are internal SDK concept |
| Manual wallet export/import | Cloud handles persistence (now moot — local SQLite used instead) |

---

## Key Design Principles

1. **Shared core, custom features** — transport + bootstrap in mcp-shared; features are app-specific
2. **Plugin architecture** — each feature is self-contained and independently exportable
3. **Type safety** — TypeScript throughout; JSON Schema for tool input validation
4. **Stateful** — wallet persists across tool calls; SQLite on mounted volume for restarts
5. **Security** — `WALLET_MASTER_KEY` never logged; mnemonics treated as secrets

---

## Testing Strategy

- **Unit tests** (Vitest): mock the wallet/SDK, test business logic and tool handler I/O
- **Integration tests**: real SDK + isolated SQLite temp file per test; test against testnet for network-dependent flows
- **Pattern**: `beforeEach` creates a fresh `WalletClient` with `os.tmpdir()` path; `afterEach` calls `waitForIdle()` then `deleteWallet()`
- Network tests (e.g. `import_credential` with live credential offer) are in separate `*.e2e.test.ts` files

---

## File Structure

```
apps/wallet-server/src/
├── index.ts                        # Server entry point, client init, tool registration
├── wallet-client.ts                # WalletClient (SQLite lifecycle)
├── build-info.ts                   # Version metadata
├── features/
│   ├── credentials/
│   │   ├── client.ts               # CredentialClient
│   │   ├── tools.ts                # list_credentials, get_credential, import_credential, respond_to_proof_request
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   ├── index.ts
│   │   └── tests/
│   │       ├── unit/
│   │       └── integration/
│   ├── dids/
│   │   ├── client.ts               # DIDClient
│   │   ├── tools.ts                # get_default_did, create_did, list_dids
│   │   ├── types.ts
│   │   ├── schemas.ts
│   │   ├── index.ts
│   │   └── tests/
│   │       ├── unit/
│   │       └── integration/
│   └── messages/
│       ├── client.ts               # MessageClient
│       ├── tools.ts                # fetch_messages, send_message
│       ├── types.ts
│       ├── schemas.ts
│       ├── index.ts
│       └── tests/
│           ├── unit/
│           └── integration/
└── types/
    └── wallet-sdk-wasm.d.ts

packages/mcp-shared/src/
├── index.ts
├── server/                         # bootstrapMCPServer
├── transport/                      # stdio + http transports
└── tools/                          # ToolDef, ToolHandler types
```
