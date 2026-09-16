import { useState } from "react"
import { motion } from "motion/react"
import {
  StarIcon,
  FlameIcon,
  CheckCircle2Icon,
  TrophyIcon,
  ShieldCheckIcon,
  CalendarIcon,
  UsersIcon,
} from "lucide-react"

// Dummy Data
const MOCK_MISSIONS = [
  { id: 1, title: "Attend Sunday Service", reward: 50, done: true },
  { id: 2, title: "Charity Outreach Drive", reward: 100, done: false },
  { id: 3, title: "Group Meditation Session", reward: 30, done: false },
]

const MOCK_LEADERBOARD = [
  { name: "Sari Dewi", points: 980, rank: 1, badge: "🥇" },
  { name: "Budi Santoso", points: 870, rank: 2, badge: "🥈" },
  { name: "Mei Ling", points: 820, rank: 3, badge: "🥉" },
]

export function DashboardMockup() {
  const [missions, setMissions] = useState(MOCK_MISSIONS)
  const [userPoints, setUserPoints] = useState(1240)

  const toggleMission = (id: number) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextDone = !m.done
          setUserPoints((pts) => (nextDone ? pts + m.reward : pts - m.reward))
          return { ...m, done: nextDone }
        }
        return m
      })
    )
  }

  const levelProgress = Math.round((userPoints / 1500) * 100)

  return (
    <div className="relative mx-auto mt-16 w-full px-2 select-none">
      {/* ── Outer Whiteboard Frame ── */}
      <motion.div
        className="relative z-10 w-full rounded-[24px] border border-sekkha-hairline bg-white/95 p-4 shadow-xs backdrop-blur-md md:p-6"
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: "easeOut", delay: 0.4 }}
      >
        {/* Mockup Header Bar */}
        <div className="mb-4 flex items-center justify-between border-b border-sekkha-hairline pb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff4d8b]" />
            <span className="h-3 w-3 rounded-full bg-[#e8b94a]" />
            <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
            <span className="text-caption-uppercase ml-2 hidden font-semibold tracking-wider text-sekkha-slate sm:inline">
              Youth Workspace • Vihara Tri Maha Dharma
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-micro inline-flex items-center gap-1.5 rounded-full border border-[#a4d4c5]/60 bg-[#a4d4c5]/40 px-2.5 py-0.5 font-medium text-[#1a3a3a]">
              ● Live Preview
            </span>
          </div>
        </div>

        {/* Mockup Main Workspace */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left Column: Progress & Quests (Span 2) */}
          <div className="space-y-6 md:col-span-2">
            {/* User Level Info Card */}
            <div className="rounded-xl border border-sekkha-hairline-soft bg-white/60 p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                {/* Avatar mockup */}
                <div className="text-body-sm-medium flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow font-bold text-sekkha-ink ring-2 ring-white">
                  AS
                </div>
                {/* Level details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-body-sm-medium truncate font-semibold text-sekkha-ink">
                      Sekkha Member
                    </p>
                    <span className="text-micro rounded-full bg-sekkha-brand-yellow/20 px-2 py-0.5 font-bold text-sekkha-ink">
                      Lv.3
                    </span>
                  </div>
                  <p className="text-micro text-sekkha-slate">
                    Dedicated Member
                  </p>
                </div>
              </div>

              {/* Progress Level Bar */}
              <div className="mt-4">
                <div className="text-micro mb-1 flex items-center justify-between">
                  <span className="text-sekkha-slate">Level Progress</span>
                  <span className="font-semibold text-sekkha-ink">
                    {userPoints} / 1500 XP
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 flex-1 overflow-hidden rounded-full border border-sekkha-hairline-soft bg-white">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-sekkha-brand-yellow to-amber-500"
                      style={{ width: `${levelProgress}%` }}
                      layout
                      transition={{
                        type: "spring",
                        stiffness: 80,
                        damping: 15,
                      }}
                    />
                  </div>
                  {/* Rotating Star Icon */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "linear",
                    }}
                  >
                    <StarIcon className="size-5 fill-sekkha-brand-yellow text-sekkha-brand-yellow" />
                  </motion.div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3.5 rounded-lg bg-orange-50/80 px-3 py-2">
                  <FlameIcon className="size-6 fill-orange-500 text-orange-500" />
                  <div>
                    <span className="text-body-sm-medium block font-bold text-orange-600">
                      5 Weeks
                    </span>
                    <span className="text-micro text-sekkha-slate">
                      Active Streak 🔥
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 rounded-lg bg-blue-50/80 px-3 py-2">
                  <ShieldCheckIcon className="size-6 text-sekkha-brand-blue" />
                  <div>
                    <span className="text-body-sm-medium block font-bold text-sekkha-brand-blue">
                      Active
                    </span>
                    <span className="text-micro text-sekkha-slate">
                      Streak Shield 🛡️
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Missions Card */}
            <div className="rounded-xl border border-sekkha-hairline bg-white/70 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2">
                <CalendarIcon className="size-4 text-sekkha-brand-blue" />
                <h4 className="text-body-sm-medium font-semibold text-sekkha-ink">
                  Weekly Quests (Click to Simulate)
                </h4>
              </div>

              <div className="space-y-2">
                {missions.map((mission) => (
                  <motion.button
                    key={mission.id}
                    type="button"
                    onClick={() => toggleMission(mission.id)}
                    aria-pressed={mission.done}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-all ${
                      mission.done
                        ? "border-sekkha-brand-teal/20 bg-sekkha-teal-light/70 text-sekkha-ink"
                        : "border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:bg-white"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <CheckCircle2Icon
                        className={`size-4.5 shrink-0 ${
                          mission.done
                            ? "fill-white text-sekkha-brand-blue"
                            : "text-sekkha-slate/40"
                        }`}
                      />
                      <span
                        className={`text-body-sm truncate ${mission.done ? "line-through opacity-70" : ""}`}
                      >
                        {mission.title}
                      </span>
                    </div>
                    <span
                      className={`text-micro shrink-0 rounded-full px-2 py-0.5 font-bold ${
                        mission.done
                          ? "bg-sekkha-brand-blue text-white"
                          : "bg-sekkha-brand-yellow/20 text-sekkha-ink"
                      }`}
                    >
                      {mission.done ? "Done" : `+${mission.reward} XP`}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Leaderboard Preview & Badges (Span 1) */}
          <div className="space-y-6">
            {/* Leaderboard Panel */}
            <div className="rounded-xl border border-sekkha-hairline-soft bg-white/60 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2">
                <TrophyIcon className="size-4 text-sekkha-brand-yellow" />
                <h4 className="text-body-sm-medium font-roobert font-semibold text-sekkha-ink">
                  Top 3 Active Members
                </h4>
              </div>

              <div className="space-y-2">
                {MOCK_LEADERBOARD.map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between rounded-lg border border-sekkha-hairline-soft bg-white/80 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="text-body-sm font-bold text-sekkha-slate">
                        {item.badge}
                      </span>
                      <span className="text-body-sm truncate text-sekkha-ink">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-body-sm font-semibold whitespace-nowrap text-sekkha-slate">
                      {item.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges Collection Panel */}
            <div className="rounded-xl border border-sekkha-hairline bg-white/70 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2">
                <UsersIcon className="text-sekkha-brand-teal size-4" />
                <h4 className="text-body-sm-medium font-semibold text-sekkha-ink">
                  Member Badge Collection
                </h4>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: "🧘", name: "Meditation Master", active: true },
                  { icon: "🤝", name: "Social Hero", active: true },
                  { icon: "📜", name: "Dhamma Scholar", active: true },
                  { icon: "💎", name: "Vihara Guardian", active: false },
                ].map((b, i) => (
                  <div
                    key={i}
                    className={`flex aspect-square flex-col items-center justify-center rounded-lg border transition-all ${
                      b.active
                        ? "border-sekkha-brand-red/35 bg-sekkha-rose-light hover:scale-105"
                        : "border-sekkha-hairline-soft bg-sekkha-surface opacity-40"
                    }`}
                    title={`${b.name} (${b.active ? "Earned" : "Locked"})`}
                  >
                    <span className="mb-0.5 text-xl">{b.icon}</span>
                  </div>
                ))}
              </div>
              <p className="text-micro mt-2.5 text-center text-sekkha-slate">
                Earn badges by participating in youth temple events!
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Floating Miro-style Whiteboard Sticky Notes ── */}

      {/* Sticky Note 1: Yellow (Top Left) */}
      <motion.div
        className="absolute -top-6 -left-3 z-20 flex h-28 w-28 cursor-grab flex-col justify-between rounded-sm bg-sekkha-brand-yellow p-3 font-sans text-sekkha-ink shadow-md active:cursor-grabbing sm:-top-10 sm:-left-6 sm:h-36 sm:w-36 md:-left-12"
        style={{ rotate: "-4deg" }}
        initial={{ opacity: 0, x: -32, rotate: -15 }}
        animate={{ opacity: 1, x: 0, rotate: -4 }}
        transition={{ duration: 0.9, delay: 0.6 }}
        whileHover={{
          scale: 1.05,
          rotate: "-2deg",
          boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
        }}
      >
        <p className="text-caption leading-snug font-semibold">
          Don't forget your reusable bottle for charity drive! 🌍💚
        </p>
        <span className="text-right text-[10px] font-medium text-sekkha-slate">
          #GoGreen
        </span>
      </motion.div>

      {/* Sticky Note 2: Teal (Bottom Right) */}
      <motion.div
        className="absolute -right-3 -bottom-6 z-20 flex h-28 w-28 cursor-grab flex-col justify-between rounded-sm bg-sekkha-teal-light p-3 font-sans text-sekkha-ink shadow-md active:cursor-grabbing sm:-right-6 sm:-bottom-8 sm:h-36 sm:w-36 md:-right-10"
        style={{ rotate: "5deg" }}
        initial={{ opacity: 0, x: 32, rotate: 15 }}
        animate={{ opacity: 1, x: 0, rotate: 5 }}
        transition={{ duration: 0.9, delay: 0.8 }}
        whileHover={{
          scale: 1.05,
          rotate: "3deg",
          boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
        }}
      >
        <p className="text-caption leading-snug font-semibold">
          Saturday Meditation with Bhante starts at 4 PM 🧘‍♂️✨
        </p>
        <span className="text-right text-[10px] font-medium text-sekkha-slate">
          #YouthNotice
        </span>
      </motion.div>

      {/* Sticky Note 3: Rose (Top Right, Behind) */}
      <motion.div
        className="absolute -top-12 -right-4 z-0 flex hidden h-32 w-32 flex-col justify-between rounded-sm bg-sekkha-rose-light p-3 font-sans text-sekkha-ink opacity-60 shadow-sm md:flex"
        style={{ rotate: "6deg" }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.9 }}
      >
        <p className="text-micro leading-snug font-semibold">
          Grade 10 Dhamma Study Guide is now online! 📜
        </p>
        <span className="text-right text-[9px] text-sekkha-slate">
          #DhammaStudy
        </span>
      </motion.div>
    </div>
  )
}
