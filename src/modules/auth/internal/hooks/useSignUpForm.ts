// Feature: auth-flow
// useSignUpForm — manages Sign Up form state, field validation, and submit logic.
// Requirements: 1.11–1.16, 3.1–3.10, 7.1–7.5

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { validateSignUpForm } from "../utils/validator"
import { useAuth } from "./useAuth"
import { AuthError } from "../context/authReducer"

// ─── Types ─────────────────────────────────────────────────────────────────────

type SignUpField = "email" | "password" | "confirmPassword"

type FieldErrors = Partial<Record<SignUpField, string>>

export interface UseSignUpFormReturn {
  fields: Record<SignUpField, string>
  errors: FieldErrors
  isLoading: boolean
  apiError: string | null
  handleChange: (field: string, value: string) => void
  handleBlur: (field: string) => void
  handleSubmit: () => Promise<void>
  dismissApiError: () => void
  setApiError: (message: string | null) => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSignUpForm(): UseSignUpFormReturn {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [fields, setFields] = useState<Record<SignUpField, string>>({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  // Track whether the apiError was visible when the user starts typing
  const [apiErrorDismissed, setApiErrorDismissed] = useState(false)

  // ── handleChange ─────────────────────────────────────────────────────────────
  function handleChange(field: string, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }))

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

  // ── handleSubmit ─────────────────────────────────────────────────────────────
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
      await register(fields.email, fields.password)
      void navigate({ to: "/home" })
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
            setApiError("Terjadi kesalahan. Silakan coba beberapa saat lagi.")
        }
      } else {
        setApiError("Terjadi kesalahan. Silakan coba beberapa saat lagi.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── dismissApiError ──────────────────────────────────────────────────────────
  function dismissApiError() {
    setApiError(null)
  }

  return {
    fields,
    errors,
    isLoading,
    apiError,
    handleChange,
    handleBlur,
    handleSubmit,
    dismissApiError,
    setApiError,
  }
}
