# Truvera MCP Servers

[![CI](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml)

A monorepo containing Model Context Protocol (MCP) servers for Truvera API integrations. MCP servers let AI assistants (Claude, GitHub Copilot, etc.) call real Truvera API operations as tools.

## Available Servers

| Server | Status | Description |
|--------|--------|-------------|
| [`apps/truvera-api`](apps/truvera-api/README.md) | ✅ Production-ready | Verifiable credentials, DIDs, presentations, schemas, profiles, AP2 mandates |
| [`apps/wallet-server`](apps/wallet-server/README.md) | 🚧 Work in progress | Truvera Wallet SDK integration — not ready for use |

## Quickstart (5 minutes)

### Prerequisites

- Node.js 18+
- Docker (recommended — builds and runs the server in a container)
- A Truvera API key ([sign up at truvera.io](https://truvera.io))

### 1. Clone and install

```bash
git clone https://github.com/docknetwork/truvera-mcp-server.git
cd truvera-mcp-server
npm install
```

### 2. Configure environment

```bash
cp apps/truvera-api/.env.example apps/truvera-api/.env
# Edit apps/truvera-api/.env and set your TRUVERA_API_KEY
```

### 3. Build and run with Docker (recommended)

```bash
# Build the Docker image
npm run docker:build:api

# Start the server in HTTP mode on port 3000
npm run docker:run:api

# Verify it's running (should return {"status":"ok",...})
curl http://localhost:3000/health
```

The server is now running and ready to connect to your AI assistant. See [Connecting to AI Assistants](#connecting-to-ai-assistants) below.

### Alternative: Run locally without Docker

```bash
cd apps/truvera-api
MCP_MODE=http npm run dev    # HTTP transport (recommended)
```

> **Transport modes:** HTTP transport is well-tested and recommended for development and production. STDIO transport is experimental — use it only if your client requires it and you are comfortable with limited test coverage.

## Connecting to AI Assistants

Once the server is running in HTTP mode on port 3000:

### Claude Desktop

Add to your Claude Desktop config:
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

### GitHub Copilot (VS Code)

The workspace `.vscode/mcp.json` is already configured. Start the server, then in the Copilot chat pane click **Configure tools...** → **Update tools** under `truvera-mcp-service-vs-code`.

## MCP Inspector (Shared for All Servers)

Use MCP Inspector to debug or manually exercise tools from any MCP server in this repo (for example, `apps/truvera-api` now, and `apps/wallet-server` as it matures).

### 1. Start the Inspector UI

```bash
npx @modelcontextprotocol/inspector
```

### 2. Start the MCP server you want to inspect

Truvera API server (HTTP mode):

```bash
npm run docker:run:api
# or: cd apps/truvera-api && MCP_MODE=http npm run dev
```

Wallet server (HTTP mode, work in progress):

```bash
cd apps/wallet-server
MCP_MODE=http npm run dev
```

### 3. Connect from Inspector

1. Open `http://localhost:6274`
2. Choose Streamable HTTP transport
3. Connect to the target server endpoint:
    - Truvera API: `http://localhost:3000/mcp`
    - Wallet server: `http://localhost:3010/mcp` (if `MCP_PORT=3010`)

If connection fails, check the target server health endpoint first (`/health`) and confirm ports/env values.

## Repository Structure

```
truvera-mcp-server/
├── apps/
│   ├── truvera-api/       # ✅ Truvera REST API MCP server (production-ready)
│   └── wallet-server/     # 🚧 Wallet SDK MCP server (work in progress)
├── packages/
│   └── mcp-shared/        # Shared MCP server bootstrap utilities
├── .vscode/               # VS Code tasks, launch configs, MCP server config
├── docker-compose.yml     # Compose file for running the truvera-api service
└── README.md              # This file
```

## Development Commands

Run from the repo root:

```bash
npm install                  # Install all workspace dependencies
npm run build                # Build all packages and apps
npm run test                 # Run all tests
npm run docker:build:api     # Build the truvera-api Docker image
npm run docker:run:api       # Run the truvera-api container on port 3000
```

For development server with hot-reload (HTTP transport):

```bash
MCP_MODE=http npm run dev:api
```

See [apps/truvera-api/README.md](apps/truvera-api/README.md) for full documentation including all environment variables, available tools, and testing instructions.

## CI/CD

GitHub Actions builds all apps, runs unit and integration tests, and performs a smoke test on every push. See [.github/workflows/ci.yml](.github/workflows/ci.yml) for details.

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass: `npm test`
4. Submit a pull request

