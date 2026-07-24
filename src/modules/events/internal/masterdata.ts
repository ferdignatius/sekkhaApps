// feature/events/masterdata.ts
// Dynamic Master Data Provider & Storage for Events module.
// Eliminates hardcoded categories, badges, and time presets.

import type { AttendanceBadge } from "./types"

// ─── 1. Kategori Event Master Data ────────────────────────────────────────────

export interface EventCategoryItem {
  id: string
  tag: string
  name: string
  bg: string
  text: string
  dot: string
  points: number
  is_active?: boolean
  autofillTime?: string  // "HH:mm" — preset jam default ketika kategori dipilih
}

export const DEFAULT_CATEGORIES: EventCategoryItem[] = [
  { id: "cat-1", tag: "rutin", name: "Rutin", bg: "bg-sky-100/90", text: "text-sky-800", dot: "bg-sky-500", points: 50, is_active: true, autofillTime: "08:00" },
  { id: "cat-2", tag: "special", name: "Special", bg: "bg-amber-100/90", text: "text-amber-800", dot: "bg-amber-500", points: 100, is_active: true, autofillTime: "18:30" },
  { id: "cat-3", tag: "retreat", name: "Retreat", bg: "bg-purple-100/90", text: "text-purple-800", dot: "bg-purple-500", points: 150, is_active: true, autofillTime: "08:00" },
  { id: "cat-4", tag: "meditasi", name: "Meditasi", bg: "bg-emerald-100/90", text: "text-emerald-800", dot: "bg-emerald-500", points: 60, is_active: true, autofillTime: "19:00" },
  { id: "cat-5", tag: "sosial", name: "Sosial", bg: "bg-rose-100/90", text: "text-rose-800", dot: "bg-rose-500", points: 40, is_active: true, autofillTime: "14:00" },
  { id: "cat-6", tag: "basic", name: "Basic", bg: "bg-blue-100/90", text: "text-blue-800", dot: "bg-blue-500", points: 30, is_active: true, autofillTime: "08:00" },
]

// ─── 2. Badge Presensi Master Data ───────────────────────────────────────────

export const DEFAULT_BADGES: AttendanceBadge[] = [
  { id: "puja", name: "Petugas Puja", points: 20, color: "bg-blue-50/90 text-blue-700 border-blue-200/80", is_active: true },
  { id: "paritta", name: "Pembaca Paritta", points: 30, color: "bg-amber-50/90 text-amber-800 border-amber-200/80", is_active: true },
  { id: "panitia", name: "Panitia / Relawan", points: 50, color: "bg-purple-50/90 text-purple-800 border-purple-200/80", is_active: true },
  { id: "pemusik", name: "Pemusik / Speaker", points: 40, color: "bg-rose-50/90 text-rose-800 border-rose-200/80", is_active: true },
  { id: "kebersihan", name: "Tim Kebersihan", points: 25, color: "bg-emerald-50/90 text-emerald-800 border-emerald-200/80", is_active: true },
]

// ─── 3. Preset Jam Vihara Master Data ───────────────────────────────────────

export interface EventTimePresetItem {
  id: string
  label: string
  time: string
  day_of_week?: number // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu, -1/undefined = Bebas/Semua Hari
  description?: string
  is_active?: boolean
}

export const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const

export const DEFAULT_TIME_PRESETS: EventTimePresetItem[] = [
  { id: "etp-1", label: "08:00 WIB (Puja Pagi)", time: "08:00", day_of_week: -1, description: "Jadwal Puja Bakti Pagi Umat & Pemuda", is_active: true },
  { id: "etp-2", label: "14:00 WIB (Kebaktian Siang)", time: "14:00", day_of_week: 0, description: "Kebaktian Umum & Sekolah Minggu (Hari Minggu)", is_active: true },
  { id: "etp-3", label: "18:30 WIB (Puja Malam)", time: "18:30", day_of_week: -1, description: "Puja Bakti Malam & Meditasi", is_active: true },
  { id: "etp-4", label: "19:00 WIB (Diskusi Dhamma)", time: "19:00", day_of_week: 4, description: "Sesi Dhammasakaccha & Kelas Dhamma (Hari Kamis)", is_active: true },
]

/**
 * Calculates the next target date string ("YYYY-MM-DD") for a given day_of_week (0=Minggu..6=Sabtu).
 * If day_of_week is -1 or undefined, returns the date part of fromDate.
 * If today IS the target day:
 *  - If targetTime has NOT passed yet -> returns today.
 *  - If targetTime HAS passed -> returns target day next week (+7 days).
 */
export function getNextDateForDayOfWeek(
  dayOfWeek?: number,
  targetTimeStr: string = "08:00",
  fromDate: Date = new Date()
): string {
  const y = fromDate.getFullYear()
  const m = String(fromDate.getMonth() + 1).padStart(2, "0")
  const d = String(fromDate.getDate()).padStart(2, "0")

  if (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek < 0) {
    return `${y}-${m}-${d}`
  }

  const currentDay = fromDate.getDay()
  let daysUntil = (dayOfWeek - currentDay + 7) % 7

  if (daysUntil === 0) {
    const [h, min] = targetTimeStr.split(":").map(Number)
    const targetTimeToday = new Date(fromDate)
    targetTimeToday.setHours(h ?? 0, min ?? 0, 0, 0)

    if (fromDate.getTime() >= targetTimeToday.getTime()) {
      daysUntil = 7
    }
  }

  const targetDate = new Date(fromDate)
  targetDate.setDate(fromDate.getDate() + daysUntil)
  const ty = targetDate.getFullYear()
  const tm = String(targetDate.getMonth() + 1).padStart(2, "0")
  const td = String(targetDate.getDate()).padStart(2, "0")
  return `${ty}-${tm}-${td}`
}

// Local Storage Helper for Master Data persistence
const STORAGE_KEYS = {
  CATEGORIES: "sekkha_master_categories",
  BADGES: "sekkha_master_badges",
  TIMES: "sekkha_master_times",
}

export function getMasterCategories(activeOnly = false): EventCategoryItem[] {
  let res = DEFAULT_CATEGORIES
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (raw) res = JSON.parse(raw)
  } catch {}
  if (activeOnly) return res.filter(c => c.is_active !== false)
  return res
}

export function getMasterBadges(activeOnly = false): AttendanceBadge[] {
  let res = DEFAULT_BADGES
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BADGES)
    if (raw) res = JSON.parse(raw)
  } catch {}
  if (activeOnly) return res.filter(b => b.is_active !== false)
  return res
}

export function getMasterTimePresets(activeOnly = false): EventTimePresetItem[] {
  let res = DEFAULT_TIME_PRESETS
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMES)
    if (raw) res = JSON.parse(raw)
  } catch {}
  if (activeOnly) return res.filter(t => t.is_active !== false)
  return res
}

export function saveMasterTimePresets(items: EventTimePresetItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMES, JSON.stringify(items))
  } catch {}
}
