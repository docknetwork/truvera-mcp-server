# Truvera MCP Servers

[![CI](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml)

A monorepo containing Model Context Protocol (MCP) servers for Truvera API integrations. MCP servers let AI assistants (Claude, GitHub Copilot, etc.) call real Truvera API operations as tools.

**New to MCP?** MCP (Model Context Protocol) is a standard that lets an AI assistant talk to external services. Once connected, you can ask Claude (or another AI) to perform real actions — like issuing a credential or verifying a DID — by typing natural-language requests. No API calls required on your part.

## Available Servers

| Server | Status | Description |
|--------|--------|-------------|
| [`apps/truvera-api`](apps/truvera-api/README.md) | ✅ Production-ready | Verifiable credentials, DIDs, proof requests, schemas, profiles, AP2 mandates |
| [`apps/wallet-server`](apps/wallet-server/README.md) | ✅ Production-ready | Truvera Wallet SDK — hold credentials, DIDComm messaging, proof responses |

## Two ways to run these servers

There are two independent deployment models — pick whichever fits:

| | **Self-hosted** | **Hosted (Truvera-run)** |
|---|---|---|
| Who runs the container | You, locally or on your own infra | Truvera's infra team (deployed via `terraform/` to ECS) |
| Where it lives | `http://localhost:3000` (or wherever you deploy it) | `https://mcp-api.truvera.io` / `https://mcp-api-staging.truvera.io` (and the `mcp-wallet*` equivalents for the wallet server) |
| Setup required | Clone this repo, `npm install`, run via Docker or Node | None — just point your AI assistant at the URL |
| Best for | Local development, custom deployments, air-gapped environments, or a shared team key (see below) | Everyone else — no local server to run or keep up to date |

Both models expose the same HTTP API and the same authentication model — see [Connecting to AI Assistants](#connecting-to-ai-assistants). The rest of this Quickstart covers **self-hosting**. If you just want to connect to the Truvera-hosted servers, skip straight to [docs/claude-desktop-setup.md](docs/claude-desktop-setup.md).

## Quickstart (5 minutes) — self-hosting

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

> **Is this step required?** Only if you want a shared key: setting `TRUVERA_API_KEY` here lets every client skip sending its own Authorization header (handy for a single-user or shared-team deployment). If you'd rather each person/client use their own key, you can leave this blank — see [Connecting to AI Assistants](#connecting-to-ai-assistants) for how per-client keys work.

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

Once the server is running in HTTP mode on port 3000, connect your AI assistant to `http://localhost:3000/mcp` (self-hosted) or the Truvera-hosted URL (see [Two ways to run these servers](#two-ways-to-run-these-servers)).

### Authentication: two options

Every request to `/mcp` needs a Truvera API key, resolved one of two ways:

1. **Shared server key (self-hosted only).** If you set `TRUVERA_API_KEY` in `apps/truvera-api/.env` (Quickstart step 2), the server uses it automatically for any request that doesn't supply its own key. This is the simplest option for a single user or a small team sharing one account — no header needed, so the plain "just paste a URL" client config (Option A below) works.
2. **Per-client Authorization header.** Send `Authorization: Bearer <your-api-key>` with each connection. This always overrides the shared key when both are present, and it's the **only** option against the Truvera-hosted servers (`mcp-api.truvera.io` etc.), since those are multi-tenant and don't have a single shared key — each person authenticates with their own.

If neither is present, the server rejects the request with a 401.

### Claude Desktop

**Option A — Settings UI, no header (self-hosted with a shared key only)**

1. Open Claude Desktop and go to **Settings → Integrations**
2. Click **+ Add Integration**
3. Enter a name (`Truvera`) and the URL: `http://localhost:3000/mcp`
4. Click **Add**, then restart Claude Desktop

This only works if the server has `TRUVERA_API_KEY` set (option 1 above) — the Integrations UI has no field for a custom header, so it can't carry a per-client key. If you need a per-client key (including for the Truvera-hosted servers), use Option B.

**Option B — Manual config file, with a per-client key**

Edit the config file for your OS:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "truvera": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "http://localhost:3000/mcp",
        "--insecure",
        "--header", "Authorization: Bearer YOUR_API_KEY_HERE"
      ]
    }
  }
}
```

Drop `--insecure` (it's only needed for a plain `http://` URL) and swap in the hosted URL if you're connecting to a Truvera-hosted server instead of self-hosting. Restart Claude Desktop after saving.

### VS Code (GitHub Copilot)

> **Requires VS Code 1.99 or later** (released March 2025). The workspace config uses the native `type: "http"` MCP format which is not supported in older versions — tools will silently not appear. If you're on an older version, use the [Claude Desktop manual config](#option-b-manual-config-with-a-per-client-key) instead.

The workspace `.vscode/mcp.json` is already configured with no header — this relies on the shared-key fallback, so it only works if you've set `TRUVERA_API_KEY` in `apps/truvera-api/.env`. Start the server, then:

1. Open Copilot Chat (`Ctrl+Shift+I` / `Cmd+Shift+I`)
2. Switch to **Agent** mode using the dropdown at the top of the chat pane (MCP tools are only available in Agent mode)
3. The Truvera tools will be listed in the tools panel

To use a per-client key instead (required for the Truvera-hosted servers), open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`), run **MCP: Open User Configuration**, and add:

```json
{
  "servers": {
    "truvera": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Cursor

1. Open **Cursor Settings** (`Ctrl+,` / `Cmd+,`)
2. Go to **Features → MCP**
3. Click **+ Add new MCP server**
4. Set type to **HTTP**, enter URL: `http://localhost:3000/mcp`, and (unless you're relying on the shared-key fallback) add a custom header `Authorization: Bearer YOUR_API_KEY_HERE`
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
- Run `curl http://localhost:3000/health` — if that returns an error, check the Docker container logs: `docker logs truvera-mcp-service`.
- Note that `TRUVERA_API_KEY` being unset is *not* a startup error in HTTP mode — it just means every client must send its own Authorization header (see [Authentication: two options](#authentication-two-options)). It's only required at startup in STDIO mode.

**Claude doesn't show Truvera tools**
- Restart Claude Desktop after adding the integration or editing the config file.
- Confirm the server is running first: `curl http://localhost:3000/health`.
- In VS Code, make sure you're in **Agent** mode — MCP tools are invisible in Ask or Edit mode.

**`--insecure` flag in the manual Claude Desktop config**
- Only needed when using the `mcp-remote` fallback config (Option B) against a plain `http://` URL (e.g. self-hosted on localhost). It allows `mcp-remote` to connect without TLS. Drop it for the Truvera-hosted `https://` URLs. It does **not** affect your Truvera API key security. The Settings UI method (Option A) doesn't use `mcp-remote` at all, so this flag never applies there.

**Tools appear but calls fail with auth errors**
- Your API key may be for the wrong environment. Testnet keys only work with `https://api-testnet.truvera.io`; production keys with `https://api.truvera.com`. Check `TRUVERA_API_ENDPOINT` in `apps/truvera-api/.env` (self-hosted) or confirm which environment your key was issued for (hosted).
- Double check whether you're relying on the shared-key fallback or a per-client header — a stale/wrong key in either place produces the same error.

## MCP Inspector (Shared for All Servers)

Use MCP Inspector to debug or manually exercise tools from any MCP server in this repo.

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

Wallet server (HTTP mode):

```bash
cd apps/wallet-server
MCP_MODE=http npm run dev
```

### 3. Connect from Inspector

1. Open `http://localhost:6274`
2. Choose Streamable HTTP transport
3. Connect to the target server endpoint:
    - Truvera API: `http://localhost:3000/mcp`
    - Wallet server: `http://localhost:3001/mcp` by default (the *host* port shifts if you run it via `docker:run:wallet` and 3001 is busy — the container's internal `MCP_PORT` stays 3001 unless you override it)
4. If the server requires auth (a per-client header or, for the wallet server, a JWT), add it as a custom header in Inspector's connection settings.

If connection fails, check the target server health endpoint first (`/health`) and confirm ports/env values.

## Repository Structure

```
truvera-mcp-server/
├── apps/
│   ├── truvera-api/       # ✅ Truvera REST API MCP server (production-ready)
│   └── wallet-server/     # ✅ Wallet SDK MCP server (production-ready)
├── packages/
│   └── mcp-shared/        # Shared MCP server bootstrap, transport, and auth utilities
├── terraform/             # Hosted (Truvera-run) ECS deployment for both servers
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

Each server has its own GitHub Actions workflow, triggered only by changes to that server (or shared code): [.github/workflows/ci.yml](.github/workflows/ci.yml) for `truvera-api` (unit tests only) and [.github/workflows/ci-wallet.yml](.github/workflows/ci-wallet.yml) for `wallet-server` (unit + integration tests). Both build the Docker image and run a Trivy image scan.

Docker image publishing uses two tag policies:
- `latest` is pushed only when a GitHub Release is published from the `master` branch (stable release image).
- All other Docker publishes are tagged only with the build number from `apps/truvera-api/.buildnumber` (or GitHub run number fallback) and should be treated as unstable builds.

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass: `npm test`
4. Submit a pull request

