// Feature: auth-flow
// SignUpPage — /sign-up route component.
// Clean sign-up form matching login page; redirects to /onboarding upon successful account creation.

import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "../hooks/useAuth"
import { useSignUpForm } from "../hooks/useSignUpForm"
import { AuthLayout } from "./AuthLayout"
import { AuthForm } from "./AuthForm"

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

  return (
    <main>
      <AuthLayout>
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
