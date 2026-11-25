import { useEffect, useRef, useState } from "react"
import { FlameIcon, SparklesIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type StreakStatus = "active" | "paused" | "inactive" | "expired"
export type StreakFlameTier = "dormant" | "starter" | "rising" | "milestone"

export const STREAK_BASE_ASSET_PATH = "/streak-pack/streak-big.json"

export interface StreakFlameMeta {
  tier: StreakFlameTier
  level: 0 | 1 | 2 | 3
  label: string
  assetPath: string
}

type RgbTriplet = [number, number, number]

const TIER_GRADIENT_PALETTES: Record<
  StreakFlameTier,
  { innerCore: RgbTriplet[]; outerFlame: RgbTriplet[] }
> = {
  // Abu-abu: belum aktif / menunggu interaksi / paused
  dormant: {
    innerCore: [
      [245, 245, 244],
      [231, 229, 228],
    ],
    outerFlame: [
      [120, 113, 108],
      [168, 162, 158],
      [214, 211, 209],
    ],
  },
  // Oranye / Kuning: warna awal saat streak baru dimulai & aktif (1 minggu)
  starter: {
    innerCore: [
      [255, 249, 196],
      [255, 243, 161],
    ],
    outerFlame: [
      [234, 88, 12],
      [245, 158, 11],
      [251, 191, 36],
    ],
  },
  // Merah: muncul seiring bertambahnya streak aktif (2-3 minggu)
  rising: {
    innerCore: [
      [254, 240, 138],
      [252, 165, 165],
    ],
    outerFlame: [
      [220, 38, 38],
      [239, 68, 68],
      [248, 113, 113],
    ],
  },
  // Ungu: pencapaian milestone lanjutan (4+ minggu)
  milestone: {
    innerCore: [
      [250, 245, 255],
      [233, 213, 255],
    ],
    outerFlame: [
      [109, 40, 217],
      [139, 92, 246],
      [192, 132, 252],
    ],
  },
}

const TIER_FALLBACK_COLOR: Record<StreakFlameTier, string> = {
  dormant: "text-[#9c927d]",
  starter: "text-[#f59e0b]",
  rising: "text-[#ef4444]",
  milestone: "text-[#8b5cf6]",
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
 * Clones the base `streak-big.json` Lottie payload and applies the RGB gradient
 * palette for the resolved streak tier without fetching separate asset files.
 */
export function recolorStreakAnimationData<T extends object>(
  baseData: T,
  tier: StreakFlameTier
): T {
  const cloned = JSON.parse(JSON.stringify(baseData)) as T
  const palette = TIER_GRADIENT_PALETTES[tier]
  let gradientIndex = 0

  function applyPalette(node: unknown) {
    if (!node || typeof node !== "object") return
    const record = node as Record<string, unknown>

    if (
      record.ty === "gf" &&
      record.g &&
      typeof record.g === "object" &&
      (record.g as { k?: { k?: unknown } }).k?.k &&
      Array.isArray((record.g as { k: { k: unknown[] } }).k.k)
    ) {
      const stops =
        gradientIndex === 0 ? palette.innerCore : palette.outerFlame
      const colorArray = (record.g as { k: { k: number[] } }).k.k
      for (
        let i = 0;
        i + 3 < colorArray.length && Math.floor(i / 4) < stops.length;
        i += 4
      ) {
        const [r, g, b] = stops[Math.floor(i / 4)]
        colorArray[i + 1] = Number((r / 255).toFixed(4))
        colorArray[i + 2] = Number((g / 255).toFixed(4))
        colorArray[i + 3] = Number((b / 255).toFixed(4))
      }
      gradientIndex++
    }

    for (const value of Object.values(record)) {
      applyPalette(value)
    }
  }

  applyPalette(cloned)
  return cloned
}

/**
 * Resolves the 4-tier streak state backed by a single `/streak-pack/streak-big.json` asset:
 * - Level 0 (`dormant`): Abu-abu (0 / paused / inactive / expired)
 * - Level 1 (`starter`): Oranye / Kuning (1 week active)
 * - Level 2 (`rising`): Merah (2–3 weeks active)
 * - Level 3 (`milestone`): Ungu + efek milestone (4+ weeks active)
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
      tier: "dormant",
      level: 0,
      label: "Dormant Flame",
      assetPath: STREAK_BASE_ASSET_PATH,
    }
  }

  if (count === 1) {
    return {
      tier: "starter",
      level: 1,
      label: "Starter Flame",
      assetPath: STREAK_BASE_ASSET_PATH,
    }
  }

  if (count <= 3) {
    return {
      tier: "rising",
      level: 2,
      label: "Rising Flame",
      assetPath: STREAK_BASE_ASSET_PATH,
    }
  }

  return {
    tier: "milestone",
    level: 3,
    label: "Purple Milestone Flame",
    assetPath: STREAK_BASE_ASSET_PATH,
  }
}

export interface StreakFlameProps {
  count: number
  status?: StreakStatus
  className?: string
}

/**
 * 4-tier Lottie streak flame powered by a single `/public/streak-pack/streak-big.json`
 * asset dynamically recolored per tier (Abu-abu statis, Oranye/Kuning, Merah, and
 * Ungu + subtle aura/sparkles for milestone achievements).
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
  const [loadedTier, setLoadedTier] = useState<StreakFlameTier | null>(null)
  const lottieReady = loadedTier === meta.tier
  const isStaticTier = meta.tier === "dormant"
  const isMilestoneTier = meta.tier === "milestone"

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
        const [lottieModule, baseAnimationData] = await Promise.all([
          import("lottie-web/build/player/lottie_light"),
          fetchAnimationJson(meta.assetPath),
        ])
        if (cancelled || !baseAnimationData) return

        const lottie = lottieModule.default ?? lottieModule
        if (typeof lottie?.loadAnimation !== "function") return

        const themedData = recolorStreakAnimationData(baseAnimationData, meta.tier)
        const anim = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: shouldAnimate,
          autoplay: shouldAnimate,
          animationData: themedData,
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
        setLoadedTier(meta.tier)
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
  }, [meta.assetPath, meta.tier, isStaticTier])

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
      data-streak-milestone={isMilestoneTier ? "true" : "false"}
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
          isMilestoneTier && "drop-shadow-[0_0_12px_rgba(139,92,246,0.45)]",
          !lottieReady && "opacity-0"
        )}
      />
      {isMilestoneTier && (
        <>
          <SparklesIcon
            aria-hidden="true"
            className="pointer-events-none absolute -top-0.5 -right-0.5 size-3.5 animate-pulse text-[#a855f7] drop-shadow-[0_0_6px_rgba(168,85,247,0.65)]"
          />
          <SparklesIcon
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 -left-1 size-2.5 animate-pulse text-[#c084fc] [animation-delay:350ms]"
          />
        </>
      )}
      {!lottieReady && (
        <FlameIcon
          className={cn(
            "absolute inset-0 m-auto size-9 sm:size-11",
            TIER_FALLBACK_COLOR[meta.tier]
          )}
        />
      )}
    </span>
  )
}
