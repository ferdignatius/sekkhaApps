import crypto from "crypto"
import express, { type Application } from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit, { ipKeyGenerator, MemoryStore, type Store } from "express-rate-limit"
import cookieParser from "cookie-parser"
import { RedisStore } from "rate-limit-redis"
import { errorHandler } from "./middleware/errorHandler"
import { requestLogger } from "./middleware/requestLogger"
import { redis } from "./lib/redis"
import { apiFailure } from "./lib/apiResponse"
import type { AppModule } from "./core/types"

// Support native JSON.stringify serialization for BigInt (userNumber)
;(BigInt.prototype as any).toJSON = function () {
  return Number(this) <= Number.MAX_SAFE_INTEGER ? Number(this) : this.toString()
}

// ─── Module Imports ──────────────────────────────────────────────────────────
import { authModule } from "./modules/auth/module"
import { usersModule } from "./modules/users/module"
import { eventsModule } from "./modules/events/module"
import { configureModule } from "./modules/configure/module"
import { leaderboardModule } from "./modules/leaderboard/module"
import { peopleModule } from "./modules/people/module"
import { pengurusModule } from "./modules/pengurus/module"
import { schoolsModule } from "./modules/schools/module"
import { homeModule } from "./modules/home/module"

// ─── Distributed & Resilient Rate Limiter Factory (F-09) ──────────────────────
class ResilientRateLimitStore implements Store {
  public localKeys = true
  public prefix: string
  private memStore = new MemoryStore()
  private redisStore: RedisStore

  constructor(prefix: string) {
    this.prefix = `rl:${prefix}:`
    this.redisStore = new RedisStore({
      sendCommand: async (...args: string[]) => {
        return (redis.call as any)(args[0], ...args.slice(1))
      },
      prefix: `rl:${prefix}:`,
    })
  }

  init(options: any) {
    this.memStore.init(options)
    this.redisStore.init?.(options)?.catch?.(() => {})
  }

  async increment(key: string) {
    if (redis.status === "ready") {
      try {
        return await this.redisStore.increment(key)
      } catch {
        // Fall back to memory store if Redis request fails
      }
    }
    return this.memStore.increment(key)
  }

  async decrement(key: string) {
    if (redis.status === "ready") {
      try {
        return await this.redisStore.decrement(key)
      } catch {
        // Fall back
      }
    }
    return this.memStore.decrement(key)
  }

  async resetKey(key: string) {
    if (redis.status === "ready") {
      try {
        return await this.redisStore.resetKey(key)
      } catch {
        // Fall back
      }
    }
    return this.memStore.resetKey(key)
  }

  async resetAll() {
    if (redis.status === "ready") {
      try {
        return await (this.redisStore as any).resetAll?.()
      } catch {
        // Fall back
      }
    }
    return this.memStore.resetAll?.()
  }
}

function createRateLimitStore(prefix: string) {
  return new ResilientRateLimitStore(prefix)
}

export const modules: AppModule[] = [
  authModule,
  usersModule,
  eventsModule,
  configureModule,
  leaderboardModule,
  peopleModule,
  pengurusModule,
  schoolsModule,
  homeModule,
]

export function isOriginAllowed(origin: string, rawOrigins: string[] = []): boolean {
  const normalizedOrigin = origin.trim().replace(/\/$/, "")

  if (
    process.env.NODE_ENV !== "production" &&
    (/^https?:\/\/localhost(:\d+)?$/.test(normalizedOrigin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin))
  ) {
    return true
  }

  return rawOrigins.some((allowed) => {
    if (allowed === "*" || allowed === normalizedOrigin) {
      return true
    }
    // Wildcard support: e.g. "https://*.vercel.app" or "*.vercel.app"
    if (allowed.includes("*")) {
      const regexPattern = "^" + allowed.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"
      return new RegExp(regexPattern).test(normalizedOrigin)
    }
    return false
  })
}

/**
 * Extracts a stable per-user/account identifier for rate-limiting (email, identifier,
 * refresh token digest, or bearer token digest) so shared-IP networks (e.g., Vihara Wi-Fi)
 * do not exhaust a single 5-request bucket across 50+ concurrent attendees.
 */
export function extractRateLimitSubject(req: express.Request): string {
  const body = req.body as Record<string, unknown> | undefined
  for (const field of ["email", "identifier", "new_email", "newEmail"] as const) {
    const raw = body?.[field]
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim().toLowerCase()
    }
  }

  const cookies = req.cookies as Record<string, unknown> | undefined
  const cookieRefresh = cookies?.sekkha_refresh_token ?? cookies?.refresh_token
  const bodyRefresh = body?.sekkha_refresh_token ?? body?.refresh_token
  const refreshToken =
    typeof cookieRefresh === "string" && cookieRefresh.trim().length > 0
      ? cookieRefresh.trim()
      : typeof bodyRefresh === "string" && bodyRefresh.trim().length > 0
        ? bodyRefresh.trim()
        : ""
  if (refreshToken) {
    return `rt:${crypto.createHash("sha256").update(refreshToken).digest("hex").slice(0, 16)}`
  }

  const authHeader = req.headers.authorization
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim()
    if (token.length > 0) {
      return `bearer:${crypto.createHash("sha256").update(token).digest("hex").slice(0, 16)}`
    }
  }

  return ""
}

export function createApp(): Application {
  const app = express()

  // Trust reverse proxy (Docker, Nginx, Caddy, Cloudflare) for accurate client IP rate limiting
  app.set("trust proxy", process.env.TRUST_PROXY || 1)

  // ─── Security & Core Middleware ──────────────────────────────────────────────

  // 1. CORS Configuration (Must run BEFORE rate limiters & route handlers so OPTIONS preflight is never blocked)
  const rawOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim().replace(/\/$/, ""))
    : ["http://localhost:3000", "http://localhost:5173", "http://localhost:4173"]

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin, rawOrigins)) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  }

  app.use(cors(corsOptions))
  app.options(/(.*)/, cors(corsOptions))

  // ─── Request Logger (Live Real-Time Activity Feed) ───────────────────────────
  app.use(requestLogger)

  // 2. High-Performance Gzip/Brotli Payload Compression (60-80% payload size reduction)
  app.use(compression())

  // 3. Security Headers (Helmet)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false, // Disabled for pure REST API
    })
  )

  const skipPreflight = (req: express.Request) => req.method === "OPTIONS"
  const rateLimitHandler = (message: string) => (_req: express.Request, res: express.Response) => {
    apiFailure(res, 429, message, null)
  }
  const subjectOrIpKeyGenerator = (req: express.Request) => {
    const subject = extractRateLimitSubject(req)
    const ip = ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown")
    return subject ? `${ip}:${subject}` : ip
  }

  // 4. Global Rate Limiter (1500 requests per minute per IP to support shared event Wi-Fi)
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("global"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    handler: rateLimitHandler("Too many requests from this IP. Please try again later."),
  })
  app.use(globalLimiter)

  // 5. Body & cookie parsers MUST run before auth/OTP rate limiters so keyGenerator can inspect req.body/req.cookies
  app.use(express.json({ limit: "1mb" }))
  app.use(express.urlencoded({ extended: true, limit: "1mb" }))
  app.use(cookieParser())

  // 5a. Sensitive Auth Rate Limiters (20 requests/15m per IP+account + 500 requests/15m shared-IP ceiling)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: subjectOrIpKeyGenerator,
    store: createRateLimitStore("auth"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    handler: rateLimitHandler("Too many authentication attempts. Please try again after 15 minutes."),
  })
  const authIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("auth_ip"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    handler: rateLimitHandler("Too many authentication attempts from this network. Please try again after 15 minutes."),
  })
  const authRateLimitPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/users/change-password",
    "/api/users/me/delete-account",
    "/api/people/:id/reset-temporary-password",
    "/api/people/members/:id/reset-temporary-password",
    "/api/people/members/:id/reset-password",
  ]
  for (const path of authRateLimitPaths) {
    app.use(path, authIpLimiter, authLimiter)
  }
  // Exact POST match prevents prefix-matching /api/auth/forgot-password/{request,verify-otp,reset}
  app.post("/api/auth/forgot-password", authIpLimiter, authLimiter)

  // 5b. Dedicated OTP Rate Limiters (10 requests/15m per IP+account + 300 requests/15m shared-IP ceiling)
  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: subjectOrIpKeyGenerator,
    store: createRateLimitStore("otp"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    handler: rateLimitHandler("Too many OTP requests for this account. Please try again after 15 minutes."),
  })
  const otpIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("otp_ip"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    handler: rateLimitHandler("Too many OTP requests from this IP. Please try again after 15 minutes."),
  })
  const otpRateLimitPaths = [
    "/api/auth/register-request",
    "/api/auth/register-verify-otp",
    "/api/auth/resend-otp",
    "/api/auth/forgot-password/request",
    "/api/auth/forgot-password/verify-otp",
    "/api/auth/forgot-password/reset",
    "/api/users/email-verification",
  ]
  for (const path of otpRateLimitPaths) {
    app.use(path, otpIpLimiter, otpLimiter)
  }

  // 5c. Schools Stats Rate Limiter (F-12: prevent cheap decryption DoS)
  const schoolStatsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("schools"),
    passOnStoreError: true,
    skip: skipPreflight,
    validate: { singleCount: false },
    handler: rateLimitHandler("Too many requests for school statistics. Please try again in a moment."),
  })
  app.use("/api/schools/stats", schoolStatsLimiter)

  // ─── Health Check ────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() })
  })

  // ─── Register Module Routes ──────────────────────────────────────────────────
  modules.forEach((m) => {
    m.register(app)
    console.log(`📦 Module registered: ${m.name}`)
  })

  // ─── Error Handler (must be last) ───────────────────────────────────────────
  app.use(errorHandler)

  return app
}

export const app = createApp()
