# Truvera MCP Servers

[![CI](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/docknetwork/truvera-mcp-server/actions/workflows/ci.yml)

A monorepo containing multiple Model Context Protocol (MCP) servers for Truvera API integrations.

## Repository Structure

This repository uses an `apps/` directory structure to organize multiple MCP servers:

```
truvera-mcp-server/
├── apps/
│   └── truvera-api/       # Main Truvera MCP Server
│       ├── src/           # Source code
│       ├── tests/         # Test suites
│       ├── scripts/       # Build scripts
│       ├── package.json   # Dependencies
│       ├── Dockerfile     # Container build
│       └── README.md      # Server-specific documentation
├── .github/
│   └── workflows/         # CI/CD pipelines
├── .vscode/               # VS Code configuration
├── docker-compose.yml     # Multi-service orchestration
└── README.md             # This file
```

## Available MCP Servers

### 1. Truvera MCP Server

The main MCP server that exposes Truvera API functionality as MCP tools. Supports verifiable credentials, DIDs, presentations, and more.

**📖 [Read the full documentation](apps/truvera-api/README.md)**

**Quick start:**
```bash
cd apps/truvera-api
npm install
npm run dev
```

## Docker Compose

You can run all MCP servers using Docker Compose from the root directory:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Development

### Adding a New MCP Server

1. Create a new directory under `apps/`:
   ```bash
   mkdir -p apps/your-new-server
   ```

2. Set up your server structure with:
   - `package.json` - Dependencies and scripts
   - `tsconfig.json` - TypeScript configuration
   - `src/` - Source code
   - `tests/` - Test suites
   - `README.md` - Documentation

3. Add build tasks to `.vscode/tasks.json`

4. Add CI/CD steps to `.github/workflows/ci.yml`

5. Add service to `docker-compose.yml` if needed

### VS Code Configuration

The workspace is configured with tasks for each MCP server:
- `build:truvera` - Build the Truvera server
- `dev:truvera` - Run Truvera server in development mode

Use `Ctrl+Shift+B` (or `Cmd+Shift+B` on macOS) to access build tasks.

## Environment Variables

Each MCP server may require different environment variables. See the individual server README files for details.

For the Truvera server, see [apps/truvera-api/README.md](apps/truvera-api/README.md#environment-variables).

## CI/CD

This repository uses GitHub Actions for continuous integration. The workflow:
- Builds each MCP server
- Runs unit, integration, and e2e tests
- Performs smoke tests

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for details.

## License

See individual MCP server directories for licensing information.

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass: `npm test`
4. Submit a pull request

For server-specific contribution guidelines, see the README in each app directory.

