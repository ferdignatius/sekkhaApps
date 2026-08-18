import { useEffect, useState } from 'react'

/**
 * Hook that tracks the current vertical scroll position of the window.
 * Returns `{ scrollY: number }` which is updated on every scroll event.
 * The event listener is cleaned up on unmount.
 *
 * Requirements: 2.6, 2.7
 */
export function useScrollPosition(): { scrollY: number } {
  const [scrollY, setScrollY] = useState<number>(0)

  useEffect(() => {
    setScrollY(window.scrollY)

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return { scrollY }
}
