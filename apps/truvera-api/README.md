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
# Expected: {"status":"ok","service":"truvera-mcp-service","toolCount":31,...}
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

The server must be running in HTTP mode on port 3000 before connecting.

### Claude Desktop

Add to your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "truvera": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/mcp", "--insecure"]
    }
  }
}
```

Restart Claude Desktop. The Truvera tools will appear in the tool picker.

### GitHub Copilot in VS Code

The workspace `.vscode/mcp.json` is already configured. Start the server, then:

1. Open the Copilot chat pane.
2. Click the **Configure tools...** icon.
3. Click **Update tools** under `truvera-mcp-service-vs-code`.
4. Enable the tools you want and click **OK**.

### MCP Inspector (shared docs)

- See [../../README.md#mcp-inspector-shared-for-all-servers](../../README.md#mcp-inspector-shared-for-all-servers)

---

## Environment variables

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRUVERA_API_KEY` | **Yes** | — | Truvera API authentication key |
| `TRUVERA_API_ENDPOINT` | No | `https://api.truvera.com` | API base URL. Use `https://api-testnet.truvera.io` for testnet |
| `MCP_MODE` | No | `stdio` | Transport mode: `http` (recommended) or `stdio` (experimental) |
| `MCP_PORT` | No | `3000` | HTTP server port (only used when `MCP_MODE=http`) |

### AP2 (Agent Payments Protocol)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AP2_ENABLED` | No | `true` | Set to `false` to disable all AP2 tools |
| `AP2_DEFAULT_TTL_SECONDS` | No | `3600` | Default time-to-live for Intent Mandates |
| `AP2_CART_MANDATE_SCHEMA_URL` | No | *(see .env.example)* | JSON-LD schema URL for Cart Mandates |
| `AP2_INTENT_MANDATE_SCHEMA_URL` | No | *(see .env.example)* | JSON-LD schema URL for Intent Mandates |
| `AP2_PAYMENT_MANDATE_SCHEMA_URL` | No | *(see .env.example)* | JSON-LD schema URL for Payment Mandates |

> **Note:** As of March 2026, AP2 JSON-LD schemas are not yet published at the URLs above. The server handles this gracefully — schema URLs are passed to the Truvera API for future compatibility but fetch failures are non-blocking and do not affect tool functionality.

---

## Supported tools

The server exposes 31 tools across these areas:

### Truvera API tools
- **Credentials** — issue, list, get, delete
- **DIDs** — create, list, get, delete, export, import
- **Presentations** — create, list, get, delete
- **Schemas** — list, get
- **Profiles** — create, update, get, delete, list
- **Verification** — verify credentials and presentations
- **OpenID** — credential offers and proof requests

### AP2 (Agent Payments Protocol) tools
- `issue_cart_mandate` — issue a Cart Mandate for human-present transactions
- `issue_intent_mandate` — issue an Intent Mandate for human-not-present transactions
- `issue_payment_mandate` — issue a Payment Mandate for payment network visibility
- `verify_mandate` — verify any AP2 mandate credential

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

