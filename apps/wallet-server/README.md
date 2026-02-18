# Wallet MCP Server

Model Context Protocol (MCP) server for interacting with Truvera Wallet SDK.

## Status

✅ **Phase 1 Complete** - DID management tools implemented and functional!

## Current Features

- ✅ MCP server transport (stdio/http)
- ✅ Wallet SDK integration (@docknetwork/wallet-sdk-web v0.0.10)
- ✅ Browser polyfills for Node.js environment
- ✅ DID management (3 tools)
  - `get_default_did` - Get wallet's default DID
  - `create_did` - Create new Decentralized Identifiers
  - `list_dids` - List all DIDs in wallet
- ⏳ Credential management (coming next)
- ⏳ DIDComm messaging (coming later)

## Important Notes

⚠️ **Browser SDK in Node.js**: The `@docknetwork/wallet-sdk-web` package is designed for browsers. We use polyfills ([src/polyfills.ts](src/polyfills.ts)) to provide browser globals (`window`, `self`, `document`, `localStorage`) in Node.js. This works but is not ideal for production.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set:
# - WALLET_MASTER_KEY (required for wallet operations)
# - MCP_MODE (http or stdio)
# - MCP_PORT (default: 3010 for http mode)
```

### 3. Build

```bash
npm run build
```

### 4. Run

**stdio mode** (for Claude Desktop direct connection):
```bash
MCP_MODE=stdio npm start
```

**http mode** (for development/testing):
```bash
MCP_MODE=http npm start
```

### 5. Development Mode

```bash
npm run dev
```

## Available Tools

### DID Management (3 tools)

- **`get_default_did`** - Retrieve the wallet's default DID used for credentials and messaging
- **`create_did`** - Generate a new Decentralized Identifier with optional key type
- **`list_dids`** - List all DIDs stored in the wallet

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WALLET_MASTER_KEY` | Yes | - | Master encryption key for wallet |
| `MCP_MODE` | No | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_PORT` | No | `3010` | HTTP port (only used if `MCP_MODE=http`) |
| `CHEQD_NETWORK` | No | `testnet` | Cheqd network: `testnet` or `mainnet` |
| `EDV_STORAGE_URL` | No | `https://edv.dock.io` | EDV storage endpoint (for cloud wallet) |
| `WALLET_NAME` | No | `mcp-wallet` | Wallet name/label |

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
