import { describe, it, expect } from "bun:test"
import http from "node:http"
import type { AddressInfo } from "node:net"
import { createApp, extractRateLimitSubject, isOriginAllowed } from "../app"

describe("CORS Origin Resolution & Security", () => {
  it("allows exact origin match", () => {
    const rawOrigins = ["https://sekkha.domainanda.com", "http://localhost:3000"]
    expect(isOriginAllowed("https://sekkha.domainanda.com", rawOrigins)).toBe(true)
    expect(isOriginAllowed("http://localhost:3000", rawOrigins)).toBe(true)
    expect(isOriginAllowed("https://otherdomain.com", rawOrigins)).toBe(false)
  })

  it("normalizes trailing slash in origin", () => {
    const rawOrigins = ["https://sekkha.domainanda.com"]
    expect(isOriginAllowed("https://sekkha.domainanda.com/", rawOrigins)).toBe(true)
  })

  it("supports wildcard subdomain matching for Vercel apps (*.vercel.app)", () => {
    const rawOrigins = ["https://*.vercel.app"]
    // Matches production / preview vercel apps
    expect(isOriginAllowed("https://sekkha-puggala.vercel.app", rawOrigins)).toBe(true)
    expect(isOriginAllowed("https://sekkha-preview-git-feature.vercel.app", rawOrigins)).toBe(true)
    // Does not match different domains
    expect(isOriginAllowed("https://attacker-vercel.app.evil.com", rawOrigins)).toBe(false)
    expect(isOriginAllowed("https://evilvercel.app", rawOrigins)).toBe(false)
  })

  it("supports explicit full domain alongside wildcard", () => {
    const rawOrigins = [
      "http://localhost:3000",
      "https://*.vercel.app",
      "https://sekkha-puggala.vercel.app",
    ]
    expect(isOriginAllowed("https://sekkha-puggala.vercel.app", rawOrigins)).toBe(true)
  })

  it("supports wildcard * if explicitly set", () => {
    expect(isOriginAllowed("https://any-domain.com", ["*"])).toBe(true)
  })
})

describe("Shared-IP OTP & Auth Rate Limiting", () => {
  it("extracts normalized email, identifier, refresh token, and bearer subjects", () => {
    expect(
      extractRateLimitSubject({ body: { email: "  User@Gmail.com " }, cookies: {}, headers: {} } as any)
    ).toBe("user@gmail.com")
    expect(
      extractRateLimitSubject({ body: { identifier: "  Budi_01 " }, cookies: {}, headers: {} } as any)
    ).toBe("budi_01")
    expect(
      extractRateLimitSubject({ body: { new_email: "  New@Gmail.com " }, cookies: {}, headers: {} } as any)
    ).toBe("new@gmail.com")
    expect(
      extractRateLimitSubject({ body: {}, cookies: { sekkha_refresh_token: "secret-rt" }, headers: {} } as any)
    ).toMatch(/^rt:[a-f0-9]{16}$/)
    expect(
      extractRateLimitSubject({ body: {}, cookies: {}, headers: { authorization: "Bearer jwt-abc" } } as any)
    ).toMatch(/^bearer:[a-f0-9]{16}$/)
    expect(extractRateLimitSubject({ body: {}, cookies: {}, headers: {} } as any)).toBe("")
  })

  it("allows >10 distinct attendees behind a shared IP to register & log in, while still blocking per-email OTP abuse", async () => {
    const app = createApp()
    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))

    try {
      const { port } = server.address() as AddressInfo
      const baseUrl = `http://127.0.0.1:${port}`
      const uniqueRun = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
      const sharedIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`

      // 1. 12 distinct users registering from the same shared Vihara Wi-Fi IP must not trigger 429
      // (Uses non-gmail validation failure at controller level so zero DB/SMTP side-effects occur)
      for (let i = 1; i <= 12; i++) {
        const res = await fetch(`${baseUrl}/api/auth/register-request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": sharedIp,
          },
          body: JSON.stringify({
            email: `attendee-${uniqueRun}-${i}@example.com`,
            password: "short",
            name: `User ${i}`,
          }),
        })
        expect(res.status).toBe(400)
      }

      // 2. 12 distinct users hitting /api/auth/login from the same IP must not trigger 429
      for (let i = 1; i <= 12; i++) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": sharedIp,
          },
          body: JSON.stringify({
            identifier: `login-${uniqueRun}-${i}@gmail.com`,
          }),
        })
        expect(res.status).toBe(400)
      }

      // 3. A single abusive email exceeding >10 OTP requests from that same IP gets blocked on request #11
      const abusedEmail = `spammer-${uniqueRun}@example.com`
      for (let attempt = 1; attempt <= 10; attempt++) {
        const res = await fetch(`${baseUrl}/api/auth/register-request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": sharedIp,
          },
          body: JSON.stringify({
            email: abusedEmail,
            password: "short",
            name: "Spammer",
          }),
        })
        expect(res.status).toBe(400)
      }

      const blockedRes = await fetch(`${baseUrl}/api/auth/register-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": sharedIp,
        },
        body: JSON.stringify({
          email: abusedEmail,
          password: "short",
          name: "Spammer",
        }),
      })
      expect(blockedRes.status).toBe(429)
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      )
    }
  })
})
