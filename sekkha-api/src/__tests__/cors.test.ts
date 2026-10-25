import { describe, it, expect } from "bun:test"
import { isOriginAllowed } from "../app"

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
