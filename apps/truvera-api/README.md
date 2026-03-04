# Truvera MCP Server

[![CI](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server that exposes Truvera API functionality as MCP tools. Built with TypeScript/Node.js and designed for development with Docker.

## What this repository contains

- A small, **feature-based** layout where each API area lives under `src/features/<feature>/` and exports a client, `toolDefs`, and `getHandlers`.
- `src/clients/truvera.ts` — the low-level authenticated HTTP client used by features.
- `src/tools/composeTools.ts` — composes tool definitions and handlers from feature modules and is the source of the MCP tools list.
- An MCP server (`src/index.ts`) exposing tools via stdio (default) or HTTP (SSE) transport.

## Environment variables

### Core Configuration

- `TRUVERA_API_KEY` (required): Truvera API key
- `TRUVERA_API_ENDPOINT` (optional): Base API URL (default: `https://api.truvera.com`)
  - For testnet: `https://api-testnet.truvera.io`
- `MCP_MODE` (optional): `stdio` or `http` (default `stdio`)
- `MCP_PORT` (optional): HTTP port (default `3000` when `MCP_MODE=http`)

### AP2 (Agent Payments Protocol) Configuration

The server includes support for AP2 mandate issuance and verification. See [src/features/ap2/README.md](src/features/ap2/README.md) for detailed documentation.

- `AP2_ENABLED` (optional): Enable/disable AP2 support (default: `true`)
- `AP2_DEFAULT_TTL_SECONDS` (optional): Default time-to-live for Intent Mandates (default: `3600`)
- `AP2_CART_MANDATE_SCHEMA_URL` (optional): JSON-LD schema URL for Cart Mandates (placeholder - not yet published)
- `AP2_INTENT_MANDATE_SCHEMA_URL` (optional): JSON-LD schema URL for Intent Mandates (placeholder - not yet published)
- `AP2_PAYMENT_MANDATE_SCHEMA_URL` (optional): JSON-LD schema URL for Payment Mandates (placeholder - not yet published)

**Note**: As of March 2026, the AP2 protocol does not publish JSON-LD schemas at the URLs above. The system handles this gracefully - schema URLs are passed to Truvera's credential API for future compatibility but fetch failures are non-blocking.

**AP2 Features:**
- **Cart Mandate**: Issue mandates for human-present payment authorization with exact cart details
- **Intent Mandate**: Issue mandates for human-not-present purchases with constraints (budget, products, TTL)
- **Payment Mandate**: Issue mandates for payment network visibility into agent transactions
- **Verification**: Verify any AP2 mandate credential

AP2 mandates are issued as Verifiable Credentials via the Truvera API and can be stored/presented using the wallet-server.

## Quickstart

1) Set up environment variables

Copy the example environment file and configure your API key:

```bash
cp .env.example .env
# Edit .env and set your TRUVERA_API_KEY
```

2) Install dependencies

```bash
npm install
```

3) Development (stdio mode)

```bash
# run with hot-reload (tsx)
npm run dev
```

4) Build & run

```bash
npm run build
npm start
```

Notes:
- `MCP_MODE` selects the transport: `stdio` (default) or `http`.
- For HTTP mode set `MCP_MODE=http` and optionally `MCP_PORT` (default 3000).
- HTTP mode uses HTTP streaming transport (replaces deprecated SSE).

## Running in Docker

### Using Docker Compose (Recommended)

1) Create a `.env` file with your API key:

```bash
cp .env.example .env
# Edit .env and set your TRUVERA_API_KEY
```

2) Start the service:

```bash
docker-compose up -d
```

3) View logs:

```bash
docker-compose logs -f
```

4) Stop the service:

```bash
docker-compose down
```

### Using Docker directly

Build image:

```bash
docker build -t truvera-mcp-service:latest .
```

Run container (stdio mode):

```bash
docker run -e TRUVERA_API_KEY=your-api-key truvera-mcp-service:latest
```

Run in HTTP mode:

```bash
docker run -e TRUVERA_API_KEY=your-api-key -e MCP_MODE=http -e MCP_PORT=3000 -p 3000:3000 truvera-mcp-service:latest
```

### Health check (HTTP mode):

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"truvera-mcp-service"}
```

### MCP HTTP Streaming endpoint:

The MCP server uses HTTP streaming transport in HTTP mode:

```bash
# Connect to the MCP endpoint via mcp-remote
npx mcp-remote http://localhost:3000/mcp --insecure
```

## How tools are organized

- Each tool's code is located in a sub-folder under ./src/features.
- Each feature exports `toolDefs` (tool metadata) and `getHandlers(truveraClient)` which returns a map of tool handlers.
- `src/tools/composeTools.ts` imports those `toolDefs` and `getHandlers` and merges them into the global tools list and handlers map exposed by the MCP server.

To see available tools at runtime, call the `ListTools` endpoint (MCP ListToolsRequest) — the server returns the merged tool definitions.

## Supported Tools

The server exposes Truvera API functionality plus AP2 (Agent Payments Protocol) mandate tools:

### Truvera API Tools
- Credential operations (issue, list, get, delete)
- DID operations (create, list, get, delete)
- Presentation operations (create, list, get, delete)
- Schema operations (list, get)
- Profile operations (create, update, get, delete, list)
- Verification operations

### AP2 Payment Protocol Tools
- `issue_cart_mandate`: Issue Cart Mandate for human-present transactions
- `issue_intent_mandate`: Issue Intent Mandate for human-not-present transactions
- `issue_payment_mandate`: Issue Payment Mandate for network visibility
- `verify_mandate`: Verify AP2 mandate credentials

For complete AP2 documentation including types, examples, and usage, see [src/features/ap2/README.md](src/features/ap2/README.md).

Not all Truvera API endpoints are exposed via the MCP server. The supported tool names and input schemas are provided in the tool listing returned by the server.

## Development tips

- Add a new feature:
  1. Create `src/features/<feature>/client.ts` that uses `TruveraClient` and implements API operations.
  2. Create `src/features/<feature>/tools.ts` exporting `toolDefs` and `getHandlers`.
  3. Add an `index.ts` in the feature folder that re-exports client and tools.
  4. Import the feature in `src/tools/composeTools.ts` (or add it to the feature list there).

- Keep feature surface small: export only what other code needs (client class and `toolDefs`/`getHandlers`).
- Use dependency injection: pass a `TruveraClient` instance into feature clients to make testing easier.

## Tests & Type Checking

- TypeScript check:

```bash
npm run typecheck
```

- Build:

```bash
npm run build
```

## Developer Testing
Test with Claude Desktop or using The MCP Inspector

### Claude Desktop
Configure the MCP server in the Claude `claude_desktop_config.json` file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Make sure the server is running in HTTP mode first:

```bash
# Terminal 1: Start the server
MCP_MODE=http npm run dev

# Terminal 2: Verify it's running
curl http://localhost:3000/health
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "truvera-mcp-service": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/mcp",
        "--insecure"
      ]
    }
  }
}
```

### VS Code Copilot

1. Make sure the server is running in HTTP mode:

```bash
MCP_MODE=http npm run dev
```

2. The VS Code MCP configuration is already set up in [.vscode/mcp.json](./.vscode/mcp.json)
3. Click the `Configure tools...` icon in the Copilot chat pane.
4. Click `Update tools` under the `truvera-mcp-service-vs-code` MCP server.
5. Click the checkbox beside the tools you want to enable.
6. Click `OK`

The configuration in `.vscode/mcp.json`:

```json
{
  "servers": {
    "truvera-mcp-service-vs-code": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3000/mcp",
        "--insecure"
      ]
    }
  }
}
```

### MCP Inspector
The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) is an open source tool that provides a GUI client for interacting with the MCP server tools.

```bash
docker run --rm \
  -p 127.0.0.1:6274:6274 \
  -p 127.0.0.1:6277:6277 \
  -e HOST=0.0.0.0 \
  -e MCP_AUTO_OPEN_ENABLED=false \
  ghcr.io/modelcontextprotocol/inspector:latest
```

## Security and Production Notes

- Treat `TRUVERA_API_KEY` as a secret.
- Use HTTPS and secure secrets management in production.

