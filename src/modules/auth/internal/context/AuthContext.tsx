// Feature: auth-flow
// AuthContext, AuthProvider, and AuthContextValue for centralized auth state management.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react"
import {
  authReducer,
  initialAuthState,
  type AuthState,
} from "./authReducer"
import { createAuthService, STORAGE_KEY } from "../api/authService"

// ─── Constants ─────────────────────────────────────────────────────────────────

// VERIFY_TIMEOUT_MS is handled inside authService.verifyToken (3000ms)

// ─── Context Value Interface ────────────────────────────────────────────────────

export interface AuthContextValue {
  authState: AuthState
  /** Signs the user in with email + password. */
  login: (email: string, password: string) => Promise<void>
  /** Creates a new account with email + password. */
  register: (email: string, password: string) => Promise<void>
  /** Clears the session and sets auth state to unauthenticated. */
  logout: () => void
  /** Initiates the Google OAuth flow by redirecting to the backend OAuth entry point. */
  initiateGoogleOAuth: () => void
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
      const token = localStorage.getItem(STORAGE_KEY)

      // No token → immediately unauthenticated, no server request needed (requirement 4.8)
      if (!token) {
        dispatch({ type: "AUTH_VERIFY_FAILED" })
        return
      }

      // Token exists → verify with backend (requirement 4.3)
      // Dummy token bypass — skip network call for development credentials
      if (token === "dummy.admin.token") {
        dispatch({
          type: "AUTH_SUCCESS",
          payload: { accessToken: token, userId: "admin-user-1", role: "pengurus" },
        })
        return
      }

      try {
        // authService.verifyToken handles the 3000ms timeout internally
        await authService.verifyToken(token)

        if (cancelled) return

        // 200 OK — try to get userId from the response (best-effort decode)
        // For init we re-read the response body; since verifyToken returns void,
        // we decode userId from the JWT payload as a fallback.
        let userId: string = "unknown"
        try {
          // Attempt lightweight JWT decode (no signature verification needed here)
          const parts = token.split(".")
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1])) as {
              sub?: string
              userId?: string
              id?: string
            }
            userId = payload.sub ?? payload.userId ?? payload.id ?? "unknown"
          }
        } catch {
          // JWT decode failed — userId stays "unknown"
        }

        dispatch({
          type: "AUTH_SUCCESS",
          payload: { accessToken: token, userId, role: "umat" },
        })
      } catch {
        if (cancelled) return

        // verifyToken threw (NETWORK_TIMEOUT, INVALID_CREDENTIALS, or UNKNOWN_ERROR)
        // In all cases: remove stale token and set unauthenticated (requirements 4.5, 4.7)
        localStorage.removeItem(STORAGE_KEY)
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
  }

  const initiateGoogleOAuth = (): void => {
    authService.initiateGoogleOAuth()
  }

  const value: AuthContextValue = {
    authState,
    login,
    register,
    logout,
    initiateGoogleOAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── RouterContext Integration ─────────────────────────────────────────────────
// Expose authState to TanStack Router's context so route guards (task 9) can
// read it via `context.authState` inside `beforeLoad`.
//
// Usage in router.tsx (task 11.2):
//
//   import { useAuth } from "@/modules/auth"
//   const router = getRouter()
//   router.options.context = { authState: useAuth().authState }
//
// The RouterContext interface declaration lives in router.tsx alongside the
// router instance (where it has access to the router type). This file only
// provides the shape that the context consumer expects.

export interface RouterContext {
  authState: AuthState
}

// ─── Internal useAuthContext hook (not exported from feature/index) ───────────
// Public consumers should import `useAuth` from `@/modules/auth/hooks/useAuth`.

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error(
      "useAuthContext must be used inside an <AuthProvider>. " +
        "Make sure <AuthProvider> wraps your component tree (see src/routes/__root.tsx).",
    )
  }
  return ctx
}
