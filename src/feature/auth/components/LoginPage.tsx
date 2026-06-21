// Feature: auth-flow
// LoginPage — /login route component.
// Requirements: 2.1, 2.8–2.13

import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "../hooks/useAuth"
import { useLoginForm } from "../hooks/useLoginForm"
import { AuthLayout } from "./AuthLayout"
import { AuthForm } from "./AuthForm"

/**
 * Login page rendered at route `/login`.
 *
 * - Redirects to `/dashboard` if already authenticated (req 2.8)
 * - Uses AuthLayout for responsive card centering (req 2.9)
 * - Displays app heading "Sekkha" above the card (req 2.10)
 * - Delegates form state to useLoginForm (req 2.11–2.13)
 */
export function LoginPage() {
  const { authState } = useAuth()
  const navigate = useNavigate()

  const {
    fields,
    errors,
    isLoading,
    apiError,
    handleChange,
    handleBlur,
    handleSubmit,
    dismissApiError,
    setApiError,
  } = useLoginForm()

  // Redirect authenticated users away (req 2.8)
  useEffect(() => {
    if (authState.status === "authenticated") {
      void navigate({ to: "/home" })
    }
  }, [authState.status, navigate])

  if (authState.status === "authenticated") {
    return null
  }

  return (
    <main>
      <AuthLayout>
        {/* App heading above the card (req 2.10) */}
        <h1 className="mb-6 text-center text-heading-5 text-sekkha-ink">
          Sekkha
        </h1>

        <AuthForm
          mode="login"
          onSubmit={handleSubmit}
          isLoading={isLoading}
          apiError={apiError}
          onInputChange={dismissApiError}
          onOAuthError={setApiError}
          fields={fields}
          errors={errors}
          onFieldChange={handleChange}
          onFieldBlur={handleBlur}
        />
      </AuthLayout>
    </main>
  )
}
