import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { eventbus, DomainEvents } from "../../../core/eventbus"
import type { UserRegisteredPayload } from "../../../core/eventbus"
import { redis } from "../../../lib/redis"
import * as repo from "./repository"
import type { RegisterInput, LoginInput } from "./validation"

// ─── Service ─────────────────────────────────────────────────────────────────
// Business logic layer. Orchestrates repository calls + publishes domain events.

export interface AuthResult {
  accessToken: string
  user: { id: string; email: string; name: string; role: string }
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days matching JWT expiration

async function cacheUserSession(token: string, userData: any) {
  try {
    await redis.set(`auth:token:${token}`, JSON.stringify(userData), "EX", SESSION_TTL_SECONDS)
  } catch {
    // Non-blocking fallback if Redis is offline
  }
}

async function getCachedUserSession(token: string) {
  try {
    const cached = await redis.get(`auth:token:${token}`)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch {
    // Non-blocking fallback if Redis is offline
  }
  return null
}

function generateToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  )
}

/**
 * Register a new user.
 * After successful registration, publishes USER_REGISTERED event.
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const exists = await repo.findUserByEmail(input.email)
  if (exists) {
    const err = new Error("Email sudah terdaftar") as Error & { status: number }
    err.status = 409
    throw err
  }

  const hashedPassword = await bcrypt.hash(input.password, 10)
  const user = await repo.createUser({
    email: input.email,
    name: input.name,
    password: hashedPassword,
  })

  const token = generateToken(user.id, user.role)
  const userData = { id: user.id, email: user.email || "", name: user.name, role: user.role }

  await cacheUserSession(token, userData)

  // ── Publish domain event ──────────────────────────────────────────────
  eventbus.publish<UserRegisteredPayload>(DomainEvents.USER_REGISTERED, {
    userId: user.id,
    email: user.email || "",
    name: user.name,
  })

  return {
    accessToken: token,
    user: userData,
  }
}

/**
 * Login an existing user.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await repo.findUserByEmail(input.email)
  if (!user || !user.password) {
    const err = new Error("Email atau password salah") as Error & { status: number }
    err.status = 401
    throw err
  }

  const valid = await bcrypt.compare(input.password, user.password)
  if (!valid) {
    const err = new Error("Email atau password salah") as Error & { status: number }
    err.status = 401
    throw err
  }

  const token = generateToken(user.id, user.role)
  const userData = { id: user.id, email: user.email || "", name: user.name, role: user.role }

  await cacheUserSession(token, userData)

  return {
    accessToken: token,
    user: userData,
  }
}

/**
 * Verify a JWT token and return the associated user.
 * Checks Redis cache first to avoid repeating database queries for active tokens.
 */
export async function verifyToken(token: string) {
  // 1. Try Redis cache hit first
  const cachedUser = await getCachedUserSession(token)
  if (cachedUser) {
    return cachedUser
  }

  // 2. Fallback to JWT verification & DB lookup on cache miss
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string }
  const user = await repo.findUserById(payload.userId)
  if (!user) {
    const err = new Error("User tidak ditemukan") as Error & { status: number }
    err.status = 401
    throw err
  }

  const userData = { id: user.id, email: user.email, name: user.name, role: user.role }

  // Populate cache for subsequent calls
  await cacheUserSession(token, userData)

  return user
}

