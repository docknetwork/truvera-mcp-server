# Truvera MCP Servers

[![CI](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml)

A monorepo containing Model Context Protocol (MCP) servers for Truvera API integrations. MCP servers let AI assistants (Claude, GitHub Copilot, etc.) call real Truvera API operations as tools.

**New to MCP?** MCP (Model Context Protocol) is a standard that lets an AI assistant talk to external services. Once connected, you can ask Claude (or another AI) to perform real actions — like issuing a credential or verifying a DID — by typing natural-language requests. No API calls required on your part.

## Available Servers

| Server | Status | Description |
|--------|--------|-------------|
| [`apps/truvera-api`](apps/truvera-api/README.md) | ✅ Production-ready | Verifiable credentials, DIDs, proof requests, schemas, profiles, AP2 mandates |
| [`apps/wallet-server`](apps/wallet-server/README.md) | 🚧 Work in progress | Truvera Wallet SDK — hold credentials, DIDComm messaging, proof responses |

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
npm run build
MCP_MODE=http npm start    # HTTP transport (recommended)
```

> **Transport modes:** HTTP transport is well-tested and recommended for development and production. STDIO transport is experimental — use it only if your client requires it and you are comfortable with limited test coverage.

## Connecting to AI Assistants

Once the server is running in HTTP mode on port 3000:

### Claude Desktop

**Option A — Settings UI (recommended, no config file editing)**

1. Open Claude Desktop and go to **Settings → Integrations**
2. Click **+ Add Integration**
3. Enter a name (`Truvera`) and the URL: `http://localhost:3000/mcp`
4. Click **Add**, then restart Claude Desktop

**Option B — Manual config file** (if the Integrations UI is unavailable)

Edit the config file for your OS:
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

Restart Claude Desktop after saving.

### VS Code (GitHub Copilot)

> **Requires VS Code 1.99 or later** (released March 2025). The workspace config uses the native `type: "http"` MCP format which is not supported in older versions — tools will silently not appear. If you're on an older version, use the [Claude Desktop manual config](#option-b-manual-config) instead.

The workspace `.vscode/mcp.json` is already configured. Start the server, then:

1. Open Copilot Chat (`Ctrl+Shift+I` / `Cmd+Shift+I`)
2. Switch to **Agent** mode using the dropdown at the top of the chat pane (MCP tools are only available in Agent mode)
3. The Truvera tools will be listed in the tools panel

To add the server to your personal VS Code (all projects), open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **MCP: Open User Configuration**, then add:

```json
{
  "servers": {
    "truvera": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Cursor

1. Open **Cursor Settings** (`Ctrl+,` / `Cmd+,`)
2. Go to **Features → MCP**
3. Click **+ Add new MCP server**
4. Set type to **HTTP** and enter URL: `http://localhost:3000/mcp`
5. Save and restart Cursor

### What to try once connected

After connecting, ask your AI assistant things like:

- *"List all my DIDs."*
- *"Issue a credential with type EmploymentCredential to DID `did:cheqd:testnet:abc123`."*
- *"Verify this credential: `<paste JSON>`."*
- *"Create a proof request for an EmailCredential and give me the QR code link."*
- *"List my credential schemas."*
- *"What Truvera tools do you have available?"*

The AI will call the appropriate Truvera API tools and return real results. No code or API knowledge required.

## Troubleshooting

**Server won't start**
- Make sure `TRUVERA_API_KEY` is set in `apps/truvera-api/.env` (not blank, not the placeholder `your-api-key-here`).
- Run `curl http://localhost:3000/health` — if that returns an error, check the Docker container logs: `docker logs truvera-mcp-service`.

**Claude doesn't show Truvera tools**
- Restart Claude Desktop after adding the integration or editing the config file.
- Confirm the server is running first: `curl http://localhost:3000/health`.
- In VS Code, make sure you're in **Agent** mode — MCP tools are invisible in Ask or Edit mode.

**`--insecure` flag in the manual Claude Desktop config**
- Only needed when using the `mcp-remote` fallback config (Option B). It allows `mcp-remote` to connect to a plain `http://` URL. It does **not** affect your Truvera API key security. The Settings UI method (Option A) does not require this flag.

**Tools appear but calls fail with auth errors**
- The API key in your `.env` may be for the wrong environment. Testnet keys only work with `https://api-testnet.truvera.io`; production keys with `https://api.truvera.com`. Check `TRUVERA_API_ENDPOINT` in your `.env`.

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
npm run docker:run:wallet    # Run wallet container (auto-selects host port if 3001 is busy)
```

For development server with hot-reload (HTTP transport):

```bash
MCP_MODE=http npm run dev:api
```

See [apps/truvera-api/README.md](apps/truvera-api/README.md) for full documentation including all environment variables, available tools, and testing instructions.

## CI/CD

GitHub Actions builds all apps, runs unit and integration tests, and performs a smoke test on every push. See [.github/workflows/ci.yml](.github/workflows/ci.yml) for details.

Docker image publishing uses two tag policies:
- `latest` is pushed only when a GitHub Release is published from the `master` branch (stable release image).
- All other Docker publishes are tagged only with the build number from `apps/truvera-api/.buildnumber` (or GitHub run number fallback) and should be treated as unstable builds.

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass: `npm test`
4. Submit a pull request

