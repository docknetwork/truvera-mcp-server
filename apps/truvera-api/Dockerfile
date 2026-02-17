# Multi-stage build for Truvera MCP Service
ARG BUILD_NUMBER=1

FROM node:22-alpine3.20 AS builder

ARG BUILD_NUMBER

WORKDIR /app

# Upgrade npm
RUN npm install -g npm@11.6.4 --no-fund --no-audit

# Copy root package files for workspace
COPY package*.json ./

# Copy workspace package.json files first (for Docker layer caching)
COPY packages/mcp-shared/package*.json ./packages/mcp-shared/
COPY apps/truvera-api/package*.json ./apps/truvera-api/

# Install all workspace dependencies
RUN npm ci --workspaces

# Copy source code for shared package
COPY packages/mcp-shared ./packages/mcp-shared

# Build shared package
RUN npm run build --workspace=packages/mcp-shared

# Copy source code for truvera-api
COPY apps/truvera-api/src ./apps/truvera-api/src
COPY apps/truvera-api/scripts ./apps/truvera-api/scripts
COPY apps/truvera-api/tsconfig.json ./apps/truvera-api/

# Build TypeScript with explicit build number
RUN BUILD_NUMBER=$BUILD_NUMBER npm run build --workspace=apps/truvera-api

# Runtime stage
FROM node:22-alpine3.20

WORKDIR /app

# Upgrade npm in the runtime image too (keeps logs consistent)
RUN npm install -g npm@11.6.4 --no-fund --no-audit

# Copy root package files
COPY package*.json ./

# Copy workspace package.json files
COPY packages/mcp-shared/package*.json ./packages/mcp-shared/
COPY apps/truvera-api/package*.json ./apps/truvera-api/

# Install production dependencies only
RUN npm ci --workspaces --only=production

# Copy built shared package from builder
COPY --from=builder /app/packages/mcp-shared/dist ./packages/mcp-shared/dist
COPY --from=builder /app/packages/mcp-shared/package.json ./packages/mcp-shared/

# Copy built application from builder
COPY --from=builder /app/apps/truvera-api/dist ./apps/truvera-api/dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Set working directory to the app
WORKDIR /app/apps/truvera-api

# Expose MCP HTTP port (used when MCP_MODE=http)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Run the MCP service
CMD ["node", "dist/index.js"]
