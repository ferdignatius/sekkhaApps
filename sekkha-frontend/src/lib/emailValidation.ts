/**
 * Shared client-side email validation utilities.
 * - Sign Up, Change Email, and Forgot Password strictly allow valid `@gmail.com` addresses.
 * - Login remains general-purpose so existing seeded/legacy accounts (e.g. `@sekkha.com`) can sign in.
 */

const GENERAL_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const GMAIL_REGEX =
  /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?@gmail\.com$/

export const GMAIL_ERROR_MESSAGE =
  "Please use a valid @gmail.com email address"

export function isValidGmailEmail(email: string): boolean {
  if (typeof email !== "string") return false
  const normalized = email.trim().toLowerCase()
  if (normalized.length === 0 || normalized.length > 254) return false
  const localPart = normalized.split("@")[0] ?? ""
  if (localPart.includes("..")) return false
  return GMAIL_REGEX.test(normalized)
}

export function isValidGeneralEmail(email: string): boolean {
  if (typeof email !== "string") return false
  return GENERAL_EMAIL_REGEX.test(email.trim().toLowerCase())
}

export function validateGmailField(email: string): string | null {
  if (!email || !email.trim()) {
    return "Email is required"
  }
  if (!isValidGmailEmail(email)) {
    return GMAIL_ERROR_MESSAGE
  }
  return null
}

