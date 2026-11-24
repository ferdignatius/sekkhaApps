import { useEffect, useRef, useState } from "react"
import { FlameIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type StreakStatus = "active" | "paused" | "inactive" | "expired"
export type StreakFlameTier = "dead" | "small" | "medium" | "big"

export interface StreakFlameMeta {
  tier: StreakFlameTier
  level: 0 | 1 | 2 | 3
  label: string
  assetPath: string
}

const ACTIVE_ANIMATION_DURATION_MS = 60_000

const animationDataCache = new Map<string, Promise<object | null>>()

function fetchAnimationJson(assetPath: string): Promise<object | null> {
  if (typeof fetch !== "function") {
    return Promise.resolve(null)
  }

  const cached = animationDataCache.get(assetPath)
  if (cached) return cached

  const request = fetch(assetPath)
    .then(async (res) => {
      if (!res.ok) return null
      return (await res.json()) as object
    })
    .catch(() => null)

  animationDataCache.set(assetPath, request)
  return request
}

/**
 * Resolves the 4-tier Lottie flame asset for a member's current streak and status.
 * Paused, inactive, expired, or zero streaks render Level 0 (Dead Fire).
 */
export function resolveStreakFlameMeta(
  count: number,
  status?: StreakStatus
): StreakFlameMeta {
  const isDormant =
    status === "paused" ||
    status === "inactive" ||
    status === "expired" ||
    count <= 0

  if (isDormant) {
    return {
      tier: "dead",
      level: 0,
      label: "Dead Fire",
      assetPath: "/streak-pack/streak-dead.json",
    }
  }

  if (count === 1) {
    return {
      tier: "small",
      level: 1,
      label: "Small Fire",
      assetPath: "/streak-pack/streak-small.json",
    }
  }

  if (count === 2) {
    return {
      tier: "medium",
      level: 2,
      label: "Medium Fire",
      assetPath: "/streak-pack/streak-medium.json",
    }
  }

  return {
    tier: "big",
    level: 3,
    label: "Big Fire",
    assetPath: "/streak-pack/streak-big.json",
  }
}

export interface StreakFlameProps {
  count: number
  status?: StreakStatus
  className?: string
}

/**
 * 4-tier Lottie streak flame powered by `/public/streak-pack/*.json`.
 * Level 0 (Dead Fire) renders static stone-gray Lottie art with no animation;
 * active tiers loop for 1 minute then rest cleanly (restarts 1-minute timer on tap,
 * and respects `prefers-reduced-motion`).
 */
export function StreakFlame({ count, status, className }: StreakFlameProps) {
  const meta = resolveStreakFlameMeta(count, status)
  const containerRef = useRef<HTMLDivElement>(null)
  const stopTimerRef = useRef<number | null>(null)
  const animRef = useRef<{
    destroy: () => void
    goToAndStop: (value: number, isFrame?: boolean) => void
    goToAndPlay: (value: number, isFrame?: boolean) => void
    pause: () => void
    play: () => void
  } | null>(null)
  const [loadedAsset, setLoadedAsset] = useState<string | null>(null)
  const lottieReady = loadedAsset === meta.assetPath
  const isStaticTier = meta.tier === "dead"

  function clearStopTimer() {
    if (stopTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
  }

  function scheduleStopTimer(anim: NonNullable<typeof animRef.current>) {
    clearStopTimer()
    if (typeof window === "undefined") return
    stopTimerRef.current = window.setTimeout(() => {
      anim.goToAndStop(13, true)
      anim.pause()
      stopTimerRef.current = null
    }, ACTIVE_ANIMATION_DURATION_MS)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let destroyed = false

    clearStopTimer()
    container.innerHTML = ""
    animRef.current = null

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const shouldAnimate = !isStaticTier && !prefersReducedMotion

    void (async () => {
      try {
        const [lottieModule, animationData] = await Promise.all([
          import("lottie-web/build/player/lottie_light"),
          fetchAnimationJson(meta.assetPath),
        ])
        if (cancelled || !animationData) return

        const lottie = lottieModule.default ?? lottieModule
        if (typeof lottie?.loadAnimation !== "function") return

        const anim = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: shouldAnimate,
          autoplay: shouldAnimate,
          animationData,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        })

        animRef.current = anim
        if (!shouldAnimate) {
          anim.goToAndStop(isStaticTier ? 0 : 13, true)
          anim.pause()
        } else {
          scheduleStopTimer(anim)
        }
        setLoadedAsset(meta.assetPath)
      } catch {
        // Keep accessible vector fallback if Lottie player is unavailable
      }
    })()

    return () => {
      cancelled = true
      clearStopTimer()
      if (animRef.current && !destroyed) {
        destroyed = true
        animRef.current.destroy()
        animRef.current = null
      }
    }
  }, [meta.assetPath, isStaticTier])

  function handleReplay() {
    if (isStaticTier || !animRef.current) return
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return
    animRef.current.goToAndPlay(0, true)
    animRef.current.play()
    scheduleStopTimer(animRef.current)
  }

  return (
    <span
      data-testid="streak-flame"
      data-streak-tier={meta.tier}
      data-streak-level={meta.level}
      data-streak-asset={meta.assetPath}
      data-streak-animated={isStaticTier ? "false" : "timed"}
      onClick={handleReplay}
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center select-none",
        !isStaticTier && "cursor-pointer",
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
        <FlameIcon
          className={cn(
            "absolute inset-0 m-auto size-9 sm:size-11",
            meta.tier === "dead" ? "text-[#9c927d]" : "text-[#ff6a2b]"
          )}
        />
      )}
    </span>
  )
}
