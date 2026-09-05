# ─── Multi-stage Dockerfile for Sekkha API (Full Bun Stack) ────────────────────

# 1. Build Stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma CLI and query engine on Alpine
RUN apk add --no-cache openssl

COPY package.json ./
COPY prisma ./prisma/

RUN bun install

COPY tsconfig.json ./
COPY src ./src

RUN bunx prisma generate
RUN bun run build

# 2. Production Runner Stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Install OpenSSL at runtime for Prisma query engine
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json ./
COPY prisma ./prisma/

RUN bun install --production
RUN bunx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["bun", "dist/index.js"]


