# Truvera MCP Service

A Model Context Protocol (MCP) server for integrating with the Truvera REST API. Built with TypeScript/Node.js and deployable via Docker.

## Overview

This MCP service provides a bridge between Claude and the Truvera API, allowing Claude to make authenticated calls to external REST endpoints through the MCP protocol. It supports two communication modes:

- **Stdio mode**: Direct subprocess communication (default)
- **HTTP mode**: Remote access via HTTP (ideal for Claude Desktop with `mcp-remote`)

## Features

- **MCP Server Implementation**: Fully compliant Model Context Protocol server
- **Dual Transport Modes**: Stdio (default) or HTTP
- **REST API Integration**: Call external APIs with authentication
- **Environment Configuration**: API key and endpoint configured via environment variables
- **Docker Deployment**: Multi-stage Docker build for optimized production images
- **Request Validation**: Input validation for API calls
- **Centralized API Client**: Reusable Truvera client with typed methods
- **Docker Compose Support**: Easy local development and deployment

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for containerized deployment)
- npm or yarn

## Configuration

The service is configured via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRUVERA_API_KEY` | Yes | - | Authentication key for Truvera API |
| `TRUVERA_API_ENDPOINT` | No | `https://api.truvera.com` | Base URL for Truvera API |

## Local Development

### Setup

```bash
npm install
```

### Running Locally

```bash
# Development mode with hot reload
npm run dev

# Or build and run
npm run build
npm start
```

### Type Checking

```bash
npm run typecheck
```

## Docker Deployment

### Build Image

```bash
docker build -t truvera-mcp-service:latest .
```

### Run Container

```bash
docker run -e TRUVERA_API_KEY=your-api-key \
           -e TRUVERA_API_ENDPOINT=https://api.truvera.com \
           truvera-mcp-service:latest
```

### Using Docker Compose (Stdio Mode)

1. Create a `.env` file in the project root:

```env
TRUVERA_API_KEY=your-api-key
TRUVERA_API_ENDPOINT=https://api.truvera.com
MCP_MODE=stdio
```

2. Start the service:

```bash
docker-compose up -d
```

3. View logs:

```bash
docker-compose logs -f truvera-mcp-service
```

4. Stop the service:

```bash
docker-compose down
```

### HTTP Mode (Claude Desktop + mcp-remote)

The service supports HTTP mode for remote access, ideal for Claude Desktop via the `mcp-remote` package.

#### Starting in HTTP Mode

1. Update your `.env` file:

```env
TRUVERA_API_KEY=your-api-key
TRUVERA_API_ENDPOINT=https://api.truvera.com
MCP_MODE=http
MCP_PORT=3000
```

2. Start the service:

```bash
docker-compose up -d
```

3. Verify the service is running:

```bash
curl http://localhost:3000/health
# Response: {"status":"ok","service":"truvera-mcp-service"}
```

#### HTTP Endpoints

The service uses Server-Sent Events (SSE) transport for MCP communication when in HTTP mode:

- **GET `/health`**: Health check - verify the server is up and available
- **GET `/sse`**: SSE endpoint - Claude Desktop clients establish MCP protocol communication here
- **POST `/messages`**: Message endpoint - clients POST MCP protocol messages to this endpoint

#### Configuring Claude Desktop with mcp-remote

Install and configure `mcp-remote` to bridge HTTP connections to Claude Desktop:

```bash
npm install -g mcp-remote
```

Add the following to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "truvera-mcp": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000"]
    }
  }
}
```

**Note**: The HTTP port (default 3000) must be accessible from where Claude Desktop is running. For remote deployments, use the appropriate hostname/IP address and ensure firewall rules allow access.

#### Environment Variables for HTTP Mode

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MCP_MODE` | No | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_PORT` | No | `3000` | HTTP port (only used when `MCP_MODE=http`) |

## Available Tools

The MCP service exposes the following tools to Claude:

### `call_truvera_api`

Make authenticated HTTP requests to the Truvera API.

**Parameters:**
- `endpoint` (string, required): API endpoint path (e.g., `/dids`, `/dids/{did}`)
- `method` (string, required): HTTP method - `GET`, `POST`, `PUT`, or `DELETE`
- `payload` (object, optional): Request body for POST/PUT requests

**Example:**

```json
{
  "tool": "call_truvera_api",
  "endpoint": "/dids",
  "method": "GET"
}
```

### `create_did`

Create a Decentralized Identifier (DID) using the Truvera API.

**Parameters:**
- `method` (string, required): DID method - `cheqd`, `dock`, or `key`
- `metadata` (object, optional): Additional DID metadata

**Example:**

```json
{
  "tool": "create_did",
  "method": "cheqd",
  "metadata": {"context": "example"}
}
```

## Project Structure

```
.
├── src/
│   └── index.ts           # Main MCP server implementation
├── dist/                  # Compiled JavaScript (generated)
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose configuration
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
├── .dockerignore           # Docker build ignore patterns
├── .gitignore             # Git ignore patterns
└── README.md              # This file
```

## Extending the Service

To add more tools or functionality:

1. **Add new tools** in the `ListToolsRequestSchema` handler
2. **Implement tool logic** in the `CallToolRequestSchema` handler
3. **Add new API clients** in dedicated modules under `src/`

Example structure for multiple API integrations:

```
src/
├── index.ts
├── clients/
│   ├── truvera.ts
│   └── other-api.ts
└── tools/
    ├── truvera-tools.ts
    └── other-tools.ts
```

## Debugging

### Local Debugging with VS Code

The MCP configuration is available in `.vscode/mcp.json` for debugging.

### Viewing Logs

```bash
# Docker logs
docker-compose logs -f

# Local Node process
# Logs are sent to stderr by default
```

## Security Considerations

- **API Key Protection**: Store `TRUVERA_API_KEY` securely (use `.env` files, Docker secrets, or environment management)
- **HTTPS Only**: Always use HTTPS endpoints in production
- **Input Validation**: The service validates endpoint and method parameters
- **Non-root User**: Docker container runs as non-root user `nodejs`

## Troubleshooting

### Container fails to start

Check environment variables are set:
```bash
docker-compose config  # Shows current configuration
```

### API calls returning errors

Verify:
- `TRUVERA_API_KEY` is correct and not expired
- `TRUVERA_API_ENDPOINT` is accessible and correct
- Network connectivity to the API endpoint

### TypeScript compilation errors

Rebuild the project:
```bash
npm install
npm run build
```

## License

MIT

## Support

For issues or questions, contact the development team.
