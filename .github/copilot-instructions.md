# Truvera MCP Servers - Copilot Instructions

This is a monorepo containing multiple Model Context Protocol (MCP) servers built with TypeScript/Node.js for integrating with various APIs.

## Repository Structure

- **Type**: Monorepo with multiple MCP Servers
- **Language**: TypeScript/JavaScript
- **Runtime**: Node.js 18+
- **Deployment**: Docker & Docker Compose
- **Primary Purpose**: Enable Claude to make authenticated REST API calls to various Truvera services

## Apps Structure

This repository uses an `apps/` directory to organize multiple MCP servers:

- `apps/truvera-api/` - Main Truvera MCP Server for verifiable credentials and DIDs

Each app is a self-contained MCP server with its own:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `src/` - Source code
- `tests/` - Test suites
- `Dockerfile` - Container build configuration
- `README.md` - App-specific documentation

## Truvera MCP Server (apps/truvera-api)

### Key Features

- Configurable API endpoint via `TRUVERA_API_ENDPOINT` environment variable
- Secure API key management via `TRUVERA_API_KEY` environment variable
- Feature-based architecture: each API area in `src/features/<feature>/`
- Built-in tools for credentials, DIDs, presentations, schemas, profiles, and verification
- Multi-stage Docker build for optimized production images
- Development and debugging support via VS Code

### Environment Variables

- **TRUVERA_API_KEY** (required): Authentication key for Truvera API
- **TRUVERA_API_ENDPOINT** (optional): Base URL for Truvera API (defaults to `https://api.truvera.com`)

### Documentation

- See `apps/truvera-api/README.md` for comprehensive setup and usage instructions
- **See `apps/truvera-api/copilot-instructions.md` for detailed development guidelines**
- See `apps/truvera-api/Dockerfile` for production container build configuration
- See `docker-compose.yml` for multi-service deployment
- See `.vscode/tasks.json` for VS Code task configuration
- See `.vscode/launch.json` for VS Code debugging setup

## Development Commands

### Root Level (All Apps)

```bash
npm install          # Install dependencies for all workspaces
npm run build        # Build all apps
npm run test         # Run tests for all apps
npm run typecheck    # Type check all apps
npm run lint         # Lint all apps
```

### Truvera Server Specific

```bash
cd apps/truvera-api
npm install          # Install dependencies
npm run dev         # Development mode with hot reload
npm run build       # Build TypeScript to JavaScript
npm start           # Run production build
npm run typecheck   # Run TypeScript type checking
```

Or from root:

```bash
npm run build:truvera
npm run dev:truvera
npm run test:truvera
```

## Docker Commands

```bash
docker-compose up -d                            # Start all services
docker-compose logs -f                          # View logs
docker-compose down                             # Stop all services

# Build specific service
docker build -t truvera-mcp-service:latest ./apps/truvera-api
```

## VS Code Configuration

VS Code tasks and launch configurations are set up at the workspace root level:
- Tasks reference `apps/truvera-api` directory
- Launch configurations use correct paths to each app's build output
- Each app can be debugged independently

## Adding New MCP Servers

1. Create new directory: `apps/<new-server>/`
2. Add package.json with appropriate dependencies
3. Set up TypeScript configuration
4. Create src/, tests/, and scripts/ structure
5. Add Dockerfile for containerization
6. Update `docker-compose.yml` to include new service
7. Add build tasks to `.vscode/tasks.json`
8. Add CI steps to `.github/workflows/ci.yml`
9. Create README.md with server-specific documentation

## Security Notes

- API keys should be stored securely (never commit `.env` files)
- Always use HTTPS endpoints in production
- Docker containers run as non-root user for security
- Input validation is performed on API requests

## Best Practices

### Testing
- Write E2E tests for all API integrations (they catch real bugs!)
- Always clean up resources (credentials, DIDs) in `afterAll` hooks
- Use TDD: write tests first, let them reveal API requirements
- Load `.env` first, then `.env.test` for test-specific overrides

### API Integration
- Follow W3C Verifiable Credentials format for all credentials
- Always wrap credentials in `{ credential: { ... } }` for POST /credentials
- Use `encodeURIComponent()` for all URL parameters
- Pass full VC documents to verification, not metadata

### Code Quality
- Enable TypeScript strict mode
- Use feature-based architecture in `src/features/<feature>/`
- Share common types in `src/features/shared/`
- Document with inline JSDoc comments
- Follow SOLID, DRY, and KISS principles for maintainable code
- Follow TDD practices


