// Feature: auth-flow
// Auth service: HTTP calls to backend auth endpoints with timeout support.
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.1, 7.2, 7.3, 7.4

import type { Dispatch } from "react"
import type { AuthAction } from "../context/authReducer"
import { AuthError } from "../context/authReducer"
import { API_BASE_URL } from "@/lib/api"

// ─── Constants ─────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "sekkha_access_token" as const

// ─── Backend Response Types ────────────────────────────────────────────────────

import type { UserRole } from "../context/authReducer"

interface AuthSuccessResponse {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

// ─── fetchWithTimeout ──────────────────────────────────────────────────────────

/**
 * Wrapper around `fetch` that aborts the request after `timeoutMs` milliseconds.
 * Throws `AuthError("NETWORK_TIMEOUT")` on abort/timeout.
 *
 * Requirements: 7.3 (timeout → banner with timeout message)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AuthError(
        "NETWORK_TIMEOUT",
        "Koneksi bermasalah. Periksa koneksi internet Anda dan coba lagi.",
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── AuthService Factory ───────────────────────────────────────────────────────

/**
 * Creates an auth service instance bound to a specific `dispatch` function.
 * This pattern lets AuthContext pass its own `dispatch` without prop drilling.
 *
 * Usage:
 * ```ts
 * const service = createAuthService(dispatch)
 * await service.login(email, password)
 * ```
 */
export function createAuthService(dispatch: Dispatch<AuthAction>) {
  // ── login ──────────────────────────────────────────────────────────────────
  /**
   * POST /auth/login with a 10 000 ms timeout.
   * On success: stores token in localStorage and dispatches AUTH_SUCCESS.
   * On 401: throws AuthError("INVALID_CREDENTIALS").
   * On 500 / other: throws AuthError("UNKNOWN_ERROR").
   *
   * Requirements: 4.2, 7.1, 7.3, 7.4
   */
  async function login(email: string, password: string): Promise<void> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
        10_000,
      )
    } catch (error) {
      // Re-throw AuthError (NETWORK_TIMEOUT) or unknown errors
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "Terjadi kesalahan. Silakan coba beberapa saat lagi.",
      )
    }

    if (response.ok) {
      const data = (await response.json()) as AuthSuccessResponse
      localStorage.setItem(STORAGE_KEY, data.accessToken)
      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          accessToken: data.accessToken,
          userId: data.user?.id ?? (data as any).userId ?? "user-1",
          role: (data.user?.role as UserRole) ?? ((data as any).role as UserRole) ?? "umat",
        },
      })
      return
    }

    if (response.status === 401) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Email atau password salah. Silakan coba lagi.",
      )
    }

    // 500 or any other unexpected status
    throw new AuthError(
      "UNKNOWN_ERROR",
      "Terjadi kesalahan. Silakan coba beberapa saat lagi.",
    )
  }

  // ── register ───────────────────────────────────────────────────────────────
  /**
   * POST /auth/register with a 10 000 ms timeout.
   * On success: stores token in localStorage and dispatches AUTH_SUCCESS.
   * On 409: throws AuthError("EMAIL_ALREADY_EXISTS").
   * On other errors: throws AuthError("UNKNOWN_ERROR").
   *
   * Requirements: 4.1, 7.2, 7.3, 7.4
   */
  async function register(email: string, password: string): Promise<void> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name: email.split("@")[0] }),
        },
        10_000,
      )
    } catch (error) {
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "Terjadi kesalahan. Silakan coba beberapa saat lagi.",
      )
    }

    if (response.ok) {
      const data = (await response.json()) as AuthSuccessResponse
      localStorage.setItem(STORAGE_KEY, data.accessToken)
      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          accessToken: data.accessToken,
          userId: data.user?.id ?? (data as any).userId ?? "user-1",
          role: (data.user?.role as UserRole) ?? ((data as any).role as UserRole) ?? "umat",
        },
      })
      return
    }

    if (response.status === 409) {
      throw new AuthError(
        "EMAIL_ALREADY_EXISTS",
        "Email sudah digunakan. Silakan gunakan email lain atau masuk ke akun Anda.",
      )
    }

    throw new AuthError(
      "UNKNOWN_ERROR",
      "Terjadi kesalahan. Silakan coba beberapa saat lagi.",
    )
  }

  // ── verifyToken ────────────────────────────────────────────────────────────
  /**
   * GET /auth/verify with a 3 000 ms timeout.
   * On 200: returns void (caller updates state to authenticated).
   * On 401 / 403: throws AuthError("INVALID_CREDENTIALS") so caller can clean up.
   *
   * Requirements: 4.3, 4.4, 4.5, 4.7
   */
  async function verifyToken(token: string): Promise<void> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/verify`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
        3_000,
      )
    } catch (error) {
      // NETWORK_TIMEOUT propagates as-is; other errors become UNKNOWN_ERROR
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "Terjadi kesalahan. Silakan coba beberapa saat lagi.",
      )
    }

    if (response.ok) {
      // Verification succeeded — caller is responsible for dispatching AUTH_SUCCESS
      return
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Sesi tidak valid. Silakan login kembali.",
      )
    }

    throw new AuthError(
      "UNKNOWN_ERROR",
      "Terjadi kesalahan. Silakan coba beberapa saat lagi.",
    )
  }

  // ── logout ─────────────────────────────────────────────────────────────────
  /**
   * Clears the stored token and dispatches AUTH_LOGOUT.
   *
   * Requirements: 4.6
   */
  function logout(): void {
    localStorage.removeItem(STORAGE_KEY)
    dispatch({ type: "AUTH_LOGOUT" })
  }

  // ── initiateGoogleOAuth ────────────────────────────────────────────────────
  /**
   * Initiates the Google OAuth flow by redirecting to the backend OAuth entry
   * point at `/auth/google`.
   *
   * Throws `AuthError("OAUTH_FAILED")` if the redirect cannot be initiated
   * (e.g., programmatic navigation is blocked).
   *
   * Requirements: 8.4, 8.6, 8.7
   */
  function initiateGoogleOAuth(): void {
    try {
      window.location.href = "http://localhost:4000/api/auth/google"
    } catch {
      throw new AuthError(
        "OAUTH_FAILED",
        "Autentikasi dengan Google gagal. Silakan coba lagi.",
      )
    }
  }

  return { login, register, verifyToken, logout, initiateGoogleOAuth }
}

// ─── Type alias for the service instance ──────────────────────────────────────

export type AuthService = ReturnType<typeof createAuthService>
