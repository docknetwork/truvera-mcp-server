# @truvera/mcp-shared

Shared infrastructure for Truvera MCP servers.

## Overview

This package provides reusable components for building Model Context Protocol (MCP) servers:

- **Transport Layer** - stdio and HTTP streaming transport implementations
- **Tool System** - Type definitions and utilities for MCP tools
- **Type Definitions** - Common TypeScript interfaces

## Usage

```typescript
import { startStdioTransport, startHTTPTransport } from '@truvera/mcp-shared/transport';
import { ToolDef, ToolHandler, formatResult } from '@truvera/mcp-shared/tools';
import { BuildInfo } from '@truvera/mcp-shared/types';
```

## Development

```bash
# Build
npm run build

# Type check
npm run typecheck

# Clean
npm run clean
```
