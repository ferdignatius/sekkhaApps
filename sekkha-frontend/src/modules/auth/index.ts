// modules/auth — Public API
// Mengekspos hanya yang boleh dipakai modul lain & Shell.
// Internal (context, reducer, validators) TIDAK di-export di sini.

import type { ModuleDefinition } from "@/shell/registry"

// ── Component exports ───────────────────────────────────────────────────────
export { AuthProvider } from "./internal/context/AuthContext"
export { useAuth } from "./internal/hooks/useAuth"
export { SignUpPage } from "./internal/components/SignUpPage"
export { LoginPage } from "./internal/components/LoginPage"
export { OnboardingPage } from "./internal/components/OnboardingPage"

// ── Type exports ────────────────────────────────────────────────────────────
export type { AuthState, AuthStatus, UserRole } from "./internal/context/authReducer"
export type { RouterContext } from "./internal/context/AuthContext"

// ── Module Definition (untuk Registry) ──────────────────────────────────────
// Auth tidak punya sidebar nav item (login/register diakses lewat route langsung)
export const authModule: ModuleDefinition = {
  name: "auth",
  navItems: [],
}
