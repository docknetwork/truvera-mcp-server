# Multi-stage build for Wallet MCP Service
ARG BUILD_NUMBER=1

FROM node:22-alpine3.23 AS builder

ARG BUILD_NUMBER

WORKDIR /app

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl

RUN npm install -g patch-package@8.0.1

COPY package*.json ./
COPY scripts ./scripts
COPY packages/mcp-shared/package*.json ./packages/mcp-shared/
COPY apps/wallet-server/package*.json ./apps/wallet-server/
COPY apps/wallet-server/patches ./apps/wallet-server/patches

RUN npm ci --workspaces

COPY packages/mcp-shared ./packages/mcp-shared
RUN npm run build --workspace=packages/mcp-shared

COPY apps/wallet-server/src ./apps/wallet-server/src
COPY apps/wallet-server/scripts ./apps/wallet-server/scripts
COPY apps/wallet-server/register-aliases.cjs ./apps/wallet-server/
COPY apps/wallet-server/tsconfig.json ./apps/wallet-server/

RUN BUILD_NUMBER=$BUILD_NUMBER npm run build --workspace=apps/wallet-server

FROM node:22-alpine3.23

WORKDIR /app

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl

RUN npm install -g patch-package@8.0.1

COPY package*.json ./
COPY scripts ./scripts
COPY LICENSE /licenses/LICENSE
COPY packages/mcp-shared/package*.json ./packages/mcp-shared/
COPY apps/wallet-server/package*.json ./apps/wallet-server/
COPY apps/wallet-server/patches ./apps/wallet-server/patches

RUN npm ci --workspaces --omit=dev

RUN rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder /app/packages/mcp-shared/dist ./packages/mcp-shared/dist
COPY --from=builder /app/packages/mcp-shared/package.json ./packages/mcp-shared/
COPY --from=builder /app/apps/wallet-server/dist ./apps/wallet-server/dist
COPY --from=builder /app/apps/wallet-server/register-aliases.cjs ./apps/wallet-server/register-aliases.cjs

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Create /data directory for SQLite database files and set permissions
RUN mkdir -p /data && chown -R nodejs:nodejs /data && chmod 755 /data

USER nodejs

WORKDIR /app/apps/wallet-server

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "-r", "./register-aliases.cjs", "dist/index.js"]