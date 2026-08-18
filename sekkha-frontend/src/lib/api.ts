// lib/api — Shared API client for communicating with sekkha-api backend.
// All HTTP calls to the backend go through this module.

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api"

export { API_BASE_URL }

/**
 * Get the stored auth token from localStorage.
 */
function getToken(): string | null {
  return localStorage.getItem("sekkha_access_token")
}

/**
 * Build headers with auth token if available.
 */
function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const token = getToken()
  if (token && token !== "dummy.admin.token") {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

/**
 * Generic API fetch wrapper with auth headers and error handling.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }))
    const error = new Error(body.error || `HTTP ${response.status}`)
    ;(error as any).status = response.status
    ;(error as any).body = body
    throw error
  }

  return response.json() as Promise<T>
}

/**
 * Shorthand methods
 */
export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path, { method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),

  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),

  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),

  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
}
