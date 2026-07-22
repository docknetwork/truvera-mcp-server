# Wallet MCP Server

A Model Context Protocol (MCP) server for interacting with the Truvera Wallet SDK using direct core/data-store packages (`@docknetwork/wallet-sdk-core` + `@docknetwork/wallet-sdk-data-store-typeorm`, backed by SQLite). It allows AI assistants to manage DIDs, hold credentials, and support DIDComm messaging via a local wallet.

## Current state

| Area | Status |
|------|--------|
| MCP server transport (stdio/http) | ✅ Implemented |
| Wallet SDK integration | ✅ Direct SDK integration (core + data-store packages) |
| DID management tools | ✅ Implemented (`get_default_did`, `create_did`, `list_dids`) |
| Credential management | ✅ Implemented (`list_credentials`, `get_credential`, `import_credential`, `remove_credential`, `respond_to_proof_request`) |
| DIDComm messaging | ✅ Implemented (`fetch_messages`, `send_message`) |
| Delegation | ✅ Implemented (`create_delegation_offer`, `accept_delegation_offer`, `handle_delegation_message`, `list_delegation_offers`, `get_delegation_details`) |
| Agent Card (A2A identity) | ✅ Implemented (`get_agent_card_details`) |
| SQLite persistence | ✅ Implemented (via `WALLET_DB_PATH`, or per-tenant under `WALLET_DB_BASE_PATH` in JWT auth mode) |
| Multi-tenant JWT auth | ✅ Implemented (`MCP_AUTH_MODE=jwt`) — see [Authentication](#authentication-ecs--remote-deployments) below |
| Docker support | ✅ Included (`docker:build` / `docker:run` scripts + Dockerfile) |
| Tests | ✅ Unit, integration, and e2e coverage across all features |
| Production hardening | ⏳ Ongoing — see Known limitations |

### Known limitations

- **No cloud sync:** The wallet uses a local SQLite database. Credentials and DIDs are not automatically synced to a cloud EDV.
- **No encryption at rest yet:** `WALLET_MASTER_KEY` is checked at startup but not currently wired into the SQLite data store — the wallet database is not encrypted at rest. Tenant isolation in JWT mode is filesystem-path-only (separate SQLite files per tenant), not key-based.
- **Production hardening pending:** Key management, backup strategies, and full multi-user isolation are not yet implemented.

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
| `WALLET_MASTER_KEY` | Yes | — | Reserved for a future wallet encryption key. Currently checked at startup (a warning is logged if unset) but not yet wired into the data store — see [Known limitations](#known-limitations). |
| `MCP_MODE` | No | `stdio` | Transport: `http` or `stdio` |
| `MCP_PORT` | No | `3001` | HTTP port (only used when `MCP_MODE=http`) |
| `CHEQD_NETWORK` | No | `testnet` | Cheqd network: `testnet` or `mainnet` |
| `WALLET_NAME` | No | `mcp-wallet` | Wallet label |
| `WALLET_DB_PATH` | No | `/data/wallet-db` | SQLite database path. Used directly in `MCP_AUTH_MODE=none`; ignored in `jwt` mode (see `WALLET_DB_BASE_PATH`). |
| `WALLET_DB_BASE_PATH` | No | `/data/wallets` | Base directory for per-tenant SQLite databases. Only used when `MCP_AUTH_MODE=jwt` — each tenant gets `<WALLET_DB_BASE_PATH>/<jwt-sub>`. |
| `MCP_AUTH_MODE` | No | `none` | Auth mode: `jwt` (require signed tokens, multi-tenant) or `none` (no auth, single shared wallet — local dev or single-user deployments). |
| `MCP_JWT_PUBLIC_KEY` | When `MCP_AUTH_MODE=jwt` | — | ES256 public key (PEM) for verifying tenant JWTs. |
| `WALLET_REVOCATIONS_DB_PATH` | No | `/data/revocations.db` | SQLite file tracking per-tenant revocation cutoffs. Only used when `MCP_AUTH_MODE=jwt`. Separate from any tenant's own wallet database. |
| `ADMIN_REVOKE_SECRET` | No (but required to revoke) | — | Shared secret for `POST /admin/revoke-tenant`. Only relevant when `MCP_AUTH_MODE=jwt` and `MCP_MODE=http`; without it the route is disabled and tenants can't be revoked before their JWT expires. |

---

## Authentication (ECS / remote deployments)

In HTTP mode, the server supports JWT-based multi-tenant auth. Each tenant gets an isolated wallet, identified by the `sub` claim of their JWT.

### How it works

- The server holds a **public key** (`MCP_JWT_PUBLIC_KEY`).
- The admin holds the corresponding **private key** in AWS Secrets Manager.
- Each tenant authenticates with a signed JWT as a Bearer token: `Authorization: Bearer <jwt>`.
- The server derives the tenant's wallet path (`<WALLET_DB_BASE_PATH>/<sub>`) from the JWT `sub` claim, giving each tenant their own isolated SQLite database.
- Adding a new tenant requires no server redeployment — just mint them a JWT.

**Note on encryption:** tenant isolation here is filesystem-path-only — each tenant gets a separate SQLite file, but none of them are currently encrypted (see [Known limitations](#known-limitations)). `@truvera/mcp-shared/auth` exports a `deriveWalletKey()` HMAC helper intended for per-tenant key derivation, but the wallet server doesn't call it yet. Anyone with filesystem access to the `/data/wallets` volume can read any tenant's wallet database directly.

### One-time setup: generate a keypair

```bash
node scripts/generate-keypair.js
```

This outputs two PEM blocks:
- **Private key** — store in AWS Secrets Manager (e.g. `prod/wallet-server/jwt-private-key`). Never commit it.
- **Public key** — set as `MCP_JWT_PUBLIC_KEY` in the ECS task definition.

### Mint a JWT for a new tenant

```bash
node scripts/mint-jwt.js <tenantId> --secret <secretManagerId> [--profile <awsProfile>] [--region <region>] [--expires-in <duration>]
```

| Argument | Description |
|----------|-------------|
| `<tenantId>` | Unique identifier for the tenant (e.g. `alice`). Becomes the wallet path `/data/wallets/alice`. |
| `--secret` | AWS Secrets Manager secret name or ARN containing the private key PEM. Defaults to `MCP_JWT_PRIVATE_KEY_SECRET` env var. |
| `--profile` | AWS profile to use (e.g. `dev`, `prod`). Defaults to `AWS_PROFILE` env var or the default profile. |
| `--region` | AWS region (e.g. `us-east-1`). Defaults to `AWS_REGION` env var. |
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

### Revoke a tenant

JWTs are otherwise valid until they expire — there's no built-in per-token blacklist. Instead, revocation moves a per-tenant cutoff timestamp forward: any JWT whose `iat` predates the cutoff is rejected, even if unexpired. Tokens minted for that tenant *after* the revocation call remain valid.

Requires `ADMIN_REVOKE_SECRET` to be set on the server (see [Environment variables](#environment-variables)).

```bash
node scripts/revoke-tenant.js <tenantId> --url <serverBaseUrl> [--secret <adminSecret>]
```

| Argument | Description |
|----------|-------------|
| `<tenantId>` | Tenant to revoke (the JWT `sub` claim, e.g. `alice`). |
| `--url` | Base URL of the running wallet-server, e.g. `https://wallet-staging.truvera.io`. Defaults to `WALLET_SERVER_URL` env var. |
| `--secret` | Admin secret for `POST /admin/revoke-tenant`. Defaults to `ADMIN_REVOKE_SECRET` env var. |

**Example:**

```bash
node scripts/revoke-tenant.js alice --url https://wallet-staging.truvera.io --secret $ADMIN_REVOKE_SECRET

# Using npm script shorthand
npm run admin:revoke-tenant -- alice --url https://wallet-staging.truvera.io --secret $ADMIN_REVOKE_SECRET
```

Unlike minting, this calls the running server directly — the revocation cutoff lives in a SQLite file (`WALLET_REVOCATIONS_DB_PATH`) on the server's own persistent volume, not something a local script can write to out-of-band.

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
| `remove_credential` | Remove a credential from the wallet |
| `respond_to_proof_request` | Respond to a DIDComm proof request using stored credentials |
| `fetch_messages` | Fetch and decrypt pending DIDComm messages from the relay |
| `send_message` | Send a DIDComm message to a recipient DID |
| `create_delegation_offer` | Create an offer delegating authority to another agent |
| `accept_delegation_offer` | Accept a received delegation offer |
| `handle_delegation_message` | Process an incoming delegation-related DIDComm message |
| `list_delegation_offers` | List delegation offers sent or received |
| `get_delegation_details` | Get details of a specific delegation |
| `get_agent_card_details` | Return this wallet server's A2A identity (holder DID, skills) |

## Code structure

```
apps/wallet-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── wallet-client.ts      # Wallet SDK wrapper (TypeORM + SQLite)
│   ├── wallet-client-pool.ts # Manages one WalletClient per tenant (JWT mode) or a single shared one
│   └── features/
│       ├── dids/             # DID management tools
│       ├── credentials/      # Credential tools
│       ├── messages/         # DIDComm messaging tools
│       ├── delegation/       # Delegation offer/acceptance tools
│       └── agent-card/       # A2A identity tools
├── package.json
├── tsconfig.json
└── README.md
```
