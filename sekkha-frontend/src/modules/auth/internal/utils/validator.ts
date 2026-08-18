// Feature: auth-flow
// Form validation utilities for Sign Up and Login forms.
// Requirements: 1.11, 1.12, 1.13, 3.1, 3.2, 3.3, 3.4, 3.5

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FieldError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: FieldError[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── validateSignUpForm ────────────────────────────────────────────────────────

export interface SignUpFormInput {
  email: string
  password: string
  confirmPassword: string
}

/**
 * Validates the Sign Up form fields.
 * Returns a `ValidationResult` with all field errors found.
 *
 * Rules:
 * - Email must not be empty (req 3.1)
 * - Email must match EMAIL_REGEX (req 3.2)
 * - Password must not be empty (req 3.3)
 * - Password must be at least 8 characters (req 1.12, 3.4)
 * - confirmPassword must match password (req 1.13, 3.5)
 */
export function validateSignUpForm({
  email,
  password,
  confirmPassword,
}: SignUpFormInput): ValidationResult {
  const errors: FieldError[] = []

  // Email validation
  if (!email) {
    errors.push({ field: "email", message: "Email wajib diisi" })
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: "email", message: "Format email tidak valid" })
  }

  // Password validation
  if (!password) {
    errors.push({ field: "password", message: "Password wajib diisi" })
  } else if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Password minimal 8 karakter",
    })
  }

  // Confirm password validation
  if (confirmPassword !== password) {
    errors.push({
      field: "confirmPassword",
      message: "Konfirmasi password tidak cocok",
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ─── validateLoginForm ─────────────────────────────────────────────────────────

export interface LoginFormInput {
  email: string
  password: string
}

/**
 * Validates the Login form fields (subset of sign-up — no confirmPassword).
 *
 * Rules:
 * - Email must not be empty (req 3.1)
 * - Email must match EMAIL_REGEX (req 3.2)
 * - Password must not be empty (req 3.3)
 */
export function validateLoginForm({
  email,
  password,
}: LoginFormInput): ValidationResult {
  const errors: FieldError[] = []

  // Email validation
  if (!email) {
    errors.push({ field: "email", message: "Email wajib diisi" })
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: "email", message: "Format email tidak valid" })
  }

  // Password validation
  if (!password) {
    errors.push({ field: "password", message: "Password wajib diisi" })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
