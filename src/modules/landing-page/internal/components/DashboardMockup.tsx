import { useState } from 'react'
import { motion } from 'motion/react'
import {
  StarIcon,
  FlameIcon,
  CheckCircle2Icon,
  TrophyIcon,
  ShieldCheckIcon,
  CalendarIcon,
  UsersIcon
} from 'lucide-react'

// Dummy Data
const MOCK_MISSIONS = [
  { id: 1, title: 'Hadir Kebaktian Minggu', reward: 50, done: true },
  { id: 2, title: 'Bakti Sosial Panti Asuhan', reward: 100, done: false },
  { id: 3, title: 'Sesi Meditasi Bersama', reward: 30, done: false },
]

const MOCK_LEADERBOARD = [
  { name: 'Sari Dewi', points: 980, rank: 1, badge: '🥇' },
  { name: 'Budi Santoso', points: 870, rank: 2, badge: '🥈' },
  { name: 'Mei Ling', points: 820, rank: 3, badge: '🥉' },
]

export function DashboardMockup() {
  const [missions, setMissions] = useState(MOCK_MISSIONS)
  const [userPoints, setUserPoints] = useState(1240)

  const toggleMission = (id: number) => {
    setMissions(prev =>
      prev.map(m => {
        if (m.id === id) {
          const nextDone = !m.done
          setUserPoints(pts => (nextDone ? pts + m.reward : pts - m.reward))
          return { ...m, done: nextDone }
        }
        return m
      })
    )
  }

  const levelProgress = Math.round((userPoints / 1500) * 100)

  return (
    <div className="relative w-full max-w-[960px] mx-auto mt-16 px-2 select-none">
      
      {/* ── Outer Whiteboard Frame ── */}
      <motion.div
        className="w-full bg-sekkha-canvas rounded-2xl border border-sekkha-hairline-soft p-4 md:p-6 shadow-xl relative z-10"
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: 'easeOut', delay: 0.4 }}
      >
        {/* Mockup Header Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-sekkha-hairline-soft">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="text-micro-uppercase font-semibold text-sekkha-slate ml-2 tracking-wider hidden sm:inline">
              Workspace Remaja Vihara Tri Maha Dharma
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sekkha-teal-light px-2.5 py-0.5 text-micro font-medium text-sekkha-ink">
              ● Live Preview
            </span>
          </div>
        </div>

        {/* Mockup Main Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Progress & Misi (Span 2) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* User Level Info Card */}
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-4">
              <div className="flex items-center gap-3">
                {/* Avatar mockup */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow text-body-sm-medium font-bold text-sekkha-ink ring-2 ring-white">
                  AS
                </div>
                {/* Level details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-body-sm-medium text-sekkha-ink font-semibold">Admin Sekkha</p>
                    <span className="rounded-full bg-sekkha-brand-yellow/20 px-2 py-0.5 text-micro font-bold text-sekkha-yellow-dark">
                      Lv.3
                    </span>
                  </div>
                  <p className="text-micro text-sekkha-slate">Umat Setia</p>
                </div>
              </div>

              {/* Progress Level Bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center text-micro mb-1">
                  <span className="text-sekkha-slate">Progress Level</span>
                  <span className="font-semibold text-sekkha-ink">{userPoints} / 1500 XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-white border border-sekkha-hairline-soft">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-sekkha-brand-yellow to-sekkha-brand-yellow-deep"
                      style={{ width: `${levelProgress}%` }}
                      layout
                      transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                    />
                  </div>
                  {/* Rotating Star Icon */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  >
                    <StarIcon className="size-5 text-sekkha-brand-yellow fill-sekkha-brand-yellow" />
                  </motion.div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-3.5 rounded-lg bg-orange-50 px-3 py-2">
                  <FlameIcon className="size-6 text-orange-500 fill-orange-55" />
                  <div>
                    <span className="block text-body-sm-medium font-bold text-orange-600">5 Minggu</span>
                    <span className="text-micro text-sekkha-slate">Streak Keaktifan 🔥</span>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 rounded-lg bg-blue-50 px-3 py-2">
                  <ShieldCheckIcon className="size-6 text-sekkha-brand-blue" />
                  <div>
                    <span className="block text-body-sm-medium font-bold text-sekkha-brand-blue">Aktif</span>
                    <span className="text-micro text-sekkha-slate">Streak Shield Aktif 🛡️</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Missions Card */}
            <div className="rounded-xl border border-sekkha-hairline bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="size-4 text-sekkha-brand-blue" />
                <h4 className="text-body-sm-medium font-semibold text-sekkha-ink">Misi Minggu Ini (Ketuk untuk Simulasi)</h4>
              </div>

              <div className="space-y-2">
                {missions.map(mission => (
                  <motion.button
                    key={mission.id}
                    onClick={() => toggleMission(mission.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left border transition-all ${
                      mission.done
                        ? 'bg-sekkha-teal-light border-sekkha-brand-teal/20 text-sekkha-ink'
                        : 'bg-sekkha-surface border-sekkha-hairline-soft text-sekkha-slate hover:bg-white'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2Icon
                        className={`size-4.5 shrink-0 ${
                          mission.done ? 'text-sekkha-brand-blue fill-white' : 'text-sekkha-slate/40'
                        }`}
                      />
                      <span className={`text-body-sm truncate ${mission.done ? 'line-through opacity-70' : ''}`}>
                        {mission.title}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-micro font-bold shrink-0 ${
                        mission.done
                          ? 'bg-sekkha-brand-blue text-white'
                          : 'bg-sekkha-surface-yellow text-sekkha-yellow-dark'
                      }`}
                    >
                      {mission.done ? 'Selesai' : `+${mission.reward} XP`}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Leaderboard Preview & Badges (Span 1) */}
          <div className="space-y-6">
            
            {/* Leaderboard Panel */}
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrophyIcon className="size-4 text-sekkha-brand-yellow" />
                <h4 className="text-body-sm-medium font-semibold text-sekkha-ink font-roobert">Top 3 Remaja Aktif</h4>
              </div>

              <div className="space-y-2">
                {MOCK_LEADERBOARD.map(item => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-sekkha-hairline-soft"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-body-sm font-bold text-sekkha-slate">{item.badge}</span>
                      <span className="text-body-sm truncate text-sekkha-ink">{item.name}</span>
                    </div>
                    <span className="text-body-sm font-semibold text-sekkha-slate whitespace-nowrap">{item.points} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges Collection Panel */}
            <div className="rounded-xl border border-sekkha-hairline bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <UsersIcon className="size-4 text-sekkha-brand-teal" />
                <h4 className="text-body-sm-medium font-semibold text-sekkha-ink">Koleksi Lencana</h4>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: '🧘', name: 'Meditation Master', active: true },
                  { icon: '🤝', name: 'Social Hero', active: true },
                  { icon: '📜', name: 'Dhamma Scholar', active: true },
                  { icon: '💎', name: 'Vihara Guardian', active: false },
                ].map((b, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center aspect-square rounded-lg border transition-all ${
                      b.active
                        ? 'bg-sekkha-rose-light border-sekkha-brand-red/35 hover:scale-105'
                        : 'bg-sekkha-surface border-sekkha-hairline-soft opacity-40'
                    }`}
                    title={`${b.name} (${b.active ? 'Earned' : 'Locked'})`}
                  >
                    <span className="text-xl mb-0.5">{b.icon}</span>
                  </div>
                ))}
              </div>
              <p className="text-micro text-sekkha-slate mt-2.5 text-center">
                Dapatkan lencana dengan mengikuti kegiatan remaja vihara!
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Floating Miro-style Whiteboard Sticky Notes ── */}
      
      {/* Sticky Note 1: Yellow (Top Left) */}
      <motion.div
        className="absolute -top-10 -left-6 md:-left-12 z-20 bg-sekkha-brand-yellow text-sekkha-ink font-sans p-3 shadow-md w-36 h-36 flex flex-col justify-between rounded-sm cursor-grab active:cursor-grabbing"
        style={{ rotate: '-4deg' }}
        initial={{ opacity: 0, x: -32, rotate: -15 }}
        animate={{ opacity: 1, x: 0, rotate: -4 }}
        transition={{ duration: 0.9, delay: 0.6 }}
        whileHover={{ scale: 1.05, rotate: '-2deg', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
      >
        <p className="text-caption font-semibold leading-snug">
          Jangan lupa bawa botol minum sendiri untuk baksos! 🌍💚
        </p>
        <span className="text-[10px] text-sekkha-slate text-right font-medium">
          #GoGreen
        </span>
      </motion.div>

      {/* Sticky Note 2: Teal (Bottom Right) */}
      <motion.div
        className="absolute -bottom-8 -right-6 md:-right-10 z-20 bg-sekkha-teal-light text-sekkha-ink font-sans p-3 shadow-md w-36 h-36 flex flex-col justify-between rounded-sm cursor-grab active:cursor-grabbing"
        style={{ rotate: '5deg' }}
        initial={{ opacity: 0, x: 32, rotate: 15 }}
        animate={{ opacity: 1, x: 0, rotate: 5 }}
        transition={{ duration: 0.9, delay: 0.8 }}
        whileHover={{ scale: 1.05, rotate: '3deg', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
      >
        <p className="text-caption font-semibold leading-snug">
          Jadwal Meditasi bersama Bhante sabtu ini dimundurkan 🧘‍♂️✨
        </p>
        <span className="text-[10px] text-sekkha-slate text-right font-medium">
          #InfoRemaja
        </span>
      </motion.div>

      {/* Sticky Note 3: Rose (Top Right, Behind) */}
      <motion.div
        className="absolute -top-12 -right-4 z-0 bg-sekkha-rose-light text-sekkha-ink font-sans p-3 shadow-sm w-32 h-32 flex flex-col justify-between rounded-sm opacity-60 hidden md:flex"
        style={{ rotate: '6deg' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.9 }}
      >
        <p className="text-micro font-semibold leading-snug">
          Materi Dhamma Kelas 10 sudah diupload! 📜
        </p>
        <span className="text-[9px] text-sekkha-slate text-right">
          #DhammaClass
        </span>
      </motion.div>

    </div>
  )
}
