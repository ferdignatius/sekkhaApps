/**
 * Checks whether a JWT access token has a valid `exp` claim that is expired
 * (or within `skewMs` of expiring).
 *
 * Returns `false` for non-JWT / opaque strings or tokens without an `exp` claim
 * so callers fall back to server-side verification.
 */
export function isJwtExpired(token: string, skewMs = 5_000): boolean {
  const parts = token.split(".")
  if (parts.length !== 3 || !parts[1]) return false

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    const payloadJson =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8")
    const payload = JSON.parse(payloadJson) as { exp?: unknown }
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return false
    }
    return payload.exp * 1000 <= Date.now() + skewMs
  } catch {
    return false
  }
}
