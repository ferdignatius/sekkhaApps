import { useEffect, useState } from "react"

function getScrollThresholdBucket(y: number): 0 | 1 | 2 {
  if (y <= 0) return 0
  if (y <= 64) return 1
  return 2
}

/**
 * Hook that tracks the vertical scroll position of the window across
 * navbar thresholds (0px and 64px) to avoid re-rendering on every pixel.
 * Returns `{ scrollY: number }`.
 * The event listener is cleaned up on unmount.
 *
 * Requirements: 2.6, 2.7
 */
export function useScrollPosition(): { scrollY: number } {
  const [scrollY, setScrollY] = useState<number>(0)

  useEffect(() => {
    setScrollY(window.scrollY)

    const handleScroll = () => {
      const nextY = window.scrollY
      setScrollY((prevY) =>
        getScrollThresholdBucket(nextY) !== getScrollThresholdBucket(prevY)
          ? nextY
          : prevY
      )
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return { scrollY }
}
