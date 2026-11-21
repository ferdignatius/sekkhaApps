import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  ACCESS_TOKEN_KEY,
  REFRESH_LOCK_KEY,
  SESSION_INVALIDATED_EVENT,
  coordinatedRefreshSession,
  resetRefreshCoordinatorForTests,
} from "../authRefresh"
import { safeStorage } from "../storage"

function makeJwt(expOffsetSeconds: number): string {
  const payload = btoa(
    JSON.stringify({ sub: "usr_1", exp: Math.floor(Date.now() / 1000) + expOffsetSeconds })
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`
}

describe("coordinatedRefreshSession — Cross-tab Locking, Error Classification & Retry-After", () => {
  beforeEach(() => {
    localStorage.clear()
    resetRefreshCoordinatorForTests()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    resetRefreshCoordinatorForTests()
    vi.restoreAllMocks()
  })

  it("compares observedToken vs latestToken inside lock (adopts sibling rotated token even for opaque/non-expired strings)", async () => {
    safeStorage.setItem(ACCESS_TOKEN_KEY, "token-tab-1-observed")

    // Simulate Web Locks holding briefly while Tab 1 writes a new token into storage
    vi.stubGlobal("navigator", {
      locks: {
        request: async (_name: string, _opts: unknown, cb: () => Promise<unknown>) => {
          safeStorage.setItem(ACCESS_TOKEN_KEY, "token-rotated-by-sibling-tab")
          return cb()
        },
      },
    })

    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const result = await coordinatedRefreshSession({
      observedToken: "token-tab-1-observed",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.accessToken).toBe("token-rotated-by-sibling-tab")
      expect(result.reusedExisting).toBe(true)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("falls back safely to localStorage mutex when Web Locks API is unavailable and releases lock after persistence", async () => {
    vi.stubGlobal("navigator", {}) // No navigator.locks
    const oldJwt = makeJwt(-120)
    const freshJwt = makeJwt(900)
    safeStorage.setItem(ACCESS_TOKEN_KEY, oldJwt)

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          data: { accessToken: freshJwt, user: { id: "usr_1", role: "member" } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await coordinatedRefreshSession({ observedToken: oldJwt })

    expect(result.ok).toBe(true)
    expect(safeStorage.getItem(ACCESS_TOKEN_KEY)).toBe(freshJwt)
    expect(safeStorage.getItem(REFRESH_LOCK_KEY)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("retries boundedly on 409 REFRESH_CONCURRENT without deleting stored session or firing invalidation", async () => {
    const freshJwt = makeJwt(900)
    safeStorage.setItem(ACCESS_TOKEN_KEY, "old-token")

    const invalidatedSpy = vi.fn()
    window.addEventListener(SESSION_INVALIDATED_EVENT, invalidatedSpy)

    let attempts = 0
    const fetchMock = vi.fn().mockImplementation(() => {
      attempts++
      if (attempts === 1) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: "fail",
              code: 409,
              message: "Concurrent refresh already in progress",
              data: { error_code: "REFRESH_CONCURRENT" },
            }),
            { status: 409, headers: { "Content-Type": "application/json" } }
          )
        )
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: "success",
            data: { accessToken: freshJwt },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await coordinatedRefreshSession({ observedToken: "old-token" })

    window.removeEventListener(SESSION_INVALIDATED_EVENT, invalidatedSpy)
    expect(result.ok).toBe(true)
    expect(attempts).toBe(2)
    expect(invalidatedSpy).not.toHaveBeenCalled()
    expect(safeStorage.getItem(ACCESS_TOKEN_KEY)).toBe(freshJwt)
  })

  it("respects Retry-After on HTTP 429 without nuking token and avoids re-hitting backend during cooldown", async () => {
    safeStorage.setItem(ACCESS_TOKEN_KEY, "keep-token-during-429")

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Too many refresh attempts" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "12",
        },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const first = await coordinatedRefreshSession({ observedToken: "keep-token-during-429" })
    expect(first.ok).toBe(false)
    if (!first.ok) {
      expect(first.kind).toBe("rate_limited")
      expect(first.retryAfterMs).toBe(12_000)
    }
    expect(safeStorage.getItem(ACCESS_TOKEN_KEY)).toBe("keep-token-during-429")

    // Second call during Retry-After cooldown must not even touch fetch
    const second = await coordinatedRefreshSession({ observedToken: "keep-token-during-429" })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.kind).toBe("rate_limited")
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("distinguishes 403 CSRF failure and 503 transient failure from confirmed 401 unauthorized invalidation", async () => {
    safeStorage.setItem(ACCESS_TOKEN_KEY, "active-tok")
    const invalidatedSpy = vi.fn()
    window.addEventListener(SESSION_INVALIDATED_EVENT, invalidatedSpy)

    // 1. 403 CSRF -> preserves token, does not invalidate session
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "fail",
            code: 403,
            message: "Untrusted Origin",
            data: { error_code: "CSRF_ORIGIN_DENIED" },
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      )
    )
    const csrfRes = await coordinatedRefreshSession({ observedToken: "active-tok" })
    expect(csrfRes.ok).toBe(false)
    if (!csrfRes.ok) expect(csrfRes.kind).toBe("csrf")
    expect(safeStorage.getItem(ACCESS_TOKEN_KEY)).toBe("active-tok")
    expect(invalidatedSpy).not.toHaveBeenCalled()

    // 2. 503 Transient -> preserves token
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Redis offline" }), { status: 503 })
      )
    )
    const transientRes = await coordinatedRefreshSession({ observedToken: "active-tok" })
    expect(transientRes.ok).toBe(false)
    if (!transientRes.ok) expect(transientRes.kind).toBe("transient")
    expect(safeStorage.getItem(ACCESS_TOKEN_KEY)).toBe("active-tok")
    expect(invalidatedSpy).not.toHaveBeenCalled()

    // 3. 401 Confirmed Unauthorized -> clears token & dispatches session-invalidated event
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "fail",
            code: 401,
            message: "Invalid refresh token",
            data: { error_code: "INVALID_REFRESH_TOKEN" },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      )
    )
    const unauthRes = await coordinatedRefreshSession({ observedToken: "active-tok" })
    expect(unauthRes.ok).toBe(false)
    if (!unauthRes.ok) expect(unauthRes.kind).toBe("unauthorized")
    expect(safeStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull()
    expect(invalidatedSpy).toHaveBeenCalledTimes(1)

    window.removeEventListener(SESSION_INVALIDATED_EVENT, invalidatedSpy)
  })
})
