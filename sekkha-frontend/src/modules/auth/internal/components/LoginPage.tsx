// Feature: auth-flow
// LoginPage — /login route component.
// Requirements: 2.1, 2.8–2.13

import { useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useAuth } from "../hooks/useAuth"
import { useLoginForm } from "../hooks/useLoginForm"
import { navigateToSafeRedirect } from "../utils/routeGuards"
import { AuthLayout } from "./AuthLayout"
import { AuthForm } from "./AuthForm"

/**
 * Login page rendered at route `/login`.
 *
 * - Redirects to `/home` if already authenticated (req 2.8)
 * - Uses AuthLayout for responsive card centering (req 2.9)
 * - Displays app heading "Sekkha" above the card (req 2.10)
 * - Delegates form state to useLoginForm (req 2.11–2.13)
 */
export function LoginPage() {
  const { authState } = useAuth()
  const navigate = useNavigate()
  const search = useSearch({ from: "/login" })

  const {
    fields,
    errors,
    isLoading,
    apiError,
    handleChange,
    handleBlur,
    handleSubmit,
    dismissApiError,
  } = useLoginForm()

  // Redirect authenticated users away while preserving valid ?redirectTo= (req 2.8)
  useEffect(() => {
    if (authState.status === "authenticated") {
      if (authState.onboardingCompleted === false) {
        void navigate({ to: "/onboarding" })
      } else {
        navigateToSafeRedirect(navigate, search.redirectTo, "/home")
      }
    }
  }, [authState.status, authState.onboardingCompleted, navigate, search.redirectTo])

  if (authState.status === "authenticated") {
    return null
  }

  return (
    <main>
      <AuthLayout>
        <AuthForm
          mode="login"
          onSubmit={handleSubmit}
          isLoading={isLoading}
          apiError={apiError}
          onInputChange={dismissApiError}
          fields={fields}
          errors={errors}
          onFieldChange={handleChange}
          onFieldBlur={handleBlur}
        />
      </AuthLayout>
    </main>
  )
}
