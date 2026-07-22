# Truvera MCP Server

[![CI](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server that exposes [Truvera API](https://truvera.io) functionality as tools for AI assistants (Claude, GitHub Copilot, etc.). Built with TypeScript/Node.js and Docker.

## Transport modes

> **HTTP transport is recommended.** It is well-tested and works reliably with Claude Desktop, VS Code Copilot, and the MCP Inspector.
>
> **STDIO transport is experimental.** It has limited test coverage. Use it only if your MCP client requires a process-based connection and you are comfortable with potential rough edges.

## Quickstart

**Requirements:** Node.js 18+, Docker, a Truvera API key ([sign up at truvera.io](https://truvera.io))

### Step 1 — Configure your API key

```bash
cp .env.example .env
# Open .env and set TRUVERA_API_KEY=<your key>
```

The `.env.example` defaults to the testnet endpoint (`https://api-testnet.truvera.io`). Change `TRUVERA_API_ENDPOINT` to `https://api.truvera.com` for production.

> **Note:** in HTTP mode (the recommended mode), `TRUVERA_API_KEY` is optional — it's only used as a fallback for clients that don't send their own `Authorization: Bearer <key>` header. Set it if you want a single shared key for every client; leave it blank if each client should authenticate with its own key. See [Connecting to AI Assistants](../../README.md#connecting-to-ai-assistants) for both options. It's mandatory only in STDIO mode.

### Step 2 — Install dependencies

From the repo root (or this directory):

```bash
npm install
```

### Step 3 — Build and run with Docker (recommended)

From the **repo root**:

```bash
# Build the image
npm run docker:build:api

# Start the container in HTTP mode on port 3000
npm run docker:run:api
```

Or from this directory using Docker Compose:

```bash
docker-compose up -d
```

### Step 4 — Verify the server is running

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"truvera-mcp-service","toolCount":33,...} (31 core tools + 2 AP2 tools, enabled by default)
```

The server is ready. Jump to [Connecting to AI Assistants](#connecting-to-ai-assistants) to wire it up.

---

## Run in development mode (without Docker)

Use this when iterating on code. Changes are picked up automatically.

```bash
# HTTP mode (recommended)
MCP_MODE=http npm run dev

# Verify
curl http://localhost:3000/health
```

To run in STDIO mode (experimental — for clients that require it):

```bash
MCP_MODE=stdio npm run dev
# The server reads/writes JSON-RPC over stdin/stdout — no HTTP endpoint is exposed
```

---

## Connecting to AI Assistants

The server must be running in HTTP mode on port 3000 before connecting. Full connection instructions for Claude Desktop, VS Code (Copilot), and Cursor are in the [repo root README](../../README.md#connecting-to-ai-assistants).

### MCP Inspector (shared docs)

- See [../../README.md#mcp-inspector-shared-for-all-servers](../../README.md#mcp-inspector-shared-for-all-servers)

---

## Environment variables

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRUVERA_API_KEY` | In STDIO mode | — | Truvera API authentication key. In HTTP mode this is optional and only used as a fallback for clients that don't send their own `Authorization: Bearer <key>` header. |
| `TRUVERA_API_ENDPOINT` | No | `https://api.truvera.com` | API base URL. Use `https://api-testnet.truvera.io` for testnet |
| `MCP_MODE` | No | `stdio` | Transport mode: `http` (recommended) or `stdio` (experimental) |
| `MCP_PORT` | No | `3000` | HTTP server port (only used when `MCP_MODE=http`) |

### AP2 (Agent Payments Protocol)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AP2_ENABLED` | No | `true` | Set to `false` to disable AP2 tools |

Mandate issuance (Open/Closed Checkout and Payment Mandates) lives in
`wallet-server`, not here — see its README. `truvera-api` plays the AP2
spec's Credential Provider role: verifying Closed Payment Mandates and
issuing Payment Receipts.

---

## Supported tools

The server exposes 33 tools by default: 31 core tools plus 2 AP2 tools (AP2 is enabled by default; set `AP2_ENABLED=false` to drop to 31).

### Truvera API tools
- **Credentials** — `issue_credential`, `list_credentials`, `get_credential`, `delete_credential`
- **DIDs** — `create_did`, `list_dids`, `get_did`, `delete_did`, `export_did`, `import_dids`
- **Proof Templates & Requests** — `list_proof_templates`, `create_proof_template`, `get_proof_template`, `create_proof_request`, `get_proof_request_result`
- **Schemas** — `list_schemas`, `get_schema`
- **Profiles** — `create_profile`, `list_profiles`, `get_profile`, `update_profile`, `delete_profile`
- **Verification** — `verify` (credentials, presentations, JWTs)
- **OpenID** — `list_issuers`, `create_issuer`, `create_credential_offer`, `get_credential_offer`
- **Delegation** — `list_delegation_rules`, `get_delegation_rule`, `revoke_delegatable_credential`
- **Agent Card** — `get_agent_card_details` (returns this server's A2A identity contribution)

### AP2 (Agent Payments Protocol) tools — Credential Provider role
- `verify_payment_mandate` — verify a Closed Payment Mandate (and optionally its paired Closed Checkout Mandate)
- `issue_payment_token` — verify a Closed Payment Mandate and return an AP2 Payment Receipt

Mandate issuance tools (`create_ap2_signing_key`, `issue_open_checkout_mandate`,
`issue_closed_checkout_mandate`, `issue_open_payment_mandate`,
`issue_closed_payment_mandate`) live in `wallet-server`, which holds the
signing keys — mandates are self-signed by the user/Shopping Agent, not
issued by Truvera.

See [src/features/ap2/README.md](src/features/ap2/README.md) for full AP2 documentation.

To see the complete live tool list, call the health endpoint:

```bash
curl http://localhost:3000/health
```

---

## Running tests

```bash
# Unit and integration tests (no API key required)
npm test

# E2E test — builds Docker image and tests the full MCP HTTP protocol
npm run e2e

# Live integration tests against the real Truvera API (requires API key)
TRUVERA_RUN_LIVE_TESTS=true npm test

# Type checking only
npm run typecheck
```

---

## Code structure

```
src/
├── index.ts                    # Entry point — reads env, wires up tools, starts server
├── clients/truvera.ts          # Low-level authenticated HTTP client
├── tools/composeTools.ts       # Merges all feature tool definitions into the MCP tools list
└── features/
    ├── credentials/            # Issue, list, get, delete credentials
    ├── dids/                   # DID management
    ├── presentations/          # Presentation management
    ├── schemas/                # Schema lookup
    ├── profiles/               # Profile management
    ├── verify/                 # Verification
    ├── openid/                 # OpenID credential flows
    ├── ap2/                    # AP2 mandate tools
    ├── delegation/             # Delegation rule management
    ├── agent-card/             # A2A identity endpoint
    └── shared/                 # Common types (VC format, DID types, errors)
```

Each feature folder follows the same pattern:
- `client.ts` — wraps `TruveraClient` with feature-specific API calls
- `tools.ts` — exports `toolDefs` (metadata) and `getHandlers(client)` (implementation)
- `schemas.ts` — JSON Schema for tool inputs
- `types.ts` — TypeScript interfaces
- `tests/` — unit, integration, and e2e tests

To add a new feature, create the folder, implement the pattern, and import the feature in `src/tools/composeTools.ts`.

---

## Security and production notes

- Treat `TRUVERA_API_KEY` as a secret — never commit it to source control.
- Use HTTPS and a secrets manager in production environments.
- The Docker image runs as a non-root user.
- If you set `TRUVERA_API_KEY` in a multi-user deployment, remember it becomes a **shared fallback key** — anyone who can reach the server without sending their own Authorization header will act as that account. For per-user attribution or a multi-tenant deployment, leave it unset and require each client to send its own key.

