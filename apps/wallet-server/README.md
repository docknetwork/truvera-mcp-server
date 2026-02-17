# Wallet MCP Server

Model Context Protocol (MCP) server for interacting with Truvera Wallet SDK.

## Status

🚧 **Early Development** - Currently a minimal scaffold for testing MCP connection. Wallet SDK integration coming soon.

## Current Features

- ✅ MCP server transport (stdio/http)
- ✅ Basic connection testing
- ✅ Placeholder tools for validation
- ⏳ Wallet SDK integration (coming soon)
- ⏳ DID management (coming soon)
- ⏳ Credential management (coming soon)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set WALLET_MASTER_KEY
```

### 3. Build

```bash
npm run build
```

### 4. Run (stdio mode)

```bash
npm start
```

### 5. Development Mode

```bash
npm run dev
```

## Available Tools (Placeholder)

- `get_wallet_info` - Get basic wallet information
- `wallet_status` - Check wallet initialization status

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WALLET_MASTER_KEY` | Yes | - | Master encryption key for wallet |
| `MCP_MODE` | No | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_PORT` | No | `3001` | HTTP port (only used if `MCP_MODE=http`) |
| `EDV_STORAGE_URL` | No | `https://edv.dock.io` | EDV storage endpoint |
| `WALLET_NAME` | No | `my-wallet` | Wallet name/label |

## Testing the Connection

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "wallet": {
      "command": "node",
      "args": ["/path/to/truvera-mcp-server/apps/wallet-server/dist/index.js"],
      "env": {
        "WALLET_MASTER_KEY": "your-master-key-here"
      }
    }
  }
}
```

### Manual Testing

```bash
# In one terminal
npm run dev

# In another terminal (send MCP initialize request)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | npm start
```

## Next Steps

1. ✅ Test MCP connection with your LLM
2. Add @docknetwork/wallet-sdk-web dependency
3. Implement wallet initialization
4. Add DID management tools
5. Add credential management tools
6. Implement DIDComm messaging

## Architecture

```
apps/wallet-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── build-info.ts         # Build metadata
│   └── tools/
│       └── placeholder.ts    # Placeholder tools for testing
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

Uses shared bootstrap from `packages/mcp-shared` for server initialization.
