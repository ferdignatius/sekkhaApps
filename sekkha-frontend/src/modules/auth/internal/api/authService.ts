// Feature: auth-flow
// Auth service: HTTP calls to backend auth endpoints with timeout support.
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.1, 7.2, 7.3, 7.4

import type { Dispatch } from "react"
import { AuthError } from "../context/authReducer"
import type { AuthAction, UserRole } from "../context/authReducer"
import { API_BASE_URL, clearApiCache } from "@/lib/api"
import { safeStorage } from "@/lib/storage"

// ─── Constants ─────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "sekkha_access_token" as const

// ─── Backend Response Types ────────────────────────────────────────────────────

export interface VerifyUserResponse {
  id?: string
  userId?: string
  user_number?: string | number | bigint | null
  email?: string | null
  username?: string | null
  name?: string | null
  role?: string | null
  onboarding_completed?: boolean
  onboardingCompleted?: boolean
}

interface AuthSuccessResponse {
  accessToken: string
  user: {
    id: string
    email: string
    username?: string
    name: string
    role: string
    onboarding_completed?: boolean
  }
}

interface ApiEnvelope<T> {
  status: "success" | "fail"
  code: number
  message: string
  data: T
}

function unwrap<T>(response: ApiEnvelope<T> | T): T {
  if (response && typeof response === "object" && "status" in response) {
    if ((response as ApiEnvelope<T>).status !== "success") {
      throw new Error((response as ApiEnvelope<T>).message)
    }
    return (response as ApiEnvelope<T>).data
  }
  return response as T
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
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AuthError(
        "NETWORK_TIMEOUT",
        "Connection issue. Please check your internet connection and try again."
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
  async function login(
    identifier: string,
    password: string
  ): Promise<{ onboardingCompleted?: boolean }> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        },
        10_000
      )
    } catch (error) {
      // Re-throw AuthError (NETWORK_TIMEOUT) or unknown errors
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "An unexpected error occurred. Please try again in a moment."
      )
    }

    if (response.ok) {
      const data = unwrap(
        (await response.json()) as ApiEnvelope<AuthSuccessResponse>
      )
      const onboardingCompleted = data.user?.onboarding_completed
      clearApiCache()
      safeStorage.setItem(STORAGE_KEY, data.accessToken)
      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          accessToken: data.accessToken,
          userId: data.user?.id ?? (data as any).userId ?? "user-1",
          role:
            (data.user?.role as UserRole) ??
            ((data as any).role as UserRole) ??
            "member",
          name: data.user?.name ?? null,
          email: data.user?.email ?? null,
          ...(data.user?.username !== undefined && {
            username: data.user.username,
          }),
          ...(onboardingCompleted !== undefined && {
            onboardingCompleted,
          }),
        },
      })
      return { onboardingCompleted }
    }

    if (response.status === 401) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Incorrect email/username or password. Please try again."
      )
    }

    // 500 or any other unexpected status
    throw new AuthError(
      "UNKNOWN_ERROR",
      "An unexpected error occurred. Please try again in a moment."
    )
  }

  // ── requestRegisterOtp ───────────────────────────────────────────────────
  /**
   * POST /auth/register-request — Validates input and triggers 6-digit OTP email.
   */
  async function requestRegisterOtp(
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; message: string }> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/register-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name: name?.trim() || email.split("@")[0],
          }),
        },
        10_000
      )
    } catch (error) {
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "Connection error. Please try again in a moment."
      )
    }

    if (response.ok) {
      const data = await response.json()
      return data
    }

    if (response.status === 409) {
      throw new AuthError(
        "EMAIL_ALREADY_EXISTS",
        "Email is already registered. Please sign in or use a different email."
      )
    }

    const errData = await response.json().catch(() => null)
    throw new AuthError(
      "UNKNOWN_ERROR",
      errData?.error ||
        errData?.message ||
        "Failed to send verification code. Please check your details."
    )
  }

  // ── verifyRegisterOtp ────────────────────────────────────────────────────
  /**
   * POST /auth/register-verify-otp — Submits 6-digit OTP to create user and obtain token.
   */
  async function verifyRegisterOtp(email: string, otp: string): Promise<void> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/register-verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        },
        10_000
      )
    } catch (error) {
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "Connection issue. Please check your internet connection and try again."
      )
    }

    if (response.ok) {
      const data = unwrap(
        (await response.json()) as ApiEnvelope<AuthSuccessResponse>
      )
      clearApiCache()
      safeStorage.setItem(STORAGE_KEY, data.accessToken)
      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          accessToken: data.accessToken,
          userId: data.user?.id ?? (data as any).userId ?? "user-1",
          role:
            (data.user?.role as UserRole) ??
            ((data as any).role as UserRole) ??
            "member",
          name: data.user?.name ?? null,
          email: data.user?.email ?? null,
          ...(data.user?.username !== undefined && {
            username: data.user.username,
          }),
        },
      })
      return
    }

    const errData = await response.json().catch(() => null)
    throw new AuthError(
      "INVALID_CREDENTIALS",
      errData?.error ||
        errData?.message ||
        "Incorrect or expired verification code. Please check again."
    )
  }

  // ── resendRegisterOtp ────────────────────────────────────────────────────
  /**
   * POST /auth/resend-otp — Resends fresh OTP to the email.
   */
  async function resendRegisterOtp(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/resend-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
        10_000
      )
    } catch (error) {
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "Connection issue. Please try again in a moment."
      )
    }

    if (response.ok) {
      const data = await response.json()
      return data
    }

    const errData = await response.json().catch(() => null)
    throw new AuthError(
      "UNKNOWN_ERROR",
      errData?.error ||
        errData?.message ||
        "Failed to resend verification code."
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
  async function register(
    email: string,
    password: string,
    name?: string
  ): Promise<void> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name: name?.trim() || email.split("@")[0],
          }),
        },
        10_000
      )
    } catch (error) {
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "An unexpected error occurred. Please try again in a moment."
      )
    }

    if (response.ok) {
      const data = unwrap(
        (await response.json()) as ApiEnvelope<AuthSuccessResponse>
      )
      clearApiCache()
      safeStorage.setItem(STORAGE_KEY, data.accessToken)
      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          accessToken: data.accessToken,
          userId: data.user?.id ?? (data as any).userId ?? "user-1",
          role:
            (data.user?.role as UserRole) ??
            ((data as any).role as UserRole) ??
            "member",
          name: data.user?.name ?? null,
          email: data.user?.email ?? null,
          ...(data.user?.username !== undefined && {
            username: data.user.username,
          }),
        },
      })
      return
    }

    if (response.status === 409) {
      throw new AuthError(
        "EMAIL_ALREADY_EXISTS",
        "Email is already registered. Please sign in or use a different email."
      )
    }

    throw new AuthError(
      "UNKNOWN_ERROR",
      "An unexpected error occurred. Please try again in a moment."
    )
  }

  // ── verifyToken ────────────────────────────────────────────────────────────
  /**
   * GET /auth/verify with a 3 000 ms timeout.
   * On 200: returns verified user payload (caller updates state to authenticated).
   * On 401 / 403: throws AuthError("INVALID_CREDENTIALS") so caller can clean up.
   *
   * Requirements: 4.3, 4.4, 4.5, 4.7
   */
  async function verifyToken(token: string): Promise<VerifyUserResponse | null> {
    let response: Response

    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/verify`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
        3_000
      )
    } catch (error) {
      // NETWORK_TIMEOUT propagates as-is; other errors become UNKNOWN_ERROR
      if (error instanceof AuthError) throw error
      throw new AuthError(
        "UNKNOWN_ERROR",
        "An unexpected error occurred. Please try again in a moment."
      )
    }

    if (response.ok) {
      try {
        const body = (await response.json()) as any
        const data = body && typeof body === "object" && "data" in body ? body.data : body
        return data ?? null
      } catch {
        return null
      }
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Invalid session. Please sign in again."
      )
    }

    throw new AuthError(
      "UNKNOWN_ERROR",
      "An unexpected error occurred. Please try again in a moment."
    )
  }

  // ── logout ─────────────────────────────────────────────────────────────────
  /**
   * Clears the stored token and dispatches AUTH_LOGOUT.
   *
   * Requirements: 4.6
   */
  function logout(): void {
    const token = safeStorage.getItem(STORAGE_KEY)
    if (token) {
      try {
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => {})
      } catch {}
    }
    clearApiCache()
    safeStorage.removeItem(STORAGE_KEY)
    dispatch({ type: "AUTH_LOGOUT" })
  }

  return {
    login,
    register,
    requestRegisterOtp,
    verifyRegisterOtp,
    resendRegisterOtp,
    verifyToken,
    logout,
  }
}

// ─── Type alias for the service instance ──────────────────────────────────────

export type AuthService = ReturnType<typeof createAuthService>
