// Feature: auth-flow
// useSignUpForm — manages Sign Up form state, field validation, and submit logic.
// Requirements: 1.11–1.16, 3.1–3.10, 7.1–7.5

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { validateSignUpForm } from "../utils/validator"
import { useAuth } from "./useAuth"
import { AuthError } from "../context/authReducer"

// ─── Types ─────────────────────────────────────────────────────────────────────

type SignUpField = "email" | "password" | "confirmPassword" | "agreeToPrivacy"

type FieldErrors = Partial<Record<SignUpField, string>>

export interface UseSignUpFormReturn {
  step: "form" | "otp"
  fields: {
    email: string
    password: string
    confirmPassword: string
    agreeToPrivacy?: boolean
  }
  errors: FieldErrors
  isLoading: boolean
  apiError: string | null
  otpError: string | null
  isVerifyingOtp: boolean
  handleChange: (field: string, value: string | boolean) => void
  handleBlur: (field: string) => void
  handleSubmit: () => Promise<void>
  handleVerifyOtp: (otp: string) => Promise<void>
  handleResendOtp: () => Promise<void>
  handleBackToForm: () => void
  dismissApiError: () => void
  setApiError: (message: string | null) => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSignUpForm(): UseSignUpFormReturn {
  const { requestRegisterOtp, verifyRegisterOtp, resendRegisterOtp } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<"form" | "otp">("form")
  const [fields, setFields] = useState<{
    email: string
    password: string
    confirmPassword: string
    agreeToPrivacy?: boolean
  }>({
    email: "",
    password: "",
    confirmPassword: "",
    agreeToPrivacy: false,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  // Track whether the apiError was visible when the user starts typing
  const [apiErrorDismissed, setApiErrorDismissed] = useState(false)

  // ── handleChange ─────────────────────────────────────────────────────────────
  function handleChange(field: string, value: string | boolean) {
    setFields((prev) => ({ ...prev, [field]: value }))

    if (field === "agreeToPrivacy" && value === true) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.agreeToPrivacy
        return next
      })
    }

    // Dismiss the API error banner on first keystroke after it appeared (req 7.5)
    if (apiError && !apiErrorDismissed) {
      setApiError(null)
      setApiErrorDismissed(true)
    }
  }

  // ── handleBlur ──────────────────────────────────────────────────────────────
  function handleBlur(field: string) {
    // Only validate this specific field on blur (req 3.7, 3.8)
    const result = validateSignUpForm(fields)
    const fieldError = result.errors.find((e) => e.field === field)

    setErrors((prev) => {
      if (fieldError) {
        // Field still invalid — keep / set its error
        return { ...prev, [field]: fieldError.message }
      } else {
        // Field now valid — clear its error
        const next = { ...prev }
        delete next[field as SignUpField]
        return next
      }
    })
  }

  // ── handleSubmit (Requests OTP) ─────────────────────────────────────────────
  async function handleSubmit(): Promise<void> {
    const result = validateSignUpForm(fields)

    if (!result.isValid) {
      // Map array of errors into a field → message record
      const mapped: FieldErrors = {}
      for (const err of result.errors) {
        mapped[err.field as SignUpField] = err.message
      }
      setErrors(mapped)
      return
    }

    setIsLoading(true)
    setApiError(null)
    setApiErrorDismissed(false)

    try {
      await requestRegisterOtp(fields.email, fields.password)
      setStep("otp")
      setOtpError(null)
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.code) {
          case "EMAIL_ALREADY_EXISTS":
            setApiError(
              "Email sudah digunakan. Silakan gunakan email lain atau masuk ke akun Anda.",
            )
            break
          case "NETWORK_TIMEOUT":
            setApiError(
              "Koneksi bermasalah. Periksa koneksi internet Anda dan coba lagi.",
            )
            break
          default:
            setApiError(error.message || "Terjadi kesalahan saat mengirim kode OTP.")
        }
      } else {
        setApiError("Terjadi kesalahan. Silakan coba beberapa saat lagi.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── handleVerifyOtp ─────────────────────────────────────────────────────────
  async function handleVerifyOtp(otp: string): Promise<void> {
    setIsVerifyingOtp(true)
    setOtpError(null)

    try {
      await verifyRegisterOtp(fields.email, otp)
      void navigate({ to: "/onboarding" })
    } catch (error) {
      if (error instanceof AuthError) {
        setOtpError(error.message)
      } else {
        setOtpError("Kode OTP salah atau tidak valid. Silakan coba lagi.")
      }
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // ── handleResendOtp ─────────────────────────────────────────────────────────
  async function handleResendOtp(): Promise<void> {
    setOtpError(null)
    try {
      await resendRegisterOtp(fields.email)
    } catch (error) {
      if (error instanceof AuthError) {
        setOtpError(error.message)
      } else {
        setOtpError("Gagal mengirim ulang OTP. Silakan coba lagi nanti.")
      }
      throw error
    }
  }

  // ── handleBackToForm ────────────────────────────────────────────────────────
  function handleBackToForm() {
    setStep("form")
    setOtpError(null)
  }

  // ── dismissApiError ──────────────────────────────────────────────────────────
  function dismissApiError() {
    setApiError(null)
  }

  return {
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
  }
}
