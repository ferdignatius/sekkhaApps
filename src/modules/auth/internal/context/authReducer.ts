// Feature: auth-flow
// Reducer, action types, state types, and AuthError class for the auth feature.

// ─── Status & State ────────────────────────────────────────────────────────────

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

// Role mirrors the API contract: umat | aktivis | pengurus | admin
export type UserRole = "umat" | "aktivis" | "pengurus" | "admin"

export interface AuthState {
  status: AuthStatus
  accessToken: string | null
  userId: string | null
  role: UserRole | null
}

export const initialAuthState: AuthState = {
  status: "loading",
  accessToken: null,
  userId: null,
  role: null,
}

// ─── Actions ───────────────────────────────────────────────────────────────────

export type AuthAction =
  | { type: "AUTH_LOADING" }
  | { type: "AUTH_SUCCESS"; payload: { accessToken: string; userId: string; role: UserRole } }
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_VERIFY_FAILED" }

// ─── Reducer ───────────────────────────────────────────────────────────────────

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_LOADING":
      return {
        ...state,
        status: "loading",
      }

    case "AUTH_SUCCESS":
      return {
        status: "authenticated",
        accessToken: action.payload.accessToken,
        userId: action.payload.userId,
        role: action.payload.role,
      }

    case "AUTH_LOGOUT":
      return {
        status: "unauthenticated",
        accessToken: null,
        userId: null,
        role: null,
      }

    case "AUTH_VERIFY_FAILED":
      return {
        status: "unauthenticated",
        accessToken: null,
        userId: null,
        role: null,
      }

    default: {
      // Exhaustive check — TypeScript will error if a case is missing
      const _exhaustive: never = action
      return _exhaustive
    }
  }
}

// ─── AuthError ─────────────────────────────────────────────────────────────────

export type AuthErrorCode =
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_CREDENTIALS"
  | "NETWORK_TIMEOUT"
  | "OAUTH_CANCELLED"
  | "OAUTH_FAILED"
  | "UNKNOWN_ERROR"

export class AuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = "AuthError"

    // Restore correct prototype chain when targeting ES5 or older
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
