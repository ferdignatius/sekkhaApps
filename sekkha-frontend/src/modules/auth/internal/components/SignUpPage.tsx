// Feature: auth-flow
// SignUpPage — /sign-up route component.
// Clean sign-up form matching login page; redirects to /onboarding upon successful account creation.

import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "../hooks/useAuth"
import { useSignUpForm } from "../hooks/useSignUpForm"
import { AuthLayout } from "./AuthLayout"
import { AuthForm } from "./AuthForm"
import { OtpVerificationView } from "./OtpVerificationView"

export function SignUpPage() {
  const { authState } = useAuth()
  const navigate = useNavigate()

  const {
    step,
    fields,
    errors,
    isLoading,
    apiError,
    otpError,
    isVerifyingOtp,
    handleChange,
    handleBlur,
    handleSubmit,
    handleVerifyOtp,
    handleResendOtp,
    handleBackToForm,
    dismissApiError,
    setApiError,
  } = useSignUpForm()

  // Only redirect if user was already authenticated upon opening the sign-up page before interacting
  useEffect(() => {
    if (authState.status === "authenticated" && step === "form" && !fields.email) {
      void navigate({ to: "/home" })
    }
  }, [authState.status, step, fields.email, navigate])

  return (
    <main>
      <AuthLayout>
        {step === "form" ? (
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
        ) : (
          <OtpVerificationView
            email={fields.email}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
            onBack={handleBackToForm}
            isLoading={isVerifyingOtp}
            error={otpError}
          />
        )}
      </AuthLayout>
    </main>
  )
}

