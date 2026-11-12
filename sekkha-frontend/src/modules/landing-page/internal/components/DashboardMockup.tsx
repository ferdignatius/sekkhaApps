import { useState } from "react"
import { motion } from "motion/react"
import {
  FlameIcon,
  CheckCircle2Icon,
  TrophyIcon,
  CalendarIcon,
  QrCodeIcon,
  QuoteIcon,
  SparklesIcon,
} from "lucide-react"

interface SimulationItem {
  id: number
  title: string
  kind: string
  reward: number
  done: boolean
}

const DAILY_CAP_PTS = 150

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

const MOCK_TOP_THREE = [
  { name: "@sari_dewi", points: 980, rank: 1, badge: "🥇" },
  { name: "@budi_santoso", points: 870, rank: 2, badge: "🥈" },
  { name: "@mei_ling", points: 820, rank: 3, badge: "🥉" },
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

  const seasonGoal = 300
  const seasonProgress = Math.min(
    100,
    Math.round((seasonPoints / seasonGoal) * 100)
  )

  return (
    <div className="relative mx-auto w-full select-none">
      {/* Outer Workspace Preview Card */}
      <motion.div
        className="relative z-10 w-full rounded-[24px] border border-sekkha-hairline bg-white p-4 shadow-xs md:p-6"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: "easeOut", delay: 0.2 }}
      >
        {/* Mockup Header Bar */}
        <div className="mb-5 flex items-center justify-between border-b border-sekkha-hairline pb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-clay-pink" />
            <span className="h-3 w-3 rounded-full bg-clay-ochre" />
            <span className="h-3 w-3 rounded-full bg-clay-success" />
            <span className="text-caption-uppercase ml-2 hidden font-semibold tracking-wider text-sekkha-slate sm:inline">
              Sekkha Workspace • Vihara Tri Maha Dharma
            </span>
          </div>
          <span className="text-micro inline-flex items-center gap-1.5 rounded-full border border-clay-mint/60 bg-clay-mint/30 px-2.5 py-0.5 font-medium text-clay-teal">
            ● Interactive Preview
          </span>
        </div>

        {/* Main Workspace Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left Column: Digital Member Card + Interactive Check-In */}
          <div className="space-y-6 md:col-span-2">
            {/* Digital Member Quick Card & Season Progress */}
            <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-body-sm-medium flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay-ochre font-bold text-sekkha-ink">
                    SM
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-sm-medium truncate font-semibold text-sekkha-ink">
                        Sekkha Member
                      </p>
                      <span className="text-micro rounded-full border border-sekkha-hairline bg-white px-2.5 py-0.5 font-semibold text-sekkha-ink tabular-nums">
                        ID 2026111201
                      </span>
                    </div>
                    <p className="text-micro text-sekkha-slate">
                      Good morning • Digital Member Card Ready
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-xl border border-sekkha-hairline bg-white px-3 py-2 text-xs font-semibold text-sekkha-ink">
                  <QrCodeIcon className="size-4 text-clay-teal" />
                  <span>Show QR ID</span>
                </div>
              </div>

              {/* Active Season Progress Bar */}
              <div className="mt-4">
                <div className="text-micro mb-1.5 flex items-center justify-between">
                  <span className="font-medium text-sekkha-slate">
                    Vassa Season 2026
                  </span>
                  <span className="font-semibold text-sekkha-ink tabular-nums">
                    {seasonPoints} pts
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-sekkha-hairline bg-white">
                  <motion.div
                    className="h-full rounded-full bg-clay-ochre"
                    style={{ width: `${seasonProgress}%` }}
                    layout
                    transition={{
                      type: "spring",
                      stiffness: 90,
                      damping: 16,
                    }}
                  />
                </div>
                <p className="text-micro mt-1.5 text-sekkha-slate">
                  Zero-reset seasonal ranking • Daily cap {DAILY_CAP_PTS} pts/day
                </p>
              </div>

              {/* Quick Stats Row */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-sekkha-hairline bg-white px-3 py-2.5">
                  <FlameIcon className="size-5 shrink-0 fill-clay-ochre text-clay-ochre" />
                  <div>
                    <span className="text-body-sm-medium block font-bold text-sekkha-ink">
                      5 Weeks
                    </span>
                    <span className="text-micro text-sekkha-slate">
                      Weekly Streak
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-sekkha-hairline bg-white px-3 py-2.5">
                  <SparklesIcon className="size-5 shrink-0 text-clay-teal" />
                  <div>
                    <span className="text-body-sm-medium block font-bold text-sekkha-ink">
                      Vassa 2026
                    </span>
                    <span className="text-micro text-sekkha-slate">
                      Active Season
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Attendance & Seva Simulator */}
            <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-4 text-clay-teal" />
                  <h4 className="text-body-sm-medium font-semibold text-sekkha-ink">
                    Attendance &amp; Seva Simulation (Click to Preview)
                  </h4>
                </div>
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
                        : "border-sekkha-hairline bg-white text-sekkha-body hover:bg-sekkha-surface"
                    }`}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
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
                          className={`text-body-sm block truncate font-medium ${
                            activity.done ? "line-through opacity-75" : ""
                          }`}
                        >
                          {activity.title}
                        </span>
                        <span className="text-micro block text-sekkha-slate">
                          {activity.kind}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-micro shrink-0 rounded-full px-2.5 py-0.5 font-bold ${
                        activity.done
                          ? "bg-clay-teal text-white"
                          : "bg-clay-ochre/25 text-sekkha-ink"
                      }`}
                    >
                      {activity.done ? "Recorded" : `+${activity.reward} pts`}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Season Top 3 & Daily Dhamma Wisdom */}
          <div className="space-y-6">
            {/* Top 3 Season Leaderboard */}
            <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrophyIcon className="size-4 text-clay-ochre" />
                <h4 className="text-body-sm-medium font-semibold text-sekkha-ink">
                  Season Top 3
                </h4>
              </div>

              <div className="space-y-2">
                {MOCK_TOP_THREE.map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between rounded-xl border border-sekkha-hairline bg-white px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="text-body-sm font-bold text-sekkha-slate">
                        {item.badge}
                      </span>
                      <span className="text-body-sm truncate font-medium text-sekkha-ink">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-body-sm font-semibold whitespace-nowrap text-sekkha-slate tabular-nums">
                      {item.points} pts
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-micro mt-2.5 text-sekkha-slate">
                Usernames displayed to protect member privacy.
              </p>
            </div>

            {/* Daily Dhamma Wisdom Panel */}
            <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-surface p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <QuoteIcon className="size-4 text-clay-pink" />
                <h4 className="text-body-sm-medium font-semibold text-sekkha-ink">
                  Daily Dhamma Wisdom
                </h4>
              </div>
              <blockquote className="text-body-sm leading-relaxed text-sekkha-body">
                &ldquo;Just as a candle cannot burn without fire, a community
                grows brightly through shared mindfulness and service.&rdquo;
              </blockquote>
              <p className="text-micro mt-3 font-medium text-sekkha-slate">
                Vihara Tri Maha Dharma
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Whiteboard Sticky Notes (Clean & Domain-Aligned) */}
      <motion.div
        className="absolute -top-5 -left-2 z-20 hidden h-28 w-32 flex-col justify-between rounded-md bg-clay-ochre p-3 font-sans text-sekkha-ink shadow-md sm:flex md:-left-8"
        style={{ rotate: "-3deg" }}
        initial={{ opacity: 0, x: -24, rotate: -10 }}
        animate={{ opacity: 1, x: 0, rotate: -3 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <p className="text-micro leading-snug font-semibold">
          Show your Digital Member QR Card at the Sunday desk!
        </p>
        <span className="text-right text-[10px] font-medium text-sekkha-body">
          #QuickCheckIn
        </span>
      </motion.div>

      <motion.div
        className="absolute -right-2 -bottom-5 z-20 hidden h-28 w-32 flex-col justify-between rounded-md bg-clay-mint p-3 font-sans text-sekkha-ink shadow-md sm:flex md:-right-8"
        style={{ rotate: "4deg" }}
        initial={{ opacity: 0, x: 24, rotate: 10 }}
        animate={{ opacity: 1, x: 0, rotate: 4 }}
        transition={{ duration: 0.7, delay: 0.5 }}
      >
        <p className="text-micro leading-snug font-semibold">
          Sunday Youth Fellowship starts at 09:00 WIB 🙏
        </p>
        <span className="text-right text-[10px] font-medium text-clay-teal">
          #WeeklyStreak
        </span>
      </motion.div>
    </div>
  )
}
