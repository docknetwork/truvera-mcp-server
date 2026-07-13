# @truvera/mcp-shared

Shared infrastructure for Truvera MCP servers.

## Overview

This package provides reusable components for building Model Context Protocol (MCP) servers:

- **Server Bootstrap** - `bootstrapMCPServer`, which wires up tools, handlers, transport, and auth in one call
- **Transport Layer** - stdio and HTTP streaming transport implementations
- **Auth** - request-level auth resolution: `none`, JWT (multi-tenant), and API-key passthrough (with an optional shared-key fallback)
- **Tool System** - Type definitions and utilities for MCP tools
- **Type Definitions** - Common TypeScript interfaces

## Usage

```typescript
import { bootstrapMCPServer } from '@truvera/mcp-shared/server';
import { startStdioTransport, startHTTPTransport } from '@truvera/mcp-shared/transport';
import { resolveAuthContext, AuthConfig, AuthContext, deriveWalletKey } from '@truvera/mcp-shared/auth';
import { ToolDef, ToolHandler, formatResult } from '@truvera/mcp-shared/tools';
import { BuildInfo } from '@truvera/mcp-shared/types';
```

### Auth modes

`AuthConfig` supports three modes, resolved per-request by `resolveAuthContext`:

- `{ mode: "none" }` — no auth; every session gets `{ mode: "none" }`.
- `{ mode: "jwt", publicKeyPem }` — verifies an ES256-signed JWT Bearer token; the resolved `AuthContext` carries `tenantId` (the JWT `sub` claim). Used by `apps/wallet-server` for multi-tenant deployments.
- `{ mode: "passthrough", fallbackApiKey? }` — the Bearer token itself is passed through as the API key (`AuthContext.apiKey`). If a request omits the header and `fallbackApiKey` is set, that value is used instead — this lets a single-account/shared-team deployment skip per-client headers. Used by `apps/truvera-api`.

`deriveWalletKey(masterSecret, tenantId)` is an HMAC-SHA256 helper for deriving a per-tenant encryption key from a JWT `sub` claim; it's exported for this purpose but not currently called by either app (see `apps/wallet-server/README.md` for the current state of wallet encryption).

## Development

```bash
# Build
npm run build

# Type check
npm run typecheck

# Clean
npm run clean
```
