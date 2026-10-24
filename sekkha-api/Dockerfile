# ─── Multi-stage Dockerfile for Sekkha API (Optimized Bun Stack) ───────────────

# 1. Build Stage
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma CLI and query engine
RUN apk add --no-cache openssl

COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Cache bun package downloads to speed up builds and avoid baking cache into layer
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --frozen-lockfile || bun install

COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client and compile TypeScript
RUN bunx prisma generate
RUN bun run build

# Strip dev artifacts (TypeScript declarations and source maps) & Prisma temp files
RUN find ./dist -type f \( -name "*.d.ts" -o -name "*.d.ts.map" -o -name "*.js.map" \) -delete && \
    find ./node_modules/.prisma/client -type f -name "*.tmp*" -delete 2>/dev/null || true

# 2. Production Runner Stage
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

# Install OpenSSL at runtime for Prisma query engine
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=4000

# Copy package manifests directly with bun ownership
COPY --chown=bun:bun package.json bun.lock* ./
COPY --chown=bun:bun prisma ./prisma/

# Install only production dependencies
RUN --mount=type=cache,id=bun,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile || bun install --production

# Copy generated Prisma client from builder directly with bun ownership
COPY --chown=bun:bun --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=bun:bun --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled JavaScript code directly with bun ownership
COPY --chown=bun:bun --from=builder /app/dist ./dist

# Run as non-root user bun (eliminates `RUN chown -R`, preventing duplicate layer bloat)
USER bun

EXPOSE 4000

CMD ["bun", "dist/server.js"]
