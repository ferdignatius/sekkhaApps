import { useEffect, useRef, useState } from "react"

export interface MobileKeyboardState {
  /** Height occluded at the bottom by the virtual keyboard (primarily iOS Safari where window.innerHeight does not shrink). */
  keyboardInset: number
  /** Actual visible height in CSS pixels above the virtual keyboard. */
  availableHeight: number
  /** True when a virtual keyboard is detected as open via visualViewport shrink or bottom inset. */
  isKeyboardOpen: boolean
}

const KEYBOARD_THRESHOLD_PX = 120

function isTextEntryElement(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true
  if (el.tagName === "INPUT") {
    const type = (el as HTMLInputElement).type.toLowerCase()
    return !["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "hidden"].includes(
      type
    )
  }
  return false
}

/**
 * Tracks mobile virtual keyboard height using `window.visualViewport` + focus state.
 * Works consistently across both iOS Safari (`visualViewport.height` shrinks while `innerHeight` stays fixed)
 * and Android Chrome with `interactive-widget=resizes-content` (`innerHeight` shrinks with `visualViewport.height`).
 */
export function useMobileKeyboardInset(enabled = true): MobileKeyboardState {
  const baselineHeightRef = useRef<number>(
    typeof window !== "undefined" ? window.innerHeight : 0
  )

  const [state, setState] = useState<MobileKeyboardState>(() => ({
    keyboardInset: 0,
    availableHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    isKeyboardOpen: false,
  }))

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setState({
        keyboardInset: 0,
        availableHeight: typeof window !== "undefined" ? window.innerHeight : 0,
        isKeyboardOpen: false,
      })
      return
    }

    function measure() {
      const vv = window.visualViewport
      const layoutHeight = window.innerHeight
      const visualHeight = vv ? Math.round(vv.height) : layoutHeight
      const inset = Math.max(0, layoutHeight - visualHeight)
      const focused = isTextEntryElement(document.activeElement)

      if (!focused && inset <= KEYBOARD_THRESHOLD_PX) {
        baselineHeightRef.current = Math.max(baselineHeightRef.current, layoutHeight, visualHeight)
      } else if (layoutHeight > baselineHeightRef.current) {
        baselineHeightRef.current = layoutHeight
      }

      const shrunkFromBaseline =
        focused && baselineHeightRef.current - visualHeight > KEYBOARD_THRESHOLD_PX
      const isKeyboardOpen = inset > KEYBOARD_THRESHOLD_PX || shrunkFromBaseline

      setState((prev) => {
        if (
          prev.keyboardInset === inset &&
          prev.availableHeight === visualHeight &&
          prev.isKeyboardOpen === isKeyboardOpen
        ) {
          return prev
        }
        return {
          keyboardInset: inset,
          availableHeight: visualHeight,
          isKeyboardOpen,
        }
      })
    }

    measure()

    const vv = window.visualViewport
    vv?.addEventListener("resize", measure)
    window.addEventListener("resize", measure)
    document.addEventListener("focusin", measure)
    document.addEventListener("focusout", measure)

    return () => {
      vv?.removeEventListener("resize", measure)
      window.removeEventListener("resize", measure)
      document.removeEventListener("focusin", measure)
      document.removeEventListener("focusout", measure)
    }
  }, [enabled])

  return state
}
