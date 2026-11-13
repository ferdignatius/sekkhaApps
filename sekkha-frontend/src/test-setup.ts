import "@testing-library/react"

// Mock IntersectionObserver — not available in jsdom but required by
// framer-motion's whileInView feature. This stub makes components render
// without throwing in the test environment.
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class MockIntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = ""
    readonly thresholds: ReadonlyArray<number> = []
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  } as unknown as typeof IntersectionObserver
}

// Mock matchMedia — not available in jsdom but required by use-mobile hook.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

// Suppress jsdom "Not implemented: navigation to another Document"
if (typeof window !== "undefined") {
  const vc = (window as unknown as { _virtualConsole?: { listeners: (event: string) => Array<(...args: unknown[]) => void>; removeAllListeners: (event: string) => void; on: (event: string, fn: (...args: unknown[]) => void) => void } })._virtualConsole
  if (vc) {
    const originalListeners = [...vc.listeners("jsdomError")]
    vc.removeAllListeners("jsdomError")
    vc.on("jsdomError", (error: any) => {
      if (error?.message?.includes("Not implemented: navigation to another Document")) {
        return
      }
      for (const listener of originalListeners) {
        listener(error)
      }
    })
  }
}

