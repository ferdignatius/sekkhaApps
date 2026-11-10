import { z } from "zod"

/**
 * Strict Gmail-only validation rule:
 * - Normalized lowercase & trimmed before checking.
 * - Local part (before @gmail.com): 1–64 chars, letters/numbers/._+-, cannot start/end with dot, no consecutive dots (`..`).
 * - Domain: strictly `@gmail.com`.
 */
const GMAIL_REGEX =
  /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?@gmail\.com$/

export const GMAIL_ERROR_MESSAGE =
  "Please use a valid @gmail.com email address"

export function isValidGmailEmail(rawEmail: string): boolean {
  if (typeof rawEmail !== "string") return false
  const normalized = rawEmail.trim().toLowerCase()
  if (normalized.length === 0 || normalized.length > 254) return false
  const localPart = normalized.split("@")[0] ?? ""
  if (localPart.includes("..")) return false
  return GMAIL_REGEX.test(normalized)
}

export const gmailEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email maximum 254 characters")
  .refine((val) => isValidGmailEmail(val), {
    message: GMAIL_ERROR_MESSAGE,
  })

