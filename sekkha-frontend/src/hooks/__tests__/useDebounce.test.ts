import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
  useDebouncedSearch,
} from "../useDebounce"

describe("useDebouncedSearch (400ms + min 2 chars except numeric/Enter)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("uses 400ms debounce and minimum 2 characters by default", () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(400)
    expect(SEARCH_MIN_CHARS).toBe(2)
  })

  it("ignores single-letter queries unless Enter (flushNow) is called", () => {
    const { result, rerender } = renderHook(
      ({ q }) => useDebouncedSearch(q),
      { initialProps: { q: "" } }
    )

    rerender({ q: "a" })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current[0]).toBe("")

    // Pressing Enter flushes single-letter query immediately
    act(() => {
      result.current[1]()
    })
    expect(result.current[0]).toBe("a")
  })

  it("commits 2+ character queries after 400ms and clears immediately on empty string", () => {
    const { result, rerender } = renderHook(
      ({ q }) => useDebouncedSearch(q),
      { initialProps: { q: "" } }
    )

    rerender({ q: "bu" })
    act(() => {
      vi.advanceTimersByTime(350)
    })
    expect(result.current[0]).toBe("")

    act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(result.current[0]).toBe("bu")

    // Clearing resets immediately without waiting 400ms
    rerender({ q: "" })
    expect(result.current[0]).toBe("")
  })

  it("allows single-digit numeric ID queries after 400ms", () => {
    const { result, rerender } = renderHook(
      ({ q }) => useDebouncedSearch(q),
      { initialProps: { q: "" } }
    )

    rerender({ q: "2" })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current[0]).toBe("2")
  })
})
