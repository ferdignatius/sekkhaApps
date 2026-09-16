// Feature: auth-flow
// AuthContext, AuthProvider, and AuthContextValue for centralized auth state management.

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from "react"
import { authReducer, initialAuthState } from "./authReducer"
import type { AuthState, UserRole } from "./authReducer"
import { createAuthService, STORAGE_KEY } from "../api/authService"
import { api } from "@/lib/api"
import { safeStorage } from "@/lib/storage"

// ─── Constants ─────────────────────────────────────────────────────────────────

// VERIFY_TIMEOUT_MS is handled inside authService.verifyToken (3000ms)

// ─── Context Value Interface ────────────────────────────────────────────────────

export interface AuthContextValue {
  authState: AuthState
  /** Signs the user in with email + password. */
  login: (email: string, password: string) => Promise<void>
  /** Creates a new account with email + password + optional name. */
  register: (email: string, password: string, name?: string) => Promise<void>
  /** Requests a 6-digit OTP code sent to user email for registration. */
  requestRegisterOtp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ success: boolean; message: string }>
  /** Verifies 6-digit OTP code and creates account. */
  verifyRegisterOtp: (email: string, otp: string) => Promise<void>
  /** Resends 6-digit OTP code to user email. */
  resendRegisterOtp: (
    email: string
  ) => Promise<{ success: boolean; message: string }>
  /** Clears the session and sets auth state to unauthenticated. */
  logout: () => void
  /** Initiates the Google OAuth flow by redirecting to the backend OAuth entry point. */
  initiateGoogleOAuth: () => void
  /** Updates the in-memory authenticated user info (name, role, email). */
  updateUser: (
    user: Partial<{ name: string | null; role: UserRole; email: string | null }>
  ) => void
  /** Re-verifies session with backend to refresh latest user details. */
  refreshUser: () => Promise<void>
}

// ─── Context ───────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null)

// ─── AuthProvider ──────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, dispatch] = useReducer(authReducer, initialAuthState)

  // Bind authService to this provider's dispatch — memoised so identity is stable
  const authService = useMemo(() => createAuthService(dispatch), [dispatch])

  // ── Initialisation effect: verify stored token on app load ──────────────────
  useEffect(() => {
    let cancelled = false

    async function initAuth() {
      // 1. Check if token is present in URL query parameters (Google OAuth callback redirect)
      const urlParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null
      const urlToken = urlParams?.get("token")

      let token = safeStorage.getItem(STORAGE_KEY)

      if (urlToken) {
        safeStorage.setItem(STORAGE_KEY, urlToken)
        token = urlToken

        // Clean query parameter from URL to keep it pristine
        if (typeof window !== "undefined") {
          const cleanUrl = window.location.pathname + window.location.hash
          window.history.replaceState({}, document.title, cleanUrl)
        }
      }

      // No token → immediately unauthenticated, no server request needed (requirement 4.8)
      if (!token) {
        dispatch({ type: "AUTH_VERIFY_FAILED" })
        return
      }

      // Token exists → verify with backend
      try {
        // authService.verifyToken handles the 3000ms timeout internally
        await authService.verifyToken(token)

        if (cancelled) return

        // FE-14 Remediation: Do not perform unverified client-side atob JWT decoding.
        // Trust only verified response from backend. Set authenticated session, then hydrate.
        dispatch({
          type: "AUTH_SUCCESS",
          payload: {
            accessToken: token,
            userId: null,
            role: null,
            name: null,
            email: null,
          },
        })

        // Best effort: hydrate fresh profile from database
        api
          .get<{ name?: string; role?: string }>("/users/me")
          .then((u) => {
            if (!cancelled && u?.name) {
              dispatch({
                type: "AUTH_UPDATE_USER",
                payload: {
                  name: u.name,
                  role: (u.role as UserRole) || undefined,
                },
              })
            }
          })
          .catch(() => {})
      } catch {
        if (cancelled) return

        // verifyToken threw (NETWORK_TIMEOUT, INVALID_CREDENTIALS, or UNKNOWN_ERROR)
        // In all cases: remove stale token and set unauthenticated (requirements 4.5, 4.7)
        safeStorage.removeItem(STORAGE_KEY)
        dispatch({ type: "AUTH_VERIFY_FAILED" })
      }
    }

    void initAuth()

    return () => {
      cancelled = true
    }
  }, [authService])

  // ── Auth actions — wired to authService ─────────────────────────────────────

  const login = async (email: string, password: string): Promise<void> => {
    await authService.login(email, password)
  }

  const register = async (email: string, password: string): Promise<void> => {
    await authService.register(email, password)
  }

  const logout = (): void => {
    authService.logout()
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/"
    }
  }

  const initiateGoogleOAuth = (): void => {
    authService.initiateGoogleOAuth()
  }

  const requestRegisterOtp = async (
    email: string,
    password: string,
    name?: string
  ) => {
    return await authService.requestRegisterOtp(email, password, name)
  }

  const verifyRegisterOtp = async (email: string, otp: string) => {
    await authService.verifyRegisterOtp(email, otp)
  }

  const resendRegisterOtp = async (email: string) => {
    return await authService.resendRegisterOtp(email)
  }

  const updateUser = useCallback(
    (
      data: Partial<{
        name: string | null
        role: UserRole
        email: string | null
      }>
    ) => {
      dispatch({ type: "AUTH_UPDATE_USER", payload: data })
    },
    [dispatch]
  )

  const refreshUser = async (): Promise<void> => {
    const token = safeStorage.getItem(STORAGE_KEY)
    if (!token) return
    try {
      const res = await api.get<{
        name?: string
        role?: UserRole
        email?: string
      }>("/users/me")
      if (res) {
        dispatch({
          type: "AUTH_UPDATE_USER",
          payload: {
            name: res.name ?? null,
            role: (res.role as UserRole) || undefined,
            email: res.email ?? null,
          },
        })
      }
    } catch {
      // Non-blocking
    }
  }

  const value: AuthContextValue = {
    authState,
    login,
    register,
    requestRegisterOtp,
    verifyRegisterOtp,
    resendRegisterOtp,
    logout,
    initiateGoogleOAuth,
    updateUser,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── RouterContext Integration ─────────────────────────────────────────────────
export interface RouterContext {
  authState: AuthState
}

// ─── Internal useAuthContext hook ───────────────────────────────────────────
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error(
      "useAuthContext must be used inside an <AuthProvider>. " +
        "Make sure <AuthProvider> wraps your component tree (see src/routes/__root.tsx)."
    )
  }
  return ctx
}
