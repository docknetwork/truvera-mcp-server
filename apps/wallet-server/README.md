# Wallet MCP Server

> ## 🚧 Work in Progress — Not Ready for Use
>
> This server is under active development and is **not production-ready**. APIs, tool names, and environment variables may change without notice. Do not rely on this server for anything beyond experimentation.
>
> For a fully functional MCP server, use [`apps/truvera-api`](../truvera-api/README.md).

---

A Model Context Protocol (MCP) server for interacting with the Truvera Wallet SDK using direct core/data-store packages (`@docknetwork/wallet-sdk-core` + `@docknetwork/wallet-sdk-data-store-web`). When complete, it will allow AI assistants to manage DIDs, hold credentials, and support DIDComm messaging via a local wallet.

## Current state

| Area | Status |
|------|--------|
| MCP server transport (stdio/http) | ✅ Scaffolded |
| Wallet SDK integration | ✅ Direct SDK integration (core + data-store packages) |
| DID management tools | ✅ Implemented (`get_default_did`, `create_did`, `list_dids`) |
| Credential management | ⏳ Planned |
| DIDComm messaging | ⏳ Planned |
| Tests | ⏳ Minimal |
| Docker support | ✅ Included |
| Production hardening | ⏳ Not yet |

### Known limitations

- **In-memory storage only:** The current wallet-server wiring uses in-memory local storage adapters. This is suitable for development and tests, but persistence and cloud sync hardening are still pending.
- **Local-only wallet state:** Containerized runs are useful for MCP integration testing, but the wallet still uses in-memory backing stores today.

---

## Development setup

If you want to work on this server, here is how to get it running locally.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum, set WALLET_MASTER_KEY
```

### 3. Build

```bash
npm run build
```

From the repo root you can also use:

```bash
npm run build:wallet
```

### 4. Run

```bash
# HTTP mode
MCP_MODE=http npm start

# STDIO mode
MCP_MODE=stdio npm start

# Development mode with hot-reload
npm run dev
```

From the repo root:

```bash
npm run dev:wallet
```

### 5. Docker workflow

From the repo root:

```bash
# Build the image
npm run docker:build:wallet

# Start the container in HTTP mode on port 3001
npm run docker:run:wallet
```

Or from this directory:

```bash
docker-compose up -d
```

### 6. Verify the server is running

```bash
curl http://localhost:3001/health
```

If port 3001 is already in use and you start the server from an interactive terminal, the server now prompts to continue on the next available port instead of exiting immediately.

### MCP Inspector (shared docs)

Use the shared MCP Inspector instructions in the repo root README:

- See [../../README.md#mcp-inspector-shared-for-all-servers](../../README.md#mcp-inspector-shared-for-all-servers)

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WALLET_MASTER_KEY` | Yes | — | Master encryption key for the wallet |
| `MCP_MODE` | No | `stdio` | Transport: `http` or `stdio` |
| `MCP_PORT` | No | `3001` | HTTP port (only used when `MCP_MODE=http`) |
| `CHEQD_NETWORK` | No | `testnet` | Cheqd network: `testnet` or `mainnet` |
| `EDV_STORAGE_URL` | No | `https://edv.dock.io` | EDV cloud storage endpoint |
| `WALLET_NAME` | No | `mcp-wallet` | Wallet label |

---

## Running tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Type checking only
npm run typecheck
```

## Planned architecture

See [WALLET_MCP_PLAN.md](../../WALLET_MCP_PLAN.md) at the repo root for the full development plan.

```
apps/wallet-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── wallet-client.ts      # Wallet SDK wrapper
│   └── features/
│       ├── dids/             # DID management tools
│       └── credentials/      # Credential tools (planned)
├── package.json
├── tsconfig.json
└── README.md
```
