// Feature: auth-flow
// Public API — only export what consumers outside this feature need.
// Internal modules (authReducer, AuthContext, validators) are NOT exported here.

export { AuthProvider } from "./context/AuthContext"
export { useAuth } from "./hooks/useAuth"
export { SignUpPage } from "./components/SignUpPage"
export { LoginPage } from "./components/LoginPage"

// Type exports used by router context (task 11.2)
export type { AuthState, AuthStatus, UserRole } from "./context/authReducer"
export type { RouterContext } from "./context/AuthContext"
