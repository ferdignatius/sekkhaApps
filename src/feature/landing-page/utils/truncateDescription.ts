/**
 * Truncates a description string to a maximum length.
 *
 * @param text - The input string to potentially truncate.
 * @param maxLength - Maximum number of characters before truncation (default: 120).
 * @returns The original string if within maxLength, otherwise the first maxLength
 *          characters followed by the ellipsis character '…' (U+2026).
 */
export function truncateDescription(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}
