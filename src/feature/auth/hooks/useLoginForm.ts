// Feature: auth-flow
// useLoginForm — manages Login form state, field validation, and submit logic.
// Requirements: 2.11, 2.12, 2.13, 3.9, 3.10, 5.4, 5.5, 6.2, 6.3, 6.5, 7.1, 7.3, 7.4, 7.5

import { useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { validateLoginForm } from "../utils/validator"
import { useAuth } from "./useAuth"
import { AuthError } from "../context/authReducer"

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Maximum allowed length for the redirectTo path (req 5.5, 6.3, 6.5) */
const MAX_REDIRECT_LENGTH = 2048

// ─── Types ─────────────────────────────────────────────────────────────────────

type LoginField = "email" | "password"

type FieldErrors = Partial<Record<LoginField, string>>

export interface UseLoginFormReturn {
  fields: Record<LoginField, string>
  errors: FieldErrors
  isLoading: boolean
  apiError: string | null
  handleChange: (field: string, value: string) => void
  handleBlur: (field: string) => void
  handleSubmit: () => Promise<void>
  dismissApiError: () => void
  setApiError: (message: string | null) => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validates whether a redirectTo value is a safe internal path.
 * Requirements: 5.4, 5.5, 6.3, 6.5
 *
 * A valid redirectTo path:
 * - Must be a non-empty string
 * - Must start with "/" (internal path)
 * - Must not contain "http://" or "https://" (no external URLs)
 * - Must not exceed MAX_REDIRECT_LENGTH characters
 */
function isValidRedirectTo(value: string | undefined): value is string {
  if (!value) return false
  if (value.length > MAX_REDIRECT_LENGTH) return false
  if (!value.startsWith("/")) return false
  if (value.includes("http://") || value.includes("https://")) return false
  return true
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useLoginForm(): UseLoginFormReturn {
  const { login } = useAuth()
  const navigate = useNavigate()

  // Read the redirectTo query param from the /login route (req 5.2, 5.4, 6.3)
  const search = useSearch({ from: "/login" })

  const [fields, setFields] = useState<Record<LoginField, string>>({
    email: "",
    password: "",
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
    const result = validateLoginForm(fields)
    const fieldError = result.errors.find((e) => e.field === field)

    setErrors((prev) => {
      if (fieldError) {
        // Field still invalid — keep / set its error
        return { ...prev, [field]: fieldError.message }
      } else {
        // Field now valid — clear its error
        const next = { ...prev }
        delete next[field as LoginField]
        return next
      }
    })
  }

  // ── handleSubmit ─────────────────────────────────────────────────────────────
  async function handleSubmit(): Promise<void> {
    const result = validateLoginForm(fields)

    if (!result.isValid) {
      // Map array of errors into a field → message record
      const mapped: FieldErrors = {}
      for (const err of result.errors) {
        mapped[err.field as LoginField] = err.message
      }
      setErrors(mapped)
      return
    }

    setIsLoading(true)
    setApiError(null)
    setApiErrorDismissed(false)

    try {
      await login(fields.email, fields.password)

      // Determine redirect target after successful login (req 5.4, 5.5, 6.2, 6.3, 6.5)
      const redirectTo = search.redirectTo
      if (isValidRedirectTo(redirectTo)) {
        void navigate({ to: redirectTo })
      } else {
        void navigate({ to: "/dashboard" })
      }
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.code) {
          case "INVALID_CREDENTIALS":
            setApiError(
              "Email atau password salah. Silakan coba lagi.",
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
