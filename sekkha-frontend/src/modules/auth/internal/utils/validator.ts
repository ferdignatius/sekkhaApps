// Feature: auth-flow
// Form validation utilities for Sign Up and Login forms.
// Requirements: 1.11, 1.12, 1.13, 3.1, 3.2, 3.3, 3.4, 3.5

import { isValidGeneralEmail, validateGmailField } from "@/lib/emailValidation"

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FieldError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: FieldError[]
}

// ─── validateSignUpForm ────────────────────────────────────────────────────────

export interface SignUpFormInput {
  name?: string
  email: string
  password: string
  confirmPassword: string
  agreeToPrivacy?: boolean
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
 * - agreeToPrivacy must be true when provided
 */
export function validateSignUpForm({
  name,
  email,
  password,
  confirmPassword,
  agreeToPrivacy,
}: SignUpFormInput): ValidationResult {
  const errors: FieldError[] = []

  // Name validation (PRD Section 4.1 & 6: required, at least 2 characters)
  if (name !== undefined) {
    const trimmedName = name.trim()
    if (!trimmedName) {
      errors.push({ field: "name", message: "Full name is required" })
    } else if (trimmedName.length < 2) {
      errors.push({ field: "name", message: "Name must be at least 2 characters" })
    }
  }

  // Email validation (strictly @gmail.com during Sign Up)
  const emailError = validateGmailField(email)
  if (emailError) {
    errors.push({ field: "email", message: emailError })
  }

  // Password validation
  if (!password) {
    errors.push({ field: "password", message: "Password is required" })
  } else if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters",
    })
  }

  // Confirm password validation
  if (confirmPassword !== password) {
    errors.push({
      field: "confirmPassword",
      message: "Passwords do not match",
    })
  }

  // Privacy policy agreement validation (mandatory if specified)
  if (agreeToPrivacy === false) {
    errors.push({
      field: "agreeToPrivacy",
      message: "You must agree to the Privacy Policy to register",
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ─── validateLoginForm ─────────────────────────────────────────────────────────

export interface LoginFormInput {
  identifier: string
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
  identifier,
  password,
}: LoginFormInput): ValidationResult {
  const errors: FieldError[] = []

  // Email or Username identifier validation
  const trimmed = identifier.trim()
  if (!trimmed) {
    errors.push({
      field: "identifier",
      message: "Email or username is required",
    })
  } else if (trimmed.includes("@") && !isValidGeneralEmail(trimmed)) {
    errors.push({ field: "identifier", message: "Invalid email format" })
  } else if (!trimmed.includes("@") && trimmed.length < 3) {
    errors.push({ field: "identifier", message: "Username must be at least 3 characters" })
  }

  // Password validation
  if (!password) {
    errors.push({ field: "password", message: "Password is required" })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
