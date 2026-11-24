import { useCallback, useEffect, useState } from "react"

/** Standard debounce delay (400ms) for server-backed search inputs. */
export const SEARCH_DEBOUNCE_MS = 400

/** Minimum character length before auto-triggering a server search (numeric IDs & Enter bypass). */
export const SEARCH_MIN_CHARS = 2

export interface DebouncedSearchOptions {
  delay?: number
  minChars?: number
}

/**
 * Hook to debounce a value by a specified delay in milliseconds.
 * Empty strings reset immediately so clearing a search filter feels instant.
 */
export function useDebounce<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    if (typeof value === "string" && value.trim() === "") {
      setDebouncedValue(value)
      return
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounced search hook returning `[debouncedValue, flushNow]`.
 * - Typing waits `delay` ms (default 400ms).
 * - Queries shorter than `minChars` (default 2, except numeric IDs) do not trigger
 *   automatic server queries, while clearing resets immediately.
 * - Calling `flushNow()` (e.g. on Enter key) commits the current query right away.
 */
export function useDebouncedSearch(
  value: string,
  delayOrOptions: number | DebouncedSearchOptions = SEARCH_DEBOUNCE_MS
): [string, () => void] {
  const delay =
    typeof delayOrOptions === "number"
      ? delayOrOptions
      : (delayOrOptions.delay ?? SEARCH_DEBOUNCE_MS)
  const minChars =
    typeof delayOrOptions === "number"
      ? SEARCH_MIN_CHARS
      : (delayOrOptions.minChars ?? SEARCH_MIN_CHARS)

  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed === "") {
      setDebouncedValue(value)
      return
    }

    const isNumeric = /^\d+$/.test(trimmed)
    if (!isNumeric && trimmed.length < minChars) {
      setDebouncedValue("")
      return
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay, minChars])

  const flushNow = useCallback(() => {
    setDebouncedValue(value)
  }, [value])

  return [debouncedValue, flushNow]
}
