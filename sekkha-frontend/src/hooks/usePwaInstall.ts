import { useEffect, useState, useCallback } from "react"

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt: () => Promise<void>
}

let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null
let sharedInstalled = false
const subscribers = new Set<() => void>()
let listenersInitialized = false

function notifySubscribers() {
  for (const fn of subscribers) {
    fn()
  }
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false
  const mediaMatch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches
  const iosStandalone =
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  return mediaMatch || iosStandalone
}

function detectIos(): boolean {
  if (typeof window === "undefined" || !window.navigator) return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function ensureGlobalListeners() {
  if (listenersInitialized || typeof window === "undefined") return
  listenersInitialized = true
  sharedInstalled = isStandaloneMode()

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    sharedDeferredPrompt = event as BeforeInstallPromptEvent
    notifySubscribers()
  })

  window.addEventListener("appinstalled", () => {
    sharedDeferredPrompt = null
    sharedInstalled = true
    notifySubscribers()
  })
}

/** Reset helper strictly for unit tests. */
export function __resetPwaInstallStoreForTest(opts?: {
  deferredPrompt?: BeforeInstallPromptEvent | null
  installed?: boolean
}) {
  sharedDeferredPrompt = opts?.deferredPrompt ?? null
  sharedInstalled = opts?.installed ?? isStandaloneMode()
  notifySubscribers()
}

export type InstallPromptResult = "accepted" | "dismissed" | "manual" | "installed"

export function usePwaInstall() {
  const [, setTick] = useState(0)

  useEffect(() => {
    ensureGlobalListeners()
    const onChange = () => setTick((n) => n + 1)
    subscribers.add(onChange)
    return () => {
      subscribers.delete(onChange)
    }
  }, [])

  const isInstalled = sharedInstalled || isStandaloneMode()
  const canPromptNatively = Boolean(sharedDeferredPrompt) && !isInstalled
  const isIos = detectIos()

  const promptInstall = useCallback(async (): Promise<InstallPromptResult> => {
    if (sharedInstalled || isStandaloneMode()) {
      return "installed"
    }
    const promptEvent = sharedDeferredPrompt
    if (!promptEvent) {
      return "manual"
    }

    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      sharedDeferredPrompt = null
      if (choice.outcome === "accepted") {
        sharedInstalled = true
      }
      notifySubscribers()
      return choice.outcome
    } catch {
      return "manual"
    }
  }, [])

  return {
    isInstalled,
    canPromptNatively,
    isIos,
    promptInstall,
  }
}
