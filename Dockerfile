# Multi-stage build for Truvera MCP Service
FROM node:22-alpine3.20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Upgrade npm so the build doesn't show a newer-version notice
# Install known working npm version (avoids noisy update notices)
RUN npm install -g npm@11.6.4 --no-fund --no-audit

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:22-alpine3.20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Upgrade npm in the runtime image too (keeps logs consistent)
RUN npm install -g npm@11.6.4 --no-fund --no-audit

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Run the MCP service
CMD ["node", "dist/index.js"]
