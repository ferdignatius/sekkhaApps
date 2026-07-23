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
  is_active?: boolean
}

export const DEFAULT_TIME_PRESETS: EventTimePresetItem[] = [
  { id: "etp-1", label: "08:00 WIB (Puja Pagi)", time: "08:00", is_active: true },
  { id: "etp-2", label: "14:00 WIB (Kebaktian Siang)", time: "14:00", is_active: true },
  { id: "etp-3", label: "18:30 WIB (Puja Malam)", time: "18:30", is_active: true },
  { id: "etp-4", label: "19:00 WIB (Diskusi Dhamma)", time: "19:00", is_active: true },
]

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
