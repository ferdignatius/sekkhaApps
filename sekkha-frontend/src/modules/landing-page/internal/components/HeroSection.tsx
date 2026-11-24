import { useState, useCallback } from "react"
import { motion } from "motion/react"
import {
  ArrowRightIcon,
  Bolt,
  CheckCircle2Icon,
  DownloadIcon,
  FlameIcon,
  QrCodeIcon,
} from "lucide-react"
import { Button } from "@/components/base"
import { InstallAppGuideDialog } from "@/components/common/InstallAppPrompt"
import { usePwaInstall } from "@/hooks/usePwaInstall"
import { DashboardMockup } from "./DashboardMockup"

interface HeroSectionProps {
  headline: string
  subheadline: string
}

const EASE = "easeOut"

export function HeroSection({ headline, subheadline }: HeroSectionProps) {
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const { isInstalled, isIos, promptInstall } = usePwaInstall()

  const handleInstallApp = useCallback(async () => {
    const result = await promptInstall()
    if (result === "manual") {
      setInstallGuideOpen(true)
    }
  }, [promptInstall])

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative w-full overflow-hidden pt-12 pb-16 md:pt-18 md:pb-24"
    >
      {/* Warm Sekkha Sunrise backdrop + subtle sanctuary pavilion silhouette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-b from-[#FFE0C2]/45 via-[#FAF0DF]/40 to-sekkha-canvas"
      />
      <img
        src="/Serene%20Sky%20Garden%20Pavilion.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center opacity-20 mix-blend-multiply select-none"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-sekkha-canvas to-transparent"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 text-center md:px-8">
        <motion.h1
          id="hero-heading"
          className="max-w-[820px] text-4xl leading-[1.06] font-extrabold tracking-tight text-sekkha-ink sm:text-5xl md:text-[3.5rem]"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
        >
          {headline}
        </motion.h1>

        <motion.p
          className="text-body-md mt-5 max-w-[620px] leading-relaxed font-normal text-sekkha-slate md:text-lg"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.14 }}
        >
          {subheadline}
        </motion.p>

        {/* Centered CTA Group: Join for Free + Download App (PWA) + Explore Events link */}
        <motion.div
          className="mt-8 flex w-full flex-col items-center gap-3"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.22 }}
        >
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Button
              variant="primary"
              className="h-[46px] w-full rounded-full bg-[#0a0a0a] px-8 font-semibold text-white shadow-sm hover:bg-[#1f1f1f] sm:w-auto"
              asChild
            >
              <a
                href="/sign-up"
                role="button"
                className="font-semibold !text-white"
              >
                Join for Free
              </a>
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={isInstalled}
              onClick={() => void handleInstallApp()}
              className="h-[46px] w-full rounded-full border border-[#e5dec9] bg-white/90 px-7 font-semibold text-sekkha-ink shadow-xs hover:bg-sekkha-surface sm:w-auto"
            >
              {isInstalled ? (
                <span className="inline-flex items-center gap-2 text-clay-teal">
                  <CheckCircle2Icon className="size-4" />
                  <span>App Installed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <DownloadIcon className="size-4" />
                  <span>Download App</span>
                </span>
              )}
            </Button>
          </div>

          <a
            href="#events"
            role="button"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-sekkha-slate transition-colors hover:text-sekkha-ink"
          >
            <span>Explore Events</span>
            <ArrowRightIcon className="size-3.5" />
          </a>
        </motion.div>

        {/* Centered Trust Highlights */}
        <motion.div
          className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs font-semibold text-sekkha-slate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.28 }}
        >
          <span className="inline-flex items-center gap-1.5">
            <QrCodeIcon className="size-4 text-clay-teal" />
            Instant QR Check-In
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bolt className="size-4 text-[#c28e20]" />
            Daily Karma Points
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FlameIcon className="size-4 text-clay-ochre" />
            Weekly Streak
          </span>
        </motion.div>

        {/* Centered Floating App Card Showcase with Subtle Radial Aura */}
        <div className="relative mt-11 flex w-full justify-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[340px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFE0C2]/55 blur-3xl sm:w-[560px]"
          />
          <DashboardMockup />
        </div>
      </div>

      <InstallAppGuideDialog
        open={installGuideOpen}
        onOpenChange={setInstallGuideOpen}
        isIos={isIos}
      />
    </section>
  )
}
