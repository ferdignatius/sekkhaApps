// Sekkha Community App — Backend Server Entry Point
// F-16 Remediation: Load environment variables before any other imports
import "dotenv/config"

import { app, modules } from "./app"
import { prisma } from "./lib/prisma"

// ─── Environment Sanity Check (F-02 Remediation) ──────────────────────────────
const isProd = process.env.NODE_ENV === "production"
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes("change-this-in-production") || jwtSecret.includes("ganti-dengan-secret")) {
  if (isProd) {
    console.error(
      "❌ CRITICAL SECURITY FAILURE: JWT_SECRET is required, must be at least 32 characters, and cannot use default/sample placeholders in production. Exiting..."
    )
    process.exit(1)
  } else {
    console.warn(
      "⚠️  WARNING: JWT_SECRET is missing or using a weak/sample secret. Generate a strong 32+ character random secret for production."
    )
  }
}

if (isProd) {
  if (!process.env.DATABASE_URL) {
    console.error("❌ CRITICAL CONFIGURATION FAILURE: DATABASE_URL is required in production. Exiting...")
    process.exit(1)
  }

  const encKey = process.env.ENCRYPTION_KEY
  if (!encKey || encKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(encKey)) {
    console.error(
      "❌ CRITICAL SECURITY FAILURE: ENCRYPTION_KEY is required in production and must be a 64-character hex string (32 bytes). Exiting..."
    )
    process.exit(1)
  }

  const bindexKey = process.env.BLIND_INDEX_KEY
  if (!bindexKey || bindexKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(bindexKey)) {
    console.error(
      "❌ CRITICAL SECURITY FAILURE: BLIND_INDEX_KEY is required in production and must be a 64-character hex string (32 bytes). Exiting..."
    )
    process.exit(1)
  }
}

const PORT = process.env.PORT || 4000

// ─── Subscribe to Domain Events ──────────────────────────────────────────────
modules.forEach((m) => {
  m.subscribe?.()
})

// ─── Start & Warmup ───────────────────────────────────────────────────────────
// Pre-warm Prisma connection pool to avoid first-request latency penalty
prisma.$connect().catch((err) => {
  console.warn("⚠️  Prisma database connection warmup failed:", err.message)
})

export const server = app.listen(PORT, () => {
  console.log(`🚀 Sekkha API running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log(`📦 Modules loaded: ${modules.map((m) => m.name).join(", ")}`)
})

// Graceful shutdown
function handleShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`)
  server.close(async () => {
    await prisma.$disconnect()
    console.log("👋 Server closed, database disconnected.")
    process.exit(0)
  })
}

process.on("SIGINT", () => handleShutdown("SIGINT"))
process.on("SIGTERM", () => handleShutdown("SIGTERM"))
