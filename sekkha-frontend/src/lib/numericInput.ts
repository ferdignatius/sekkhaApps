/** Strips non-digit characters while allowing an empty string ("") while editing. */
export function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/\D+/g, "")
}

/**
 * Parses a positive/non-negative integer string and validates it lies within [min, max].
 * Returns null if empty, non-integer, or out of range so callers can validate on submit.
 */
export function parseBoundedInteger(
  raw: string,
  min: number,
  max: number
): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  if (!Number.isInteger(num) || num < min || num > max) return null
  return num
}
