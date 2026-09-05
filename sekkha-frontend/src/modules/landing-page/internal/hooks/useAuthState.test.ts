import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthState } from './useAuthState'

describe('useAuthState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return "unauthenticated" when no stored token exists', () => {
    const { result } = renderHook(() => useAuthState())
    expect(result.current.authState).toBe('unauthenticated')
  })
})
