/**
 * Resolves the base URL for API requests.
 *
 * - Explicit `VITE_API_URL` wins unless `VITE_USE_API_PROXY="true"` forces same-origin `/api`.
 * - In production builds without `VITE_API_URL`, defaults to same-origin `"/api"` (handled by Nitro proxy)
 *   so HttpOnly auth cookies stay first-party even when frontend and backend live on different domains.
 * - In local dev/test on localhost without `VITE_API_URL`, points to `http://localhost:4000/api`.
 */
export function resolveApiBaseUrl(): string {
  if (import.meta.env.VITE_USE_API_PROXY === "true") {
    return "/api"
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  if (!import.meta.env.DEV) {
    return "/api"
  }
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "/api"
  }
  return "http://localhost:4000/api"
}

export const API_BASE_URL = resolveApiBaseUrl()
