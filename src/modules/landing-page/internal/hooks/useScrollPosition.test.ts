import { renderHook, act } from '@testing-library/react'
import { useScrollPosition } from './useScrollPosition'

describe('useScrollPosition', () => {
  beforeEach(() => {
    // Reset scrollY to 0 before each test
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    })
  })

  it('returns scrollY: 0 on initial render', () => {
    const { result } = renderHook(() => useScrollPosition())
    expect(result.current.scrollY).toBe(0)
  })

  it('updates scrollY after window.scrollY changes and scroll event is dispatched', () => {
    const { result } = renderHook(() => useScrollPosition())

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 250,
      })
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.scrollY).toBe(250)
  })
})
