import { useCallback, useEffect, useState } from "react"

/** Standard debounce delay (1s) for server-backed search inputs to prevent API bursts. */
export const SEARCH_DEBOUNCE_MS = 1000

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
 * Typing waits `delay` ms (default 1000ms), clearing resets immediately,
 * and calling `flushNow()` (e.g. on Enter key) commits the current query right away.
 */
export function useDebouncedSearch(
  value: string,
  delay = SEARCH_DEBOUNCE_MS
): [string, () => void] {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    if (value.trim() === "") {
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

  const flushNow = useCallback(() => {
    setDebouncedValue(value)
  }, [value])

  return [debouncedValue, flushNow]
}
