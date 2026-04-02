# Wallet MCP Server

> ## 🚧 Work in Progress — Not Ready for Use
>
> This server is under active development and is **not production-ready**. APIs, tool names, and environment variables may change without notice. Do not rely on this server for anything beyond experimentation.
>
> For a fully functional MCP server, use [`apps/truvera-api`](../truvera-api/README.md).

---

A Model Context Protocol (MCP) server for interacting with the Truvera Wallet SDK (`@docknetwork/wallet-sdk-web`). When complete, it will allow AI assistants to manage DIDs, hold credentials, and support DIDComm messaging via a local wallet.

## Current state

| Area | Status |
|------|--------|
| MCP server transport (stdio/http) | ✅ Scaffolded |
| Wallet SDK integration | ✅ Basic integration (`@docknetwork/wallet-sdk-web` v0.0.10) |
| DID management tools | ✅ Implemented (`get_default_did`, `create_did`, `list_dids`) |
| Credential management | ⏳ Planned |
| DIDComm messaging | ⏳ Planned |
| Tests | ⏳ Minimal |
| Docker support | ⏳ Not yet |
| Production hardening | ⏳ Not yet |

### Known limitations

- **Browser SDK in Node.js:** `@docknetwork/wallet-sdk-web` is designed for browsers. We use polyfills ([src/polyfills.ts](src/polyfills.ts)) to shim browser globals (`window`, `self`, `document`, `localStorage`). This is not suitable for production.
- **No Docker image:** There is no Dockerfile yet. The server can only be run locally via Node.js.
- **No CI coverage:** The wallet-server is not yet included in automated CI tests.

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

### 4. Run

```bash
# HTTP mode
MCP_MODE=http npm start

# STDIO mode
MCP_MODE=stdio npm start

# Development mode with hot-reload
npm run dev
```

### MCP Inspector (shared docs)

Use the shared MCP Inspector instructions in the repo root README:

- See [../../README.md#mcp-inspector-shared-for-all-servers](../../README.md#mcp-inspector-shared-for-all-servers)

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WALLET_MASTER_KEY` | Yes | — | Master encryption key for the wallet |
| `MCP_MODE` | No | `stdio` | Transport: `http` or `stdio` |
| `MCP_PORT` | No | `3010` | HTTP port (only used when `MCP_MODE=http`) |
| `CHEQD_NETWORK` | No | `testnet` | Cheqd network: `testnet` or `mainnet` |
| `EDV_STORAGE_URL` | No | `https://edv.dock.io` | EDV cloud storage endpoint |
| `WALLET_NAME` | No | `mcp-wallet` | Wallet label |

---

## Planned architecture

See [WALLET_MCP_PLAN.md](../../WALLET_MCP_PLAN.md) at the repo root for the full development plan.

```
apps/wallet-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── polyfills.ts          # Browser environment shims for Node.js
│   ├── wallet-client.ts      # Wallet SDK wrapper
│   └── features/
│       ├── dids/             # DID management tools
│       └── credentials/      # Credential tools (planned)
├── package.json
├── tsconfig.json
└── README.md
```
