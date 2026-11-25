import { useEffect, useRef, useState } from "react"
import { CheckCircle2Icon } from "lucide-react"
import { Button } from "@/components/base"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/base/Dialog"
import { cn } from "@/lib/utils"

export const SUCCESS_LOTTIE_ASSET_PATH = "/assets/success.json"

let cachedSuccessAnimation: Promise<object | null> | null = null

function fetchSuccessAnimationJson(): Promise<object | null> {
  if (typeof fetch !== "function") {
    return Promise.resolve(null)
  }
  if (!cachedSuccessAnimation) {
    cachedSuccessAnimation = fetch(SUCCESS_LOTTIE_ASSET_PATH)
      .then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as object
      })
      .catch(() => null)
  }
  return cachedSuccessAnimation
}

export interface SuccessLottieProps {
  className?: string
  loop?: boolean
}

/**
 * Plays `/assets/success.json` (extracted from `/assets/success.lottie`) via `lottie_light`,
 * falling back to a crisp vector checkmark if unavailable and respecting `prefers-reduced-motion`.
 */
export function SuccessLottie({ className, loop = false }: SuccessLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lottieReady, setLottieReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let destroyed = false
    let anim: { destroy: () => void; goToAndStop: (v: number, f?: boolean) => void } | null =
      null

    container.innerHTML = ""

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    void (async () => {
      try {
        const [lottieModule, animationData] = await Promise.all([
          import("lottie-web/build/player/lottie_light"),
          fetchSuccessAnimationJson(),
        ])
        if (cancelled || !animationData) return

        const lottie = lottieModule.default ?? lottieModule
        if (typeof lottie?.loadAnimation !== "function") return

        const instance = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: loop && !prefersReducedMotion,
          autoplay: !prefersReducedMotion,
          animationData,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        })

        anim = instance
        if (prefersReducedMotion) {
          instance.goToAndStop(69, true)
        }
        setLottieReady(true)
      } catch {
        // Keep vector fallback icon when Lottie cannot mount
      }
    })()

    return () => {
      cancelled = true
      if (anim && !destroyed) {
        destroyed = true
        anim.destroy()
      }
    }
  }, [loop])

  return (
    <span
      data-testid="success-lottie"
      data-lottie-ready={lottieReady ? "true" : "false"}
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center select-none",
        className
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          "size-full [&>svg]:h-full [&>svg]:w-full",
          !lottieReady && "opacity-0"
        )}
      />
      {!lottieReady && (
        <CheckCircle2Icon className="absolute inset-0 m-auto size-[70%] text-emerald-600" />
      )}
    </span>
  )
}

export interface SuccessCelebrationModalProps {
  open: boolean
  title: string
  description?: string
  actionLabel?: string
  autoCloseMs?: number
  onComplete: () => void
}

/**
 * Non-intrusive milestone celebration modal displaying the animated success check,
 * auto-advancing after `autoCloseMs` or immediately when the user clicks the CTA.
 */
export function SuccessCelebrationModal({
  open,
  title,
  description,
  actionLabel = "Continue",
  autoCloseMs,
  onComplete,
}: SuccessCelebrationModalProps) {
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!open) {
      completedRef.current = false
      return
    }
    if (!autoCloseMs || autoCloseMs <= 0) return

    const timer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current()
      }
    }, autoCloseMs)
    return () => window.clearTimeout(timer)
  }, [open, autoCloseMs])

  function handleContinue() {
    if (completedRef.current) return
    completedRef.current = true
    onCompleteRef.current()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleContinue()
      }}
    >
      <DialogContent
        data-testid="success-celebration-modal"
        className="max-w-sm rounded-[28px] border border-[#e5dec9] bg-[#fffaf0] p-6 text-center shadow-xl"
      >
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-1 flex size-24 items-center justify-center">
            <SuccessLottie className="size-24" />
          </div>
          <DialogTitle className="text-lg font-extrabold tracking-tight text-ink">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="mt-1 text-xs leading-relaxed text-text-muted">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="mt-2 sm:justify-center">
          <Button
            type="button"
            variant="filled"
            onClick={handleContinue}
            className="h-11 w-full rounded-full bg-[#0a0a0a] px-6 text-xs font-semibold text-white hover:bg-[#1f1f1f]"
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
