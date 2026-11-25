import { useEffect, useState } from "react"

/**
 * Returns true when the viewport matches `(min-width: <breakpoint>px)`.
 * Defaults to `640` (Tailwind `sm` breakpoint).
 */
export function useIsDesktop(breakpoint = 640): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false
  )

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return
    }
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    setIsDesktop(mq.matches)
    mq.addEventListener?.("change", handler)
    return () => mq.removeEventListener?.("change", handler)
  }, [breakpoint])

  return isDesktop
}
