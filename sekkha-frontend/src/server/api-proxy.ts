import { defineHandler, proxyRequest } from "nitro/h3"

const PROXY_TIMEOUT_MS = 15_000

/**
 * Resolves the upstream backend origin from server runtime env variables,
 * stripping any trailing `/api` suffix so `/api/**` forwards 1:1.
 */
export function resolveUpstreamApiOrigin(
  env: Record<string, string | undefined> = process.env
): string {
  const candidates = [env.API_PROXY_TARGET, env.BACKEND_URL, env.VITE_API_URL]
  for (const raw of candidates) {
    const trimmed = raw?.trim()
    if (!trimmed || trimmed.startsWith("/")) continue
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported proxy target protocol: ${parsed.protocol}`)
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, "").replace(/\/api$/, "")
    return `${parsed.origin}${cleanPath}`
  }
  return "http://localhost:4000"
}

/**
 * Builds the validated upstream target URL for `/api/**` requests and blocks path traversal or self-loops.
 */
export function buildProxyTargetUrl(
  incomingUrl: URL,
  env: Record<string, string | undefined> = process.env
): string {
  if (incomingUrl.pathname !== "/api" && !incomingUrl.pathname.startsWith("/api/")) {
    throw new Error("Proxy only handles /api routes")
  }
  if (incomingUrl.pathname.includes("..")) {
    throw new Error("Invalid proxy path")
  }

  const upstreamBase = resolveUpstreamApiOrigin(env)
  const target = new URL(`${upstreamBase}${incomingUrl.pathname}${incomingUrl.search}`)
  if (target.origin === incomingUrl.origin) {
    throw new Error("Refusing proxy loop to the same origin")
  }
  return target.toString()
}

/**
 * Rewrites upstream Set-Cookie headers so auth cookies become first-party host-only
 * `SameSite=Lax` cookies owned by the frontend origin.
 */
export function rewriteSetCookieForFirstParty(rawCookie: string, isHttps: boolean): string {
  let rewritten = rawCookie
    .replace(/;\s*Domain=[^;]*/gi, "")
    .replace(/;\s*SameSite=(?:None|Strict|Lax)/gi, "; SameSite=Lax")
    .replace(/;\s*Partitioned\b/gi, "")

  if (isHttps) {
    if (!/;\s*Secure\b/i.test(rewritten)) {
      rewritten += "; Secure"
    }
  } else {
    rewritten = rewritten.replace(/;\s*Secure\b/gi, "")
  }

  return rewritten
}

export default defineHandler(async (event) => {
  let targetUrl: string
  try {
    targetUrl = buildProxyTargetUrl(event.url)
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "fail",
        code: 502,
        message: err instanceof Error ? err.message : "Invalid API proxy configuration",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  const upstreamResponse = await proxyRequest(event, targetUrl, {
    xfwd: true,
    timeout: PROXY_TIMEOUT_MS,
    cookieDomainRewrite: { "*": "" },
  })

  const setCookies = upstreamResponse.headers.getSetCookie?.() ?? []
  if (setCookies.length === 0) {
    return upstreamResponse
  }

  const forwardedProto = event.req.headers.get("x-forwarded-proto")?.toLowerCase()
  const isHttps = forwardedProto === "https" || event.url.protocol === "https:"

  const headers = new Headers(upstreamResponse.headers)
  headers.delete("set-cookie")
  for (const cookie of setCookies) {
    headers.append("set-cookie", rewriteSetCookieForFirstParty(cookie, isHttps))
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  })
})
