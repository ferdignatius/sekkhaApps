import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import http from "node:http"
import type { AddressInfo } from "node:net"
import { createApp } from "../../../app"
import { redis } from "../../../lib/redis"
import { authModels } from "../models"
import { refreshSession } from "../services"
import {
  saveRefreshToken,
  peekRefreshTokenStatus,
  revokeAllUserRefreshTokens,
  acquireRefreshTokenLock,
  releaseRefreshTokenLock,
  hashRefreshToken,
} from "../internal/refreshTokenStore"

describe("Auth Security Remediation Integration Tests", () => {
  const originalFindById = authModels.findUserById

  beforeEach(() => {
    process.env.JWT_SECRET = "test-super-secret-key-that-is-at-least-32-chars-long"
    authModels.findUserById = async (id: string) =>
      ({
        id,
        userNumber: 2026112101n,
        email: "session-test@gmail.com",
        username: "sessiontest",
        name: "Session Tester",
        role: "member",
        onboardingCompleted: true,
        passwordChangedAt: null,
      }) as any
  })

  afterEach(() => {
    authModels.findUserById = originalFindById
  })

  it("returns 409 REFRESH_CONCURRENT on lock contention without clearing cookie or revoking healthy family", async () => {
    const rt = "concurrent_refresh_token_sample_001"
    await saveRefreshToken("usr_conc_1", rt, 600, "fam_conc_1")
    const tokenHash = hashRefreshToken(rt)

    // Hold distributed per-token lock as if Tab 1 is mid-rotation
    const locked = await acquireRefreshTokenLock(tokenHash, "tab-1-owner", 5000)
    expect(locked).toBe(true)

    const app = createApp()
    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))

    try {
      const { port } = server.address() as AddressInfo
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
          Cookie: `sekkha_refresh_token=${rt}`,
        },
      })

      expect(res.status).toBe(409)
      const body = (await res.json()) as any
      expect(body.data?.error_code).toBe("REFRESH_CONCURRENT")

      // Critical: 409 must NOT emit a clearing Set-Cookie header
      const setCookie = res.headers.get("set-cookie") || ""
      expect(setCookie).not.toContain("sekkha_refresh_token=;")

      // Original token & family must still be intact once lock is released
      await releaseRefreshTokenLock(tokenHash, "tab-1-owner")
      const rotated = await refreshSession(rt)
      expect(rotated.accessToken).toBeDefined()
      expect(rotated.refreshToken).toBeDefined()
    } finally {
      await releaseRefreshTokenLock(tokenHash, "tab-1-owner")
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      )
    }
  })

  it("revokes only compromised token family on confirmed reuse while preserving other device sessions", async () => {
    const deviceAToken1 = "device_a_rt_initial"
    const deviceBToken = "device_b_rt_healthy"

    await saveRefreshToken("usr_multi_dev", deviceAToken1, 600, "family_device_a")
    await saveRefreshToken("usr_multi_dev", deviceBToken, 600, "family_device_b")

    // Device A rotates legitimately: deviceAToken1 -> deviceAToken2
    const rotatedA = await refreshSession(deviceAToken1)
    const deviceAToken2 = rotatedA.refreshToken!
    expect(deviceAToken2).not.toBe(deviceAToken1)

    // Attacker replays old deviceAToken1 -> confirmed reuse
    let reuseErr: any = null
    try {
      await refreshSession(deviceAToken1)
    } catch (err) {
      reuseErr = err
    }
    expect(reuseErr?.status).toBe(401)
    expect(reuseErr?.code).toBe("INVALID_REFRESH_TOKEN")

    // Compromised family_device_a (including deviceAToken2) MUST now be revoked
    let familyAErr: any = null
    try {
      await refreshSession(deviceAToken2)
    } catch (err) {
      familyAErr = err
    }
    expect(familyAErr?.status).toBe(401)

    // Healthy Device B session MUST remain untouched and rotatable
    const rotatedB = await refreshSession(deviceBToken)
    expect(rotatedB.accessToken).toBeDefined()
    expect(rotatedB.refreshToken).toBeDefined()

    // Full account revocation revokes Device B's new token too (e.g. password reset)
    await revokeAllUserRefreshTokens("usr_multi_dev")
    const afterAllRevoked = await peekRefreshTokenStatus(rotatedB.refreshToken!)
    expect(afterAllRevoked.status).toBe("missing")
  })

  it("preserves old refresh token intact if saving new token fails in production store", async () => {
    const originalEnv = process.env.NODE_ENV
    const origStatus = redis.status
    const origGet = redis.get.bind(redis)
    const origSet = redis.set.bind(redis)
    const origEval = redis.eval.bind(redis)

    const oldToken = "recoverable_old_token_001"
    const storedRecord = JSON.stringify({
      userId: "usr_recover",
      familyId: "fam_recover",
      createdAt: Date.now() - 1000,
      expiresAt: Date.now() + 60_000,
    })

    let deletedOldKey = false
    let injectedFailCount = 0

    try {
      process.env.NODE_ENV = "production"
      Object.defineProperty(redis, "status", { value: "ready", configurable: true })

      ;(redis as any).set = async (key: string, ...args: any[]) => {
        if (key.endsWith(":lock")) {
          return "OK"
        }
        if (key.startsWith("{auth:refresh:") && injectedFailCount === 0) {
          injectedFailCount++
          throw new Error("Simulated Redis write outage")
        }
        return "OK"
      }
      ;(redis as any).get = async (key: string) => {
        if (key.endsWith(":used")) return null
        if (key.startsWith("{auth:refresh:") && !deletedOldKey) return storedRecord
        return null
      }
      ;(redis as any).eval = async (_script: string, numKeys: number, key: string) => {
        if (!key.endsWith(":lock") && numKeys === 2) {
          deletedOldKey = true
          return storedRecord
        }
        return 1
      }

      let failErr: any = null
      try {
        await refreshSession(oldToken)
      } catch (err) {
        failErr = err
      }
      expect(failErr?.message).toBe("Refresh token store unavailable")
      // Old token was NEVER deleted when saving the new token failed
      expect(deletedOldKey).toBe(false)
    } finally {
      process.env.NODE_ENV = originalEnv
      Object.defineProperty(redis, "status", { value: origStatus, configurable: true })
      ;(redis as any).get = origGet
      ;(redis as any).set = origSet
      ;(redis as any).eval = origEval
    }
  })

  it("clears logout cookie reliably even when Redis is unavailable in production (returns 503)", async () => {
    const originalEnv = process.env.NODE_ENV
    const origStatus = redis.status

    const app = createApp()
    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))

    try {
      process.env.NODE_ENV = "production"
      Object.defineProperty(redis, "status", { value: "end", configurable: true })

      const { port } = server.address() as AddressInfo
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
          Cookie: "sekkha_refresh_token=some_active_refresh_token",
        },
      })

      expect(res.status).toBe(503)
      const setCookie = res.headers.get("set-cookie") || ""
      expect(setCookie).toContain("sekkha_refresh_token=;")
    } finally {
      process.env.NODE_ENV = originalEnv
      Object.defineProperty(redis, "status", { value: origStatus, configurable: true })
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      )
    }
  })

  it("enforces CSRF origin & form-submission protection on /refresh & /logout and isolates /refresh rate limits from /login", async () => {
    process.env.CORS_ORIGIN = "https://sekkha-puggala.vercel.app"
    const app = createApp()
    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))

    try {
      const { port } = server.address() as AddressInfo
      const baseUrl = `http://127.0.0.1:${port}`

      // 1. Untrusted Origin on /api/auth/refresh -> 403 CSRF_ORIGIN_DENIED
      const badOriginRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Origin: "https://evil-attacker.com",
          "Content-Type": "application/json",
        },
      })
      expect(badOriginRes.status).toBe(403)
      const badOriginBody = (await badOriginRes.json()) as any
      expect(badOriginBody.data?.error_code).toBe("CSRF_ORIGIN_DENIED")

      // 2. HTML form Content-Type without custom header on /api/auth/logout -> 403 CSRF_HEADER_REQUIRED
      const formCsrfRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          Origin: "https://sekkha-puggala.vercel.app",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "foo=bar",
      })
      expect(formCsrfRes.status).toBe(403)
      const formBody = (await formCsrfRes.json()) as any
      expect(formBody.data?.error_code).toBe("CSRF_HEADER_REQUIRED")

      // 3. Shared IP hammering /refresh 25 times does not trip /login authLimiter (20/15m)
      const sharedIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`
      for (let i = 0; i < 25; i++) {
        const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: {
            Origin: "https://sekkha-puggala.vercel.app",
            "Content-Type": "application/json",
            "X-Requested-With": "fetch",
            "X-Forwarded-For": sharedIp,
          },
        })
        expect(refreshRes.status).toBe(401)
      }

      // Login from same IP must NOT be 429-blocked because of refresh traffic
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": sharedIp,
        },
        body: JSON.stringify({ identifier: `fresh-${Date.now()}@gmail.com` }),
      })
      expect(loginRes.status).toBe(400)
    } finally {
      delete process.env.CORS_ORIGIN
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      )
    }
  })
})
