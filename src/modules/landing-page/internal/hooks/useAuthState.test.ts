import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAuthState } from './useAuthState'

describe('useAuthState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should have initial state of "loading"', () => {
    const { result } = renderHook(() => useAuthState())

    expect(result.current.authState).toBe('loading')
  })

  it('should transition to "unauthenticated" after 3000ms timeout', () => {
    const { result } = renderHook(() => useAuthState())

    expect(result.current.authState).toBe('loading')

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.authState).toBe('unauthenticated')
  })

  it('should remain "loading" before the 3000ms timeout elapses', () => {
    const { result } = renderHook(() => useAuthState())

    act(() => {
      vi.advanceTimersByTime(2999)
    })

    expect(result.current.authState).toBe('loading')
  })

  it('should clear the timeout on unmount', () => {
    const { result, unmount } = renderHook(() => useAuthState())

    expect(result.current.authState).toBe('loading')

    unmount()

    act(() => {
      vi.runAllTimers()
    })

    // After unmount the state update should not have happened
    expect(result.current.authState).toBe('loading')
  })
})
