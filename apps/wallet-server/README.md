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
| MCP server transport (stdio/http) | ✅ Implemented |
| Wallet SDK integration | ✅ Direct SDK integration (core + data-store packages) |
| DID management tools | ✅ Implemented (`get_default_did`, `create_did`, `list_dids`) |
| Credential management | ✅ Implemented (`list_credentials`, `get_credential`, `import_credential`, `respond_to_proof_request`) |
| DIDComm messaging | ✅ Implemented (`fetch_messages`, `send_message`) |
| Agent Card (A2A identity) | ✅ Implemented (`get_agent_card_details`) |
| SQLite persistence | ✅ Implemented (via `WALLET_DB_PATH`) |
| Docker support | ✅ Included (`docker:build` / `docker:run` scripts + Dockerfile) |
| Tests | ⏳ Minimal |
| Production hardening | ⏳ Not yet |

### Known limitations

- **No cloud sync:** The wallet uses a local SQLite database. Credentials and DIDs are not automatically synced to a cloud EDV.
- **Production hardening pending:** Key management, backup strategies, and multi-user isolation are not yet implemented.

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

# Start the container in HTTP mode.
# Uses host port 3001 by default, and automatically falls back to the next
# available host port if 3001 is already in use.
# Optional override: WALLET_HOST_PORT=3010 npm run docker:run:wallet
npm run docker:run:wallet
```

Or from this directory:

```bash
docker-compose up -d
```

### 6. Verify the server is running

```bash
curl http://localhost:<printed-port>/health
```

`npm run docker:run:wallet` prints the host port it selected.

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
| `MCP_JWT_PUBLIC_KEY` | In HTTP mode | — | ES256 public key (PEM) for verifying tenant JWTs. Required when `MCP_AUTH_MODE=jwt`. |
| `MCP_MASTER_SECRET` | In HTTP mode | — | Secret used to derive per-tenant wallet encryption keys via HMAC-SHA256. Required when `MCP_AUTH_MODE=jwt`. |
| `MCP_AUTH_MODE` | No | `none` | Auth mode: `jwt` (require signed tokens) or `none` (no auth, local dev only). |

---

## Authentication (ECS / remote deployments)

In HTTP mode, the server supports JWT-based multi-tenant auth. Each tenant gets an isolated wallet, identified by the `sub` claim of their JWT.

### How it works

- The server holds a **public key** (`MCP_JWT_PUBLIC_KEY`) and a **master secret** (`MCP_MASTER_SECRET`).
- The admin holds the corresponding **private key** in AWS Secrets Manager.
- Each tenant authenticates with a signed JWT as a Bearer token: `Authorization: Bearer <jwt>`.
- The server derives the tenant's wallet path (`/data/wallets/<sub>`) and wallet encryption key (`HMAC-SHA256(masterSecret, sub)`) from the JWT `sub` claim.
- Adding a new tenant requires no server redeployment — just mint them a JWT.

### One-time setup: generate a keypair

```bash
node scripts/generate-keypair.js
```

This outputs two PEM blocks:
- **Private key** — store in AWS Secrets Manager (e.g. `prod/wallet-server/jwt-private-key`). Never commit it.
- **Public key** — set as `MCP_JWT_PUBLIC_KEY` in the ECS task definition.

### Mint a JWT for a new tenant

```bash
node scripts/mint-jwt.js <tenantId> --secret <secretManagerId> [--profile <awsProfile>] [--expires-in <duration>]
```

| Argument | Description |
|----------|-------------|
| `<tenantId>` | Unique identifier for the tenant (e.g. `alice`). Becomes the wallet path `/data/wallets/alice`. |
| `--secret` | AWS Secrets Manager secret name or ARN containing the private key PEM. Defaults to `MCP_JWT_PRIVATE_KEY_SECRET` env var. |
| `--profile` | AWS profile to use (e.g. `dev`, `prod`). Defaults to `AWS_PROFILE` env var or the default profile. |
| `--expires-in` | Token lifetime (e.g. `30d`, `90d`, `1y`). Default: `1y`. |

**Examples:**

```bash
# Mint a 90-day token for "alice" using the prod AWS profile
node scripts/mint-jwt.js alice \
  --secret prod/wallet-server/jwt-private-key \
  --profile prod \
  --expires-in 90d

# Using npm script shorthand (prompts for args)
npm run admin:mint-jwt -- alice --secret dev/wallet-server/jwt-private-key --profile dev
```

The token is printed to stdout — send it to the tenant to use as their Bearer token.

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

## Available tools

| Tool | Description |
|------|-------------|
| `get_default_did` | Get the default DID for this wallet |
| `create_did` | Create a new DID in the wallet |
| `list_dids` | List all DIDs in the wallet |
| `list_credentials` | List all credentials stored in the wallet |
| `get_credential` | Get a credential by ID |
| `import_credential` | Import a verifiable credential into the wallet |
| `respond_to_proof_request` | Respond to a DIDComm proof request using stored credentials |
| `fetch_messages` | Fetch and decrypt pending DIDComm messages from the relay |
| `send_message` | Send a DIDComm message to a recipient DID |
| `get_agent_card_details` | Return this wallet server's A2A identity (holder DID, skills) |

## Code structure

```
apps/wallet-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── wallet-client.ts      # Wallet SDK wrapper (TypeORM + SQLite)
│   └── features/
│       ├── dids/             # DID management tools
│       ├── credentials/      # Credential tools
│       ├── messages/         # DIDComm messaging tools
│       └── agent-card/       # A2A identity tools
├── package.json
├── tsconfig.json
└── README.md
```
