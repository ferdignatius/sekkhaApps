// Feature: auth-flow
// Public `useAuth` hook — the primary way consumers access auth state and actions.
// Requirements: 4.1, 4.2, 4.6

import { useAuthContext } from "../context/AuthContext"
import type { AuthState, UserRole } from "../context/authReducer"

// ─── Return Interface ─────────────────────────────────────────────────────────

/**
 * Shape returned by the `useAuth` hook.
 *
 * - `authState`  — current authentication state (status, accessToken, userId)
 * - `login`      — sign in with email + password
 * - `register`   — create a new account with email + password
 * - `logout`     — clear the session and set state to unauthenticated
 */
export interface UseAuthReturn {
  authState: AuthState
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  requestRegisterOtp: (email: string, password: string, name?: string) => Promise<{ success: boolean; message: string }>
  verifyRegisterOtp: (email: string, otp: string) => Promise<void>
  resendRegisterOtp: (email: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  initiateGoogleOAuth: () => void
  updateUser: (user: Partial<{ name: string | null; role: UserRole; email: string | null }>) => void
  refreshUser: () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Reads auth state and actions from `AuthContext`.
 *
 * Throws a descriptive error when called outside of an `<AuthProvider>` tree,
 * which surfaces a clear message in development rather than a silent undefined.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { authState, logout } = useAuth()
 *   // authState.status === "authenticated" here (route guard ensures it)
 *   return <button onClick={logout}>Sign out</button>
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  // useAuthContext already throws a descriptive error when the context is null
  // (i.e. when used outside <AuthProvider>), satisfying requirement 4.6.
  const {
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
  } = useAuthContext()

  return {
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
}

