// lib/api — Shared API client for communicating with sekkha-api backend.
// Supports credentials: "include" for HttpOnly cookies, auto-refresh on 401, and Zod response validation.

import type { ZodType } from "zod"
import { safeStorage } from "./storage"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api"

export { API_BASE_URL }

export interface ApiRequestOptions extends RequestInit {
  schema?: ZodType<any>
}

/**
 * Get the stored auth token safely.
 */
function getToken(): string | null {
  return safeStorage.getItem("sekkha_access_token")
}

/**
 * Build headers with auth token if available.
 */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const token = getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

// Concurrency control for transparent token refresh (XF-02 Remediation)
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function requestTokenRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }
  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      })
      if (!res.ok) {
        safeStorage.removeItem("sekkha_access_token")
        return null
      }
      const data = await res.json()
      if (data?.accessToken) {
        safeStorage.setItem("sekkha_access_token", data.accessToken)
        return data.accessToken as string
      }
      return null
    } catch {
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()
  return refreshPromise
}

/**
 * Generic API fetch wrapper with auth headers, auto-refresh on 401, and error handling.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  let response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })

  // Auto-refresh token on 401 if session is active and not on an auth endpoint
  const isAuthEndpoint =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/refresh")

  if (response.status === 401 && !isAuthEndpoint && getToken()) {
    const newToken = await requestTokenRefresh()
    if (newToken) {
      // Retry original request with fresh access token
      response = await fetch(url, {
        credentials: "include",
        ...options,
        headers: {
          ...authHeaders(),
          ...(options.headers || {}),
          Authorization: `Bearer ${newToken}`,
        },
      })
    }
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    let body: any = null
    try {
      const text = await response.text()
      try {
        body = JSON.parse(text)
        errorMsg = body.error || body.message || errorMsg
      } catch {
        errorMsg = text || errorMsg
      }
    } catch {}
    const error = new Error(errorMsg)
    ;(error as any).status = response.status
    ;(error as any).body = body
    throw error
  }

  const rawJson = await response.json()

  // FE-06 Remediation: Runtime response schema validation using Zod
  if (options.schema) {
    return options.schema.parse(rawJson) as T
  }

  return rawJson as Promise<T>
}

/**
 * Shorthand methods
 */
export const api = {
  get: <T = unknown>(path: string, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { method: "GET", ...options }),

  post: <T = unknown>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions
  ) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T = unknown>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions
  ) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T = unknown>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions
  ) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T = unknown>(path: string, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { method: "DELETE", ...options }),
}
