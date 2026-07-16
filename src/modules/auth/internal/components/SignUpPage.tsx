// Feature: auth-flow
// SignUpPage — /sign-up route component.
// Requirements: 1.1, 1.8–1.10, 1.14–1.16

import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "../hooks/useAuth"
import { useSignUpForm } from "../hooks/useSignUpForm"
import { AuthLayout } from "./AuthLayout"
import { AuthForm } from "./AuthForm"

/**
 * Sign Up page rendered at route `/sign-up`.
 *
 * - Redirects to `/dashboard` if already authenticated (req 1.8)
 * - Uses AuthLayout for responsive card centering (req 1.9)
 * - Displays app heading "Sekkha" above the card (req 1.10)
 * - Delegates form state to useSignUpForm (req 1.14–1.16)
 */
export function SignUpPage() {
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
  } = useSignUpForm()

  // Redirect authenticated users away (req 1.8)
  useEffect(() => {
    if (authState.status === "authenticated") {
      void navigate({ to: "/home" })
    }
  }, [authState.status, navigate])

  // Don't render the page content for authenticated users
  if (authState.status === "authenticated") {
    return null
  }

  return (
    <main>
      <AuthLayout>
        {/* App heading above the card (req 1.10) */}
        <h1 className="mb-6 text-center text-heading-5 text-sekkha-ink">
          Sekkha
        </h1>

        <AuthForm
          mode="sign-up"
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
