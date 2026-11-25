import { describe, it, expect } from "vitest"
import {
  buildProxyTargetUrl,
  resolveUpstreamApiOrigin,
  rewriteSetCookieForFirstParty,
} from "../api-proxy"

describe("Nitro same-origin /api proxy helpers", () => {
  it("resolves upstream origin from API_PROXY_TARGET and strips trailing /api", () => {
    expect(
      resolveUpstreamApiOrigin({
        API_PROXY_TARGET: "https://api-sekkha.example.com/api/",
      })
    ).toBe("https://api-sekkha.example.com")

    expect(
      resolveUpstreamApiOrigin({
        VITE_API_URL: "/api",
        BACKEND_URL: "https://backend.example.org",
      })
    ).toBe("https://backend.example.org")

    expect(resolveUpstreamApiOrigin({})).toBe("http://localhost:4000")
  })

  it("builds valid upstream URL with query string and rejects self-loops", () => {
    const incoming = new URL("https://frontend.vercel.app/api/auth/refresh?v=1")
    expect(
      buildProxyTargetUrl(incoming, { API_PROXY_TARGET: "https://api.otherdomain.id" })
    ).toBe("https://api.otherdomain.id/api/auth/refresh?v=1")

    expect(() =>
      buildProxyTargetUrl(incoming, { API_PROXY_TARGET: "https://frontend.vercel.app" })
    ).toThrow(/loop/i)
  })

  it("rewrites cross-site Set-Cookie into host-only SameSite=Lax first-party cookie", () => {
    const raw =
      "sekkha_refresh_token=abc123; Domain=.otherdomain.id; Path=/api/auth; HttpOnly; Secure; SameSite=None; Partitioned"

    const httpsCookie = rewriteSetCookieForFirstParty(raw, true)
    expect(httpsCookie).not.toMatch(/Domain=/i)
    expect(httpsCookie).not.toMatch(/Partitioned/i)
    expect(httpsCookie).toContain("SameSite=Lax")
    expect(httpsCookie).toContain("HttpOnly")
    expect(httpsCookie).toContain("Secure")
    expect(httpsCookie).toContain("Path=/api/auth")

    const httpCookie = rewriteSetCookieForFirstParty(raw, false)
    expect(httpCookie).toContain("SameSite=Lax")
    expect(httpCookie).not.toMatch(/;\s*Secure\b/i)
  })
})
