# Truvera MCP Service - Copilot Instructions

This is a Model Context Protocol (MCP) server built with TypeScript/Node.js for integrating with the Truvera REST API.

## Project Overview

- **Type**: MCP Server (Model Context Protocol)
- **Language**: TypeScript/JavaScript
- **Runtime**: Node.js 18+
- **Deployment**: Docker & Docker Compose
- **Primary Purpose**: Enable Claude to make authenticated REST API calls to Truvera

## Key Features

- Configurable API endpoint via `TRUVERA_API_ENDPOINT` environment variable
- Secure API key management via `TRUVERA_API_KEY` environment variable
- Built-in tool: `call_truvera_api` for making HTTP requests to Truvera API
- Multi-stage Docker build for optimized production images
- Development and debugging support via VS Code

## Environment Variables

- **TRUVERA_API_KEY** (required): Authentication key for Truvera API
- **TRUVERA_API_ENDPOINT** (optional): Base URL for Truvera API (defaults to `https://api.truvera.com`)

## Documentation

- See `README.md` for comprehensive setup and usage instructions
- See `Dockerfile` for production container build configuration
- See `docker-compose.yml` for local deployment
- See `.vscode/mcp.json` for MCP server configuration
- See `.vscode/launch.json` for VS Code debugging setup

## Development Commands

```bash
npm install          # Install dependencies
npm run dev         # Development mode with hot reload
npm run build       # Build TypeScript to JavaScript
npm start           # Run production build
npm run typecheck   # Run TypeScript type checking
```

## Docker Commands

```bash
docker build -t truvera-mcp-service:latest .    # Build image
docker-compose up -d                            # Start service with Docker Compose
docker-compose logs -f                          # View logs
docker-compose down                             # Stop service
```

## MCP Configuration

The MCP server is configured in `.vscode/mcp.json` to run as a stdio-based server. It can be debugged locally in VS Code using the configuration in `.vscode/launch.json`.

## Security Notes

- API keys should be stored securely (never commit `.env` files)
- Always use HTTPS endpoints in production
- Docker container runs as non-root user for security
- Input validation is performed on API requests
