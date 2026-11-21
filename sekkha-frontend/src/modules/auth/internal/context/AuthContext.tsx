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
import { AuthError, authReducer, initialAuthState } from "./authReducer"
import type { AuthState, UserRole } from "./authReducer"
import { createAuthService, STORAGE_KEY } from "../api/authService"
import { api } from "@/lib/api"
import { isJwtExpired } from "@/lib/jwt"
import { safeStorage } from "@/lib/storage"
import {
  AUTH_CHANNEL_NAME,
  SESSION_INVALIDATED_EVENT,
  TOKEN_SYNCED_EVENT,
} from "@/lib/authRefresh"

// ─── Constants ─────────────────────────────────────────────────────────────────

// VERIFY_TIMEOUT_MS is handled inside authService.verifyToken (3000ms)

// ─── Context Value Interface ────────────────────────────────────────────────────

export interface AuthContextValue {
  authState: AuthState
  /** Signs the user in with email + password. */
  login: (
    identifier: string,
    password: string
  ) => Promise<{ onboardingCompleted?: boolean } | void>
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
  /** Updates the in-memory authenticated user info (name, role, email). */
  updateUser: (
    user: Partial<{
      userId: string | null
      name: string | null
      username: string | null
      role: UserRole
      email: string | null
      onboardingCompleted: boolean | null
    }>
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
      const token = safeStorage.getItem(STORAGE_KEY)

      // No token → immediately unauthenticated, no server request needed (requirement 4.8)
      if (!token) {
        dispatch({ type: "AUTH_VERIFY_FAILED" })
        return
      }

      // Token exists → if JWT is already expired client-side, skip /auth/verify and refresh directly
      let activeToken = token
      let verifiedUser: Awaited<ReturnType<typeof authService.verifyToken>> = null

      if (
        isJwtExpired(token) &&
        typeof authService.refreshSession === "function"
      ) {
        const refreshed = await authService.refreshSession()
        if (cancelled) return
        if (refreshed?.accessToken) {
          activeToken = refreshed.accessToken
          verifiedUser = refreshed.user
          if (refreshed.reusedExisting && !verifiedUser) {
            try {
              verifiedUser = await authService.verifyToken(activeToken)
            } catch {
              // Keep token if sibling just rotated it; non-blocking metadata hydration
            }
          }
        } else {
          safeStorage.removeItem(STORAGE_KEY)
          dispatch({ type: "AUTH_VERIFY_FAILED" })
          return
        }
      } else {
        try {
          // authService.verifyToken handles the 3000ms timeout internally
          verifiedUser = await authService.verifyToken(token)
        } catch (err) {
          if (cancelled) return

          // If the short-lived access token expired (401/403), silently exchange the
          // HttpOnly refresh cookie (REFRESH_TOKEN_EXPIRES_IN) before logging out.
          if (
            err instanceof AuthError &&
            err.code === "INVALID_CREDENTIALS" &&
            typeof authService.refreshSession === "function"
          ) {
            const refreshed = await authService.refreshSession()
            if (cancelled) return
            if (refreshed?.accessToken) {
              activeToken = refreshed.accessToken
              verifiedUser = refreshed.user
            } else {
              safeStorage.removeItem(STORAGE_KEY)
              dispatch({ type: "AUTH_VERIFY_FAILED" })
              return
            }
          } else {
            // NETWORK_TIMEOUT or UNKNOWN_ERROR → remove stale token and set unauthenticated (requirements 4.5, 4.7)
            safeStorage.removeItem(STORAGE_KEY)
            dispatch({ type: "AUTH_VERIFY_FAILED" })
            return
          }
        }
      }

      if (cancelled) return

      const onboardingCompleted =
        verifiedUser?.onboarding_completed ?? verifiedUser?.onboardingCompleted

      // Set authenticated session directly from verified (or refreshed) backend response
      dispatch({
        type: "AUTH_SUCCESS",
        payload: {
          accessToken: activeToken,
          userId: verifiedUser?.id ?? verifiedUser?.userId ?? null,
          role: (verifiedUser?.role as UserRole) || null,
          name: verifiedUser?.name ?? null,
          email: verifiedUser?.email ?? null,
          ...(verifiedUser?.username !== undefined && {
            username: verifiedUser.username,
          }),
          ...(onboardingCompleted !== undefined && {
            onboardingCompleted: Boolean(onboardingCompleted),
          }),
        },
      })
    }

    void initAuth()

    return () => {
      cancelled = true
    }
  }, [authService])

  // ── Cross-tab & in-tab session sync (prevents zombie authenticated UI) ────
  useEffect(() => {
    if (typeof window === "undefined") return

    function buildTokenUpdatePayload(accessToken: string) {
      return {
        accessToken,
        userId: authState.userId,
        role: authState.role,
        name: authState.name,
        email: authState.email,
        ...(authState.username !== undefined && {
          username: authState.username,
        }),
        ...(typeof authState.onboardingCompleted === "boolean" && {
          onboardingCompleted: authState.onboardingCompleted,
        }),
      }
    }

    function handleSessionInvalidated() {
      dispatch({ type: "AUTH_VERIFY_FAILED" })
    }

    function handleTokenSynced(event: Event) {
      const detail = (event as CustomEvent<{ accessToken?: string }>).detail
      if (detail?.accessToken && authState.status === "authenticated") {
        dispatch({
          type: "AUTH_SUCCESS",
          payload: buildTokenUpdatePayload(detail.accessToken),
        })
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return
      if (!event.newValue) {
        dispatch({ type: "AUTH_LOGOUT" })
      } else if (authState.status === "authenticated") {
        dispatch({
          type: "AUTH_SUCCESS",
          payload: buildTokenUpdatePayload(event.newValue),
        })
      }
    }

    window.addEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated)
    window.addEventListener(TOKEN_SYNCED_EVENT, handleTokenSynced)
    window.addEventListener("storage", handleStorage)

    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
        channel.onmessage = (ev: MessageEvent<{ type?: string; accessToken?: string }>) => {
          const msg = ev.data
          if (!msg?.type) return
          if (msg.type === "LOGOUT" || msg.type === "SESSION_INVALIDATED") {
            dispatch({ type: "AUTH_LOGOUT" })
          } else if (
            msg.type === "TOKEN_REFRESHED" &&
            msg.accessToken &&
            authState.status === "authenticated"
          ) {
            dispatch({
              type: "AUTH_SUCCESS",
              payload: buildTokenUpdatePayload(msg.accessToken),
            })
          }
        }
      } catch {
        channel = null
      }
    }

    return () => {
      window.removeEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated)
      window.removeEventListener(TOKEN_SYNCED_EVENT, handleTokenSynced)
      window.removeEventListener("storage", handleStorage)
      channel?.close()
    }
  }, [
    authState.status,
    authState.userId,
    authState.role,
    authState.name,
    authState.email,
    authState.username,
    authState.onboardingCompleted,
  ])

  // ── Auth actions — wired to authService ─────────────────────────────────────

  const login = useCallback(
    async (
      identifier: string,
      password: string
    ): Promise<{ onboardingCompleted?: boolean }> => {
      return await authService.login(identifier, password)
    },
    [authService]
  )

  const register = useCallback(
    async (email: string, password: string, name?: string): Promise<void> => {
      await authService.register(email, password, name)
    },
    [authService]
  )

  const logout = useCallback((): void => {
    authService.logout()
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/"
    }
  }, [authService])

  const requestRegisterOtp = useCallback(
    async (email: string, password: string, name?: string) => {
      return await authService.requestRegisterOtp(email, password, name)
    },
    [authService]
  )

  const verifyRegisterOtp = useCallback(
    async (email: string, otp: string) => {
      await authService.verifyRegisterOtp(email, otp)
    },
    [authService]
  )

  const resendRegisterOtp = useCallback(
    async (email: string) => {
      return await authService.resendRegisterOtp(email)
    },
    [authService]
  )

  const updateUser = useCallback(
    (
      data: Partial<{
        userId: string | null
        name: string | null
        role: UserRole
        email: string | null
        onboardingCompleted: boolean | null
      }>
    ) => {
      dispatch({ type: "AUTH_UPDATE_USER", payload: data })
    },
    [dispatch]
  )

  const refreshUser = useCallback(async (): Promise<void> => {
    const token = safeStorage.getItem(STORAGE_KEY)
    if (!token) return
    try {
      const res = await api.get<{
        id?: string
        name?: string
        username?: string
        role?: UserRole
        email?: string
        onboarding_completed?: boolean
        onboardingCompleted?: boolean
      }>("/users/me")
      if (res) {
        const onboardingCompleted =
          res.onboarding_completed ?? res.onboardingCompleted
        dispatch({
          type: "AUTH_UPDATE_USER",
          payload: {
            userId: res.id ?? null,
            name: res.name ?? null,
            username: res.username ?? null,
            role: (res.role as UserRole) || undefined,
            email: res.email ?? null,
            ...(onboardingCompleted !== undefined && {
              onboardingCompleted,
            }),
          },
        })
      }
    } catch {
      // Non-blocking
    }
  }, [dispatch])

  const value: AuthContextValue = useMemo(
    () => ({
      authState,
      login,
      register,
      requestRegisterOtp,
      verifyRegisterOtp,
      resendRegisterOtp,
      logout,
      updateUser,
      refreshUser,
    }),
    [
      authState,
      login,
      register,
      requestRegisterOtp,
      verifyRegisterOtp,
      resendRegisterOtp,
      logout,
      updateUser,
      refreshUser,
    ]
  )

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
