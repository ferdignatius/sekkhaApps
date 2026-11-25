import { useState } from "react"
import { motion } from "motion/react"
import {
  Bolt,
  CheckCircle2Icon,
  QrCodeIcon,
  CalendarCheck2Icon,
} from "lucide-react"
import { StreakFlame } from "@/components/common/StreakFlame"

interface SimulationItem {
  id: number
  title: string
  kind: string
  reward: number
  done: boolean
}

const DAILY_CAP_PTS = 150
const SEASON_GOAL = 300

const INITIAL_ACTIVITIES: SimulationItem[] = [
  {
    id: 1,
    title: "Sunday Youth Fellowship Check-In",
    kind: "Verified Attendance",
    reward: 50,
    done: true,
  },
  {
    id: 2,
    title: "MC / Host Service Duty",
    kind: "Seva Duty",
    reward: 30,
    done: false,
  },
  {
    id: 3,
    title: "Usher & Setup Duty",
    kind: "Seva Duty",
    reward: 30,
    done: false,
  },
]

export function DashboardMockup() {
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES)
  const [seasonPoints, setSeasonPoints] = useState(180)

  const toggleActivity = (id: number) => {
    const target = activities.find((item) => item.id === id)
    if (!target) return
    const nextDone = !target.done
    setActivities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: nextDone } : item))
    )
    setSeasonPoints((pts) =>
      nextDone ? pts + target.reward : pts - target.reward
    )
  }

  const seasonProgress = Math.min(
    100,
    Math.round((seasonPoints / SEASON_GOAL) * 100)
  )

  return (
    <div className="relative mx-auto w-full max-w-[520px] text-left select-none">
      {/* Floating Sekkha App Card (Warm Clay Canvas Frame) */}
      <div className="overflow-hidden rounded-[28px] border border-[#e5dec9] bg-[#fffaf0] text-sekkha-ink shadow-[0_20px_50px_-15px_rgba(68,51,28,0.14)]">
        {/* Warm Sunrise Mini Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#FFE0C2] via-[#FAF0DF] to-[#fffaf0] px-5 pt-5 pb-9">
          <img
            src="/background/home-background.webp"
            alt=""
            aria-hidden="true"
            width={520}
            height={180}
            fetchPriority="low"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-multiply select-none"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#FAF0DF]/85 via-transparent to-transparent"
          />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-sekkha-slate">
                Today · Sunday Puja
              </p>
              <p className="mt-0.5 text-xl leading-tight font-extrabold tracking-tight text-sekkha-ink">
                Good morning.
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#e5dec9] bg-white/90 px-3 py-1 text-[11px] font-semibold text-sekkha-ink shadow-xs">
              <QrCodeIcon className="size-3.5 text-clay-teal" />
              <span className="tabular-nums">ID 2026111201</span>
            </div>
          </div>

          {/* Live Streak + Karma Points Highlight Strip */}
          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#e5dec9] bg-white/90 px-3 py-2.5 shadow-xs backdrop-blur-sm">
              <StreakFlame count={5} status="active" className="h-10 w-8 shrink-0" />
              <div className="min-w-0">
                <span className="block truncate text-sm leading-tight font-extrabold text-sekkha-ink">
                  5 Weeks
                </span>
                <span className="block truncate text-[11px] font-medium text-sekkha-slate">
                  Weekly Streak
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-2xl border border-[#e5dec9] bg-white/90 px-3 py-2.5 shadow-xs backdrop-blur-sm">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF0DF]">
                <Bolt className="size-4.5 text-[#c28e20]" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm leading-tight font-extrabold text-sekkha-ink tabular-nums">
                  {seasonPoints} pts
                </span>
                <span className="block truncate text-[11px] font-medium text-sekkha-slate">
                  Karma Points
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Curved Sheet Content */}
        <div className="relative -mt-4 space-y-3.5 rounded-t-[24px] border-t border-[#e5dec9] bg-[#fffaf0] px-4 pt-4 pb-5 sm:px-5">
          {/* Active Season Progress Card */}
          <div className="rounded-2xl border border-[#e5dec9] bg-white p-3.5 shadow-xs">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-sekkha-ink">
                Vassa Season 2026
              </span>
              <span className="font-bold text-[#9a6b0d] tabular-nums">
                {seasonProgress}% of {SEASON_GOAL} pts
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#FAF0DF]">
              <motion.div
                className="h-full rounded-full bg-[#c28e20]"
                style={{ width: `${seasonProgress}%` }}
                layout
                transition={{
                  type: "spring",
                  stiffness: 90,
                  damping: 16,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-sekkha-slate">
              Zero-reset seasonal ranking · Daily cap {DAILY_CAP_PTS} pts/day
            </p>
          </div>

          {/* Interactive Attendance & Seva Simulator */}
          <div className="space-y-2">
            <div className="px-0.5">
              <p className="flex items-center gap-1.5 text-xs font-bold tracking-tight text-sekkha-ink">
                <CalendarCheck2Icon className="size-3.5 text-clay-teal" />
                <span>Home Preview · Tap to Check In</span>
              </p>
            </div>

            <div className="space-y-2">
              {activities.map((activity) => (
                <motion.button
                  key={activity.id}
                  type="button"
                  onClick={() => toggleActivity(activity.id)}
                  aria-pressed={activity.done}
                  className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    activity.done
                      ? "border-clay-mint bg-clay-mint/25 text-sekkha-ink"
                      : "border-[#e5dec9] bg-white text-sekkha-body hover:bg-[#FAF0DF]/50"
                  }`}
                  whileHover={{ scale: 1.008 }}
                  whileTap={{ scale: 0.988 }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CheckCircle2Icon
                      className={`size-4.5 shrink-0 ${
                        activity.done
                          ? "text-clay-teal"
                          : "text-sekkha-slate/45"
                      }`}
                    />
                    <div className="min-w-0">
                      <span
                        className={`block truncate text-[13px] font-semibold ${
                          activity.done ? "line-through opacity-75" : ""
                        }`}
                      >
                        {activity.title}
                      </span>
                      <span className="block text-[11px] text-sekkha-slate">
                        {activity.kind}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      activity.done
                        ? "bg-clay-teal text-white"
                        : "bg-[#FAF0DF] text-[#9a6b0d]"
                    }`}
                  >
                    {!activity.done && <Bolt className="size-3" />}
                    {activity.done ? "Recorded" : `+${activity.reward} pts`}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
