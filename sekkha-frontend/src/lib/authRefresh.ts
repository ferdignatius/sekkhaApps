import { safeStorage } from "./storage"
import { isJwtExpired } from "./jwt"

export const ACCESS_TOKEN_KEY = "sekkha_access_token"
export const REFRESH_LOCK_KEY = "sekkha_auth_refresh_lock"
export const AUTH_CHANNEL_NAME = "sekkha:auth"
export const SESSION_INVALIDATED_EVENT = "sekkha:session-invalidated"
export const TOKEN_SYNCED_EVENT = "sekkha:token-synced"

const LOCK_TTL_MS = 8_000
const FALLBACK_LOCK_WAIT_MS = 8_000
const REFRESH_FETCH_TIMEOUT_MS = 5_000
const MAX_CONCURRENT_RETRIES = 2
const CONCURRENT_RETRY_BASE_MS = 180
const MAX_RETRY_AFTER_MS = 60_000
const DEFAULT_RETRY_AFTER_MS = 5_000

export interface RefreshedUserSummary {
  id?: string
  userId?: string
  user_number?: string | number | bigint | null
  email?: string | null
  username?: string | null
  name?: string | null
  role?: string | null
  onboarding_completed?: boolean
  onboardingCompleted?: boolean
}

export type UnifiedRefreshResult =
  | {
      ok: true
      accessToken: string
      user: RefreshedUserSummary | null
      reusedExisting?: boolean
    }
  | {
      ok: false
      kind: "unauthorized" | "csrf" | "rate_limited" | "concurrent" | "transient"
      status?: number
      retryAfterMs?: number
      message: string
    }

let inFlightTabRefresh: Promise<UnifiedRefreshResult> | null = null
let rateLimitedUntil = 0
let lastBroadcastToken: string | null = null

export function resetRefreshCoordinatorForTests(): void {
  inFlightTabRefresh = null
  rateLimitedUntil = 0
  lastBroadcastToken = null
  safeStorage.removeItem(REFRESH_LOCK_KEY)
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || "http://localhost:4000/api"
}

function postAuthChannelMessage(message: {
  type: "TOKEN_REFRESHED" | "SESSION_INVALIDATED" | "LOGOUT"
  accessToken?: string
}): void {
  if (typeof BroadcastChannel === "undefined") return
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    channel.postMessage(message)
    channel.close()
  } catch {
    // Ignore restricted/unsupported BroadcastChannel contexts
  }
}

export function broadcastLogout(): void {
  lastBroadcastToken = null
  postAuthChannelMessage({ type: "LOGOUT" })
}

export function parseRetryAfterMs(headerValue: string | null): number {
  if (!headerValue) return DEFAULT_RETRY_AFTER_MS
  const trimmed = headerValue.trim()
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed)
    return Math.min(MAX_RETRY_AFTER_MS, Math.max(1_000, seconds * 1000))
  }
  const dateMs = Date.parse(trimmed)
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now()
    return Math.min(MAX_RETRY_AFTER_MS, Math.max(1_000, delta))
  }
  return DEFAULT_RETRY_AFTER_MS
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Acquires an exclusive cross-tab lock using Web Locks API when available,
 * falling back to a bounded lease mutex in localStorage for environments without Web Locks.
 */
async function acquireCrossTabRefreshLock<T>(work: () => Promise<T>): Promise<T> {
  if (
    typeof navigator !== "undefined" &&
    navigator.locks &&
    typeof navigator.locks.request === "function"
  ) {
    return navigator.locks.request("sekkha:auth:refresh", { mode: "exclusive" }, work)
  }

  // Fallback localStorage mutex for browsers/tests without Web Locks API
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const deadline = Date.now() + FALLBACK_LOCK_WAIT_MS
  let acquired = false

  while (Date.now() < deadline) {
    const now = Date.now()
    const raw = safeStorage.getItem(REFRESH_LOCK_KEY)
    let lockBusy = false
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { owner?: string; expiresAt?: number }
        if (parsed.expiresAt && parsed.expiresAt > now && parsed.owner !== owner) {
          lockBusy = true
        }
      } catch {
        // Malformed lock can be overwritten
      }
    }

    if (!lockBusy) {
      safeStorage.setItem(
        REFRESH_LOCK_KEY,
        JSON.stringify({ owner, expiresAt: now + LOCK_TTL_MS })
      )
      // Re-read immediately to check if another tab overwrote the same slot
      const verifyRaw = safeStorage.getItem(REFRESH_LOCK_KEY)
      try {
        const verifyParsed = verifyRaw ? (JSON.parse(verifyRaw) as { owner?: string }) : null
        if (verifyParsed?.owner === owner) {
          acquired = true
          break
        }
      } catch {
        // Retry
      }
    }

    await sleep(30)
  }

  try {
    return await work()
  } finally {
    if (acquired) {
      const currentRaw = safeStorage.getItem(REFRESH_LOCK_KEY)
      try {
        const parsed = currentRaw ? (JSON.parse(currentRaw) as { owner?: string }) : null
        if (parsed?.owner === owner) {
          safeStorage.removeItem(REFRESH_LOCK_KEY)
        }
      } catch {
        safeStorage.removeItem(REFRESH_LOCK_KEY)
      }
    }
  }
}

function dispatchWindowEvent(eventName: string, detail?: unknown): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }))
  } catch {
    // Ignore in constrained environments
  }
}

function checkSiblingTokenUpdate(
  observedToken: string | null | undefined
): UnifiedRefreshResult | null {
  const latestToken = safeStorage.getItem(ACCESS_TOKEN_KEY)

  if (latestToken && observedToken !== undefined && latestToken !== observedToken) {
    if (!isJwtExpired(latestToken)) {
      return {
        ok: true,
        accessToken: latestToken,
        user: null,
        reusedExisting: true,
      }
    }
  }

  if (lastBroadcastToken && observedToken !== undefined && lastBroadcastToken !== observedToken) {
    if (!isJwtExpired(lastBroadcastToken)) {
      safeStorage.setItem(ACCESS_TOKEN_KEY, lastBroadcastToken)
      return {
        ok: true,
        accessToken: lastBroadcastToken,
        user: null,
        reusedExisting: true,
      }
    }
  }

  if (latestToken === null && observedToken) {
    return {
      ok: false,
      kind: "unauthorized",
      status: 401,
      message: "Session ended in another tab.",
    }
  }

  return null
}

async function performSingleRefreshHttp(): Promise<UnifiedRefreshResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "fetch",
      },
      signal: controller.signal,
    })

    let parsedBody: any = null
    try {
      parsedBody = await response.json()
    } catch {
      parsedBody = null
    }

    const errorCode: string | undefined =
      parsedBody?.data?.error_code ?? parsedBody?.error_code ?? parsedBody?.code
    const message: string =
      parsedBody?.message || parsedBody?.error || `HTTP ${response.status}`

    if (response.status === 409 || errorCode === "REFRESH_CONCURRENT") {
      return {
        ok: false,
        kind: "concurrent",
        status: 409,
        message,
      }
    }

    if (response.status === 429) {
      const retryAfterMs = parseRetryAfterMs(response.headers?.get?.("Retry-After") ?? null)
      rateLimitedUntil = Date.now() + retryAfterMs
      return {
        ok: false,
        kind: "rate_limited",
        status: 429,
        retryAfterMs,
        message,
      }
    }

    if (
      response.status === 403 &&
      typeof errorCode === "string" &&
      errorCode.startsWith("CSRF_")
    ) {
      return {
        ok: false,
        kind: "csrf",
        status: 403,
        message,
      }
    }

    if (response.status === 401 || response.status === 403) {
      safeStorage.removeItem(ACCESS_TOKEN_KEY)
      lastBroadcastToken = null
      postAuthChannelMessage({ type: "SESSION_INVALIDATED" })
      dispatchWindowEvent(SESSION_INVALIDATED_EVENT, { status: response.status, errorCode })
      return {
        ok: false,
        kind: "unauthorized",
        status: response.status,
        message,
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        kind: "transient",
        status: response.status,
        message,
      }
    }

    const data =
      parsedBody && typeof parsedBody === "object" && "data" in parsedBody
        ? parsedBody.data
        : parsedBody
    const accessToken = data?.accessToken
    if (typeof accessToken !== "string" || !accessToken) {
      return {
        ok: false,
        kind: "transient",
        status: response.status,
        message: "Malformed refresh response payload",
      }
    }

    const user = (data?.user as RefreshedUserSummary | undefined) ?? null
    // Persist the new access token BEFORE releasing the lock so subsequent tabs/callers observe it.
    safeStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    lastBroadcastToken = accessToken
    postAuthChannelMessage({ type: "TOKEN_REFRESHED", accessToken })
    dispatchWindowEvent(TOKEN_SYNCED_EVENT, { accessToken, user })

    return {
      ok: true,
      accessToken,
      user,
    }
  } catch (err) {
    return {
      ok: false,
      kind: "transient",
      message:
        err instanceof Error && err.name === "AbortError"
          ? "Session refresh timed out."
          : "Network error during session refresh.",
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Coordinates token refresh across calls in the current tab and across browser tabs:
 * - Captures observedToken before acquiring lock, compares with latest stored token after lock.
 * - Holds the lock until the new access token is persisted to storage.
 * - Distinguishes 401/403 (session invalid), 403 CSRF, 409 REFRESH_CONCURRENT (bounded retry),
 *   429 Rate Limited (respects Retry-After), and transient 5xx/network failures.
 */
export async function coordinatedRefreshSession(options?: {
  observedToken?: string | null
}): Promise<UnifiedRefreshResult> {
  if (inFlightTabRefresh) {
    return inFlightTabRefresh
  }

  const observedToken =
    options?.observedToken !== undefined
      ? options.observedToken
      : safeStorage.getItem(ACCESS_TOKEN_KEY)

  const run = async (): Promise<UnifiedRefreshResult> => {
    return acquireCrossTabRefreshLock(async () => {
      // 1. Check whether another tab or caller already rotated/cleared the token while waiting for the lock.
      const siblingResult = checkSiblingTokenUpdate(observedToken)
      if (siblingResult) {
        return siblingResult
      }

      // 2. Respect prior Retry-After cooldown on 429 rate-limit responses.
      const now = Date.now()
      if (rateLimitedUntil > now) {
        return {
          ok: false,
          kind: "rate_limited",
          status: 429,
          retryAfterMs: rateLimitedUntil - now,
          message: "Too many refresh attempts. Waiting for Retry-After window.",
        }
      }

      // 3. Execute HTTP refresh with bounded backoff retries if backend returns 409 REFRESH_CONCURRENT.
      for (let attempt = 0; attempt <= MAX_CONCURRENT_RETRIES; attempt++) {
        const result = await performSingleRefreshHttp()
        if (result.ok || result.kind !== "concurrent") {
          return result
        }

        if (attempt < MAX_CONCURRENT_RETRIES) {
          await sleep(CONCURRENT_RETRY_BASE_MS * (attempt + 1))
          const afterWaitSibling = checkSiblingTokenUpdate(observedToken)
          if (afterWaitSibling) {
            return afterWaitSibling
          }
        }
      }

      return {
        ok: false,
        kind: "concurrent",
        status: 409,
        message: "Concurrent refresh contention exceeded retry limit.",
      }
    })
  }

  inFlightTabRefresh = run().finally(() => {
    inFlightTabRefresh = null
  })

  return inFlightTabRefresh
}
