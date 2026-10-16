# ─── Multi-stage Dockerfile for Sekkha API (Full Bun Stack) ────────────────────

# 1. Build Stage
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma CLI and query engine on Alpine
RUN apk add --no-cache openssl

COPY package.json bun.lock* ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile || bun install

COPY tsconfig.json ./
COPY src ./src

RUN bunx prisma generate
RUN bun run build

# 2. Production Runner Stage
FROM oven/bun:1.2-alpine AS runner

WORKDIR /app

# Install OpenSSL at runtime for Prisma query engine
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json bun.lock* ./
COPY prisma ./prisma/

RUN bun install --production --frozen-lockfile || bun install --production
RUN bunx prisma generate

COPY --from=builder /app/dist ./dist

# Change ownership to non-root user bun
RUN chown -R bun:bun /app

USER bun

EXPOSE 4000

CMD ["bun", "dist/index.js"]


