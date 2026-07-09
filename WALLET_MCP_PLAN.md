# Wallet MCP Server Implementation Plan

## Overview
Create a new MCP server (`apps/wallet-server`) for the Truvera Wallet SDK using `@docknetwork/wallet-sdk-web` package. The server will enable Claude to interact with a cloud wallet for credential management, DID operations, and verification workflows.

---

## Phase 1: Shared Infrastructure Refactoring

### 1.1 Extract Shared MCP Core Components
**Goal:** Move reusable MCP server code to a shared location accessible by both servers.

**Tasks:**
- [ ] Create `packages/mcp-shared/` directory for shared code
- [ ] Extract transport layer to `packages/mcp-shared/src/transport/`
  - `stdio/index.ts` - stdio transport implementation
  - `http/index.ts` - HTTP streaming transport implementation
  - `types.ts` - transport type definitions
- [ ] Extract tool system to `packages/mcp-shared/src/tools/`
  - `types.ts` - ToolDef, ToolHandler, ToolResult interfaces
  - `utils.ts` - formatResult and other utilities
  - `composeTools.ts` - Generic tool composition helpers
- [ ] Extract build info types to `packages/mcp-shared/src/types/`
  - `build-info.ts` - BuildInfo interface
- [ ] Create `packages/mcp-shared/package.json` with proper exports
- [ ] Update `apps/truvera-api/` to import from shared package
- [ ] Update root `package.json` workspaces configuration

**Files to Create:**
```
packages/
└── mcp-shared/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts
    │   ├── transport/
    │   │   ├── index.ts
    │   │   ├── stdio/
    │   │   │   └── index.ts
    │   │   ├── http/
    │   │   │   └── index.ts
    │   │   └── types.ts
    │   ├── tools/
    │   │   ├── index.ts
    │   │   ├── types.ts
    │   │   └── utils.ts
    │   └── types/
    │       ├── index.ts
    │       └── build-info.ts
    └── README.md
```

**Estimated Effort:** 4-6 hours

---

### 1.2 Create Server Bootstrap Template
**Goal:** Abstract common server initialization logic.

**Tasks:**
- [ ] Create `packages/mcp-shared/src/server/` directory
- [ ] Extract server setup logic into reusable function
  - Accept: server name, version, tools, handlers, transport config
  - Handle: ListTools, CallTool request handlers
  - Return: configured MCP server instance
- [ ] Add configuration types for server options
- [ ] Document server bootstrap API

**Files to Create:**
```
packages/mcp-shared/src/server/
├── index.ts
├── bootstrap.ts
├── types.ts
└── handlers.ts
```

**Estimated Effort:** 3-4 hours

---

## Phase 2: Wallet SDK Analysis & Tool Design

### 2.1 Wallet SDK Capability Analysis
**Goal:** Understand the full API surface of `@docknetwork/wallet-sdk-web`.

**Key Modules Identified:**

#### Core Wallet Functions
- `createWallet({ dataStore })` - Initialize wallet
- `wallet.deleteWallet()` - Remove wallet
- `wallet.addDocument(doc)` - Add document
- `wallet.getAllDocuments()` - Get all docs
- `wallet.getDocumentById(id)` - Get specific doc
- `wallet.getDocumentsByType(type)` - Filter by type
- `wallet.updateDocument(doc)` - Update doc
- `wallet.removeDocument(id)` - Remove doc
- `wallet.exportDocuments({ documents, password })` - Export encrypted
- `wallet.exportUniversalWalletJSON(password)` - Export full wallet

#### Cloud Wallet Functions
- `generateCloudWalletMasterKey()` - Generate key & mnemonic
- `recoverCloudWalletMasterKey(mnemonic)` - Recover from mnemonic
- `initializeCloudWallet({ dataStore, edvUrl, authKey, masterKey })` - Initialize cloud sync
- `pullDocuments()` - Sync from cloud
- `enrollUserWithBiometrics(edvUrl, authKey, biometric, userId)` - Biometric enrollment
- `authenticateWithBiometrics(edvUrl, authKey, biometric, userId)` - Biometric auth

#### DID Provider Functions
- `createDIDProvider({ wallet })` - Create provider
- `didProvider.getDefaultDID()` - Get default DID
- `didProvider.createDID()` - Create new DID
- `didProvider.getDIDs()` - List all DIDs

#### Credential Provider Functions
- `createCredentialProvider({ wallet })` - Create provider
- `credentialProvider.importCredentialFromURI({ uri, didProvider })` - Import credential
- `credentialProvider.getCredentials()` - List credentials

#### Message Provider Functions
- `createMessageProvider({ wallet, didProvider })` - Create provider
- `messageProvider.fetchMessages()` - Fetch DIDComm messages
- `messageProvider.processDIDCommMessages()` - Process messages

#### Verification Controller Functions
- `createVerificationController({ wallet })` - Create controller
- `controller.start({ template })` - Start verification
- `controller.selectedCredentials.set(id, { credential, attributesToReveal })` - Select credentials
- `controller.createPresentation()` - Build presentation
- `controller.submitPresentation(presentation)` - Submit for verification

---

### 2.2 Tool Definitions
**Goal:** Define MCP tools for each wallet operation.

#### Wallet Management Tools
- `create_wallet` - Initialize a new wallet
- `delete_wallet` - Remove wallet and all data
- `export_wallet` - Export encrypted wallet backup
- `import_wallet` - Import wallet from backup
- `get_wallet_status` - Check wallet initialization status

#### Document Management Tools
- `add_document` - Add document to wallet
- `get_document` - Retrieve document by ID
- `list_documents` - List all documents (with type filter)
- `update_document` - Update existing document
- `delete_document` - Remove document from wallet

#### Cloud Wallet Tools
- `generate_master_key` - Generate new cloud wallet key
- `recover_master_key` - Recover key from mnemonic
- `initialize_cloud_wallet` - Initialize cloud sync
- `sync_from_cloud` - Pull documents from EDV
- `enroll_biometric` - Enroll biometric authentication
- `authenticate_biometric` - Authenticate with biometric

#### DID Management Tools
- `get_default_did` - Get wallet's default DID
- `create_did` - Generate new DID
- `list_dids` - List all DIDs in wallet

#### Credential Management Tools
- `import_credential` - Import credential from offer URI
- `list_credentials` - Get all credentials in wallet
- `get_credential` - Get specific credential by ID

#### Messaging Tools
- `fetch_messages` - Fetch DIDComm messages
- `process_messages` - Process pending messages

#### Verification/Presentation Tools
- `start_verification` - Initialize verification flow
- `select_credentials_for_presentation` - Choose credentials to reveal
- `create_presentation` - Build verifiable presentation
- `submit_presentation` - Submit presentation to verifier

**Estimated Effort:** 6-8 hours for analysis and design

---

## Phase 3: Wallet Server Implementation

### 3.1 Project Scaffold
**Goal:** Create basic project structure for wallet server.

**Tasks:**
- [ ] Create `apps/wallet-server/` directory
- [ ] Setup package.json with dependencies
  - `@docknetwork/wallet-sdk-web`
  - `@docknetwork/wallet-sdk-core`
  - `@docknetwork/wallet-sdk-data-store-web`
  - `@modelcontextprotocol/sdk`
  - Reference `mcp-shared` package
- [ ] Create tsconfig.json
- [ ] Setup build scripts
- [ ] Create Dockerfile
- [ ] Add environment variable configuration

**Files to Create:**
```
apps/wallet-server/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
├── .dockerignore
├── README.md
└── src/
    └── index.ts
```

**Environment Variables:**
- `EDV_URL` - Encrypted Data Vault URL (default: https://edv.dock.io)
- `EDV_AUTH_KEY` - EDV authentication key
- `WALLET_NETWORK` - Network ID (testnet/mainnet)
- `MCP_MODE` - Transport mode (stdio/http)
- `MCP_PORT` - HTTP port (when MODE=http)

**Estimated Effort:** 2-3 hours

---

### 3.2 Feature Module Structure
**Goal:** Implement feature-based architecture like truvera-api.

**Tasks:**
- [ ] Create feature modules following plugin pattern:
  ```
  src/features/
  ├── wallet/          # Core wallet operations
  ├── cloud-wallet/    # Cloud sync operations
  ├── dids/            # DID management
  ├── credentials/     # Credential management
  ├── messages/        # DIDComm messaging
  ├── verification/    # Presentation/verification
  └── shared/          # Shared types and utilities
  ```

- [ ] Each feature exports:
  - `client.ts` - API client wrapper
  - `tools.ts` - Tool definitions and handlers
  - `types.ts` - TypeScript interfaces
  - `schemas.ts` - JSON Schema definitions
  - `index.ts` - Public exports

**Estimated Effort:** 2-3 hours for structure

---

### 3.3 Core Wallet Client Implementation
**Goal:** Implement wallet initialization and state management.

**Tasks:**
- [ ] Create `src/features/wallet/client.ts`
  - WalletClient class
  - Initialize data store
  - Create/destroy wallet
  - Export/import operations
- [ ] Create persistent wallet state manager
- [ ] Implement tool handlers
  - create_wallet
  - delete_wallet
  - export_wallet
  - import_wallet
  - get_wallet_status

**File:** `src/features/wallet/client.ts`
```typescript
export class WalletClient {
  private dataStore: DataStore | null = null;
  private wallet: IWallet | null = null;
  
  async initialize(): Promise<void>
  async createWallet(): Promise<WalletInfo>
  async deleteWallet(): Promise<void>
  async exportWallet(password: string): Promise<string>
  async importWallet(data: string, password: string): Promise<void>
  async getStatus(): Promise<WalletStatus>
}
```

**Estimated Effort:** 4-6 hours

---

### 3.4 Cloud Wallet Client Implementation
**Goal:** Implement cloud sync and key management.

**Tasks:**
- [ ] Create `src/features/cloud-wallet/client.ts`
  - CloudWalletClient class
  - Master key generation
  - Mnemonic recovery
  - Cloud initialization
  - Document synchronization
  - Biometric operations
- [ ] Implement tool handlers
  - generate_master_key
  - recover_master_key
  - initialize_cloud_wallet
  - sync_from_cloud
  - enroll_biometric
  - authenticate_biometric

**Estimated Effort:** 6-8 hours

---

### 3.5 DID Client Implementation
**Goal:** Implement DID management operations.

**Tasks:**
- [ ] Create `src/features/dids/client.ts`
  - DIDClient class wrapping DIDProvider
  - DID creation
  - DID listing
  - Default DID management
- [ ] Implement tool handlers
  - get_default_did
  - create_did
  - list_dids

**Estimated Effort:** 3-4 hours

---

### 3.6 Credential Client Implementation
**Goal:** Implement credential import and management.

**Tasks:**
- [ ] Create `src/features/credentials/client.ts`
  - CredentialClient class wrapping CredentialProvider
  - Import from OpenID credential offers
  - Credential listing
  - Credential retrieval
- [ ] Implement tool handlers
  - import_credential
  - list_credentials
  - get_credential

**Estimated Effort:** 4-5 hours

---

### 3.7 Message Client Implementation
**Goal:** Implement DIDComm messaging.

**Tasks:**
- [ ] Create `src/features/messages/client.ts`
  - MessageClient class wrapping MessageProvider
  - Fetch messages for DIDs
  - Process DIDComm messages
- [ ] Implement tool handlers
  - fetch_messages
  - process_messages

**Estimated Effort:** 3-4 hours

---

### 3.8 Verification Client Implementation
**Goal:** Implement verification and presentation flows.

**Tasks:**
- [ ] Create `src/features/verification/client.ts`
  - VerificationClient class wrapping VerificationController
  - Verification initialization
  - Credential selection
  - Presentation creation
  - Presentation submission
- [ ] Implement tool handlers
  - start_verification
  - select_credentials_for_presentation
  - create_presentation
  - submit_presentation

**Estimated Effort:** 5-6 hours

---

### 3.9 Tool Composition
**Goal:** Compose all feature tools into server.

**Tasks:**
- [ ] Create `src/tools/composeTools.ts`
  - Import all feature tool definitions
  - Merge tool lists
  - Build handler map
  - Schema resolution (if needed)
- [ ] Create main server entry point `src/index.ts`
  - Initialize clients
  - Build tools and handlers
  - Bootstrap MCP server using shared infrastructure
  - Handle transport selection (stdio/http)

**Estimated Effort:** 3-4 hours

---

## Phase 4: Testing & Documentation

### 4.1 Unit Tests
**Tasks:**
- [ ] Create test structure mirroring source
- [ ] Write unit tests for each client class
- [ ] Mock wallet SDK dependencies
- [ ] Test tool handlers in isolation

**Estimated Effort:** 8-10 hours

---

### 4.2 Integration Tests
**Tasks:**
- [ ] Test wallet lifecycle (create, use, destroy)
- [ ] Test cloud sync flow
- [ ] Test credential import flow
- [ ] Test verification flow
- [ ] Test with real EDV (testnet)

**Estimated Effort:** 6-8 hours

---

### 4.3 Documentation
**Tasks:**
- [ ] Create comprehensive README for wallet-server
  - Setup instructions
  - Environment configuration
  - Tool usage examples
  - Cloud wallet setup guide
- [ ] Document each tool with examples
- [ ] Update root README
- [ ] Update copilot-instructions.md

**Estimated Effort:** 4-5 hours

---

## Phase 5: Deployment & DevOps

### 5.1 Docker Configuration
**Tasks:**
- [ ] Create optimized Dockerfile
- [ ] Add wallet-server to docker-compose.yml
- [ ] Test container build
- [ ] Document container usage

**Estimated Effort:** 2-3 hours

---

### 5.2 CI/CD Updates
**Tasks:**
- [ ] Add wallet-server to GitHub Actions workflow
- [ ] Add build/test jobs
- [ ] Add lint checks
- [ ] Update badge in README

**Estimated Effort:** 2-3 hours

---

### 5.3 VS Code Integration
**Tasks:**
- [ ] Add build:wallet task to tasks.json
- [ ] Add dev:wallet task to tasks.json
- [ ] Add debug configuration to launch.json
- [ ] Update .vscode/mcp.json for local testing

**Estimated Effort:** 1-2 hours

---

## Total Estimated Effort
- **Phase 1 (Refactoring):** 7-10 hours
- **Phase 2 (Analysis):** 6-8 hours
- **Phase 3 (Implementation):** 30-40 hours
- **Phase 4 (Testing/Docs):** 18-23 hours
- **Phase 5 (Deployment):** 5-8 hours

**Grand Total:** 66-89 hours (~2-3 weeks of development)

---

## Recommended Implementation Order

### Week 1: Foundation
1. Phase 1.1 - Extract shared infrastructure (Day 1-2)
2. Phase 1.2 - Create server bootstrap (Day 2-3)
3. Phase 3.1 - Project scaffold (Day 3)
4. Phase 3.2 - Feature structure (Day 4)
5. Phase 3.3 - Core wallet client (Day 4-5)

### Week 2: Feature Implementation
6. Phase 3.4 - Cloud wallet client (Day 6-7)
7. Phase 3.5 - DID client (Day 8)
8. Phase 3.6 - Credential client (Day 8-9)
9. Phase 3.7 - Message client (Day 9)
10. Phase 3.8 - Verification client (Day 10)

### Week 3: Integration & Deployment
11. Phase 3.9 - Tool composition (Day 11)
12. Phase 4.1 - Unit tests (Day 11-12)
13. Phase 4.2 - Integration tests (Day 13)
14. Phase 4.3 - Documentation (Day 13-14)
15. Phase 5 - Deployment setup (Day 14-15)

---

## Key Design Principles

1. **Shared Core, Custom Features**
   - Transport, tool system, and server bootstrap are shared
   - Feature modules are app-specific
   - Each server can have unique client implementations

2. **Plugin Architecture**
   - Each feature is self-contained
   - Features export tools and handlers independently
   - Easy to add/remove features

3. **Type Safety**
   - Full TypeScript throughout
   - JSON Schema for tool validation
   - Proper interface definitions

4. **Stateful Operation**
   - Unlike truvera-api (stateless REST calls), wallet-server maintains state
   - Need wallet lifecycle management
   - Consider persistence between restarts

5. **Security Considerations**
   - Master keys should not be logged
   - Mnemonics are sensitive
   - EDV auth keys must be secured
   - Consider encryption at rest for local state

---

## Implementation Decisions ✅

1. **Wallet Persistence:** State stored in cloud wallet (EDV). Master key passed as env var at runtime.
  
2. **Multi-Wallet Support:** Single wallet per server instance.

3. **Storage:** Cloud storage only (EDV) - automatic synchronization.

4. **Feature Priority:** DIDs → Credentials → DIDComm messaging.

5. **Timeline:** Fast iteration, working together in bite-sized chunks.

---

## Simplified Scope (MVP)

Based on decisions above, we'll **skip** these features for MVP:
- ❌ Local-only wallet operations (no cloud sync)
- ❌ Biometric authentication (requires platform APIs)
- ❌ Document management (focus on credentials only)
- ❌ Manual export/import (cloud handles persistence)
- ❌ Verification/presentation tools (add later)

**Focus on:**
- ✅ Cloud wallet initialization with master key
- ✅ DID management (create, list, get default)
- ✅ Credential management (import, list, get)
- ✅ DIDComm messaging (fetch, process)

---

## Environment Variables (Simplified)

```bash
# Cloud Wallet Configuration
EDV_URL=https://edv.dock.io                    # Encrypted Data Vault URL
EDV_AUTH_KEY=your-edv-auth-key                 # EDV authentication key
WALLET_MASTER_KEY=your-master-key-here         # Master key for cloud wallet
# OR provide mnemonic instead:
WALLET_MNEMONIC=your twelve word mnemonic...   # BIP39 mnemonic to derive master key

# Optional
WALLET_NETWORK=testnet                         # Network ID (testnet/mainnet)
MCP_MODE=stdio                                 # Transport mode (stdio/http)
MCP_PORT=3000                                  # HTTP port (when MODE=http)
```

---

## Next Steps

**Ready to start Phase 1:** Extract shared infrastructure to prepare for wallet server implementation.

Proceeding with fast, iterative implementation in this order:
1. Phase 1.1-1.2: Shared infrastructure (4-6 hours)
2. Phase 3.1-3.2: Wallet server scaffold (2-3 hours)
3. Phase 3.5: DID client (3-4 hours)
4. Phase 3.6: Credential client (4-5 hours)
5. Phase 3.7: Message client (3-4 hours)
6. Testing & iteration


TODO:
* Persistent wallet storage - currently only in memory so is wiped whenever you restart the server