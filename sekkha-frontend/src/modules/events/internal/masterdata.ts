// feature/events/masterdata.ts
// Dynamic Master Data Provider & Storage for Events module.
// Eliminates hardcoded categories, badges, and time presets.

import type { AttendanceBadge } from "./types"

// ─── 1. Kategori Event Master Data ────────────────────────────────────────────

export type UserRoleName =
  | "admin"
  | "organizer"
  | "activist"
  | "member"
  | "pengurus"
  | "aktivis"
  | "umat"

export const ALL_USER_ROLES: {
  id: UserRoleName
  label: string
  bg: string
  text: string
}[] = [
  { id: "admin", label: "Admin", bg: "bg-purple-100", text: "text-purple-800" },
  {
    id: "organizer",
    label: "Organizer",
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
  {
    id: "activist",
    label: "Activist",
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  {
    id: "member",
    label: "Member",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
  },
]

export interface ColorSchemeOption {
  id: string
  label: string
  bg: string
  text: string
  dot: string
}

export const CATEGORY_COLOR_SCHEMES: ColorSchemeOption[] = [
  {
    id: "sky",
    label: "Sky Blue",
    bg: "bg-sky-100/90",
    text: "text-sky-800",
    dot: "bg-sky-500",
  },
  {
    id: "amber",
    label: "Amber Gold",
    bg: "bg-amber-100/90",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  {
    id: "purple",
    label: "Purple",
    bg: "bg-purple-100/90",
    text: "text-purple-800",
    dot: "bg-purple-500",
  },
  {
    id: "emerald",
    label: "Emerald Green",
    bg: "bg-emerald-100/90",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  {
    id: "rose",
    label: "Rose Red",
    bg: "bg-rose-100/90",
    text: "text-rose-800",
    dot: "bg-rose-500",
  },
  {
    id: "indigo",
    label: "Indigo",
    bg: "bg-indigo-100/90",
    text: "text-indigo-800",
    dot: "bg-indigo-500",
  },
  {
    id: "teal",
    label: "Teal",
    bg: "bg-teal-100/90",
    text: "text-teal-800",
    dot: "bg-teal-500",
  },
  {
    id: "slate",
    label: "Slate Gray",
    bg: "bg-slate-100/90",
    text: "text-slate-800",
    dot: "bg-slate-500",
  },
]

export interface EventCategoryItem {
  id: string
  tag: string
  name: string
  bg: string
  text: string
  dot: string
  points: number
  is_active?: boolean
  autofillTitle?: string
  autofillLocation?: string
  autofillDesc?: string
  colorHex?: string
  target_roles?: string[] // Many-to-many allowed user roles (e.g. ["admin", "pengurus", "aktivis", "umat"])
}

export const DEFAULT_CATEGORIES: EventCategoryItem[] = [
  {
    id: "cat-1",
    tag: "rutin",
    name: "Routine",
    bg: "bg-sky-100/90",
    text: "text-sky-800",
    dot: "bg-sky-500",
    points: 50,
    is_active: true,
    colorHex: "#0284c7",
    autofillTitle: "Routine Sunday Service",
    autofillLocation: "Main Dhammasala Vihara Sekkha",
    autofillDesc: "Routine service session with Vihara Sekkha community.",
    target_roles: ["admin", "pengurus", "aktivis", "umat"],
  },
  {
    id: "cat-2",
    tag: "special",
    name: "Special",
    bg: "bg-amber-100/90",
    text: "text-amber-800",
    dot: "bg-amber-500",
    points: 100,
    is_active: true,
    colorHex: "#d97706",
    autofillTitle: "Special Festival Service",
    autofillLocation: "Vihara Sekkha",
    autofillDesc: "Major holiday celebration and special puja.",
    target_roles: ["admin", "pengurus", "aktivis", "umat"],
  },
  {
    id: "cat-3",
    tag: "retreat",
    name: "Retreat",
    bg: "bg-purple-100/90",
    text: "text-purple-800",
    dot: "bg-purple-500",
    points: 150,
    is_active: true,
    colorHex: "#9333ea",
    autofillTitle: "Spiritual Character Retreat",
    autofillLocation: "Vihara Meditation Pavilion",
    autofillDesc: "Intensive retreat and spiritual cultivation.",
    target_roles: ["admin", "pengurus", "aktivis", "umat"],
  },
  {
    id: "cat-4",
    tag: "meditasi",
    name: "Meditation",
    bg: "bg-emerald-100/90",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    points: 60,
    is_active: true,
    colorHex: "#059669",
    autofillTitle: "Group Meditation Session",
    autofillLocation: "Meditation Hall",
    autofillDesc: "Bhavana practice and mindfulness training.",
    target_roles: ["admin", "pengurus", "aktivis", "umat"],
  },
  {
    id: "cat-5",
    tag: "sosial",
    name: "Social",
    bg: "bg-rose-100/90",
    text: "text-rose-800",
    dot: "bg-rose-500",
    points: 40,
    is_active: true,
    colorHex: "#e11d48",
    autofillTitle: "Community Social Service",
    autofillLocation: "Vihara Sekkha",
    autofillDesc: "Charity drives and community outreach.",
    target_roles: ["admin", "pengurus", "aktivis", "umat"],
  },
  {
    id: "cat-6",
    tag: "basic",
    name: "General",
    bg: "bg-blue-100/90",
    text: "text-blue-800",
    dot: "bg-blue-500",
    points: 30,
    is_active: true,
    colorHex: "#4f46e5",
    autofillTitle: "General Vihara Activity",
    autofillLocation: "Vihara Sekkha",
    autofillDesc: "General community event.",
    target_roles: ["admin", "pengurus", "aktivis", "umat"],
  },
]

// ─── 2. Badge Presensi Master Data ───────────────────────────────────────────

export const DEFAULT_BADGES: AttendanceBadge[] = [
  {
    id: "puja",
    name: "Puja Officer",
    points: 20,
    color: "bg-blue-50/90 text-blue-700 border-blue-200/80",
    is_active: true,
  },
  {
    id: "paritta",
    name: "Paritta Chanter",
    points: 30,
    color: "bg-amber-50/90 text-amber-800 border-amber-200/80",
    is_active: true,
  },
  {
    id: "panitia",
    name: "Committee / Volunteer",
    points: 50,
    color: "bg-purple-50/90 text-purple-800 border-purple-200/80",
    is_active: true,
  },
  {
    id: "pemusik",
    name: "Musician / Audio",
    points: 40,
    color: "bg-rose-50/90 text-rose-800 border-rose-200/80",
    is_active: true,
  },
  {
    id: "kebersihan",
    name: "Cleanliness Team",
    points: 25,
    color: "bg-emerald-50/90 text-emerald-800 border-emerald-200/80",
    is_active: true,
  },
]

// Local Storage Helper for Master Data persistence
const STORAGE_KEYS = {
  CATEGORIES: "sekkha_master_categories",
  BADGES: "sekkha_master_badges",
}

export function getMasterCategories(activeOnly = false): EventCategoryItem[] {
  let res = DEFAULT_CATEGORIES
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (raw) res = JSON.parse(raw)
  } catch {}
  if (activeOnly) return res.filter((c) => c.is_active !== false)
  return res
}

export function getAccessibleCategories(
  userRole?: string | null,
  activeOnly = true
): EventCategoryItem[] {
  const cats = getMasterCategories(activeOnly)
  const role = (userRole || "member").toLowerCase()
  const normalizedRole =
    role === "umat"
      ? "member"
      : role === "aktivis"
        ? "activist"
        : role === "pengurus"
          ? "organizer"
          : role
  return cats.filter((c) => {
    if (!c.target_roles || c.target_roles.length === 0) return true
    return c.target_roles.some((r) => {
      const nr = r.toLowerCase()
      const normalizedTarget =
        nr === "umat"
          ? "member"
          : nr === "aktivis"
            ? "activist"
            : nr === "pengurus"
              ? "organizer"
              : nr
      return normalizedTarget === normalizedRole
    })
  })
}

export function getCategoryByTag(
  tagOrName?: string | null
): EventCategoryItem | undefined {
  if (!tagOrName) return undefined
  const cats = getMasterCategories(false)
  const lower = tagOrName.toLowerCase().trim()
  return cats.find(
    (c) =>
      c.tag.toLowerCase() === lower ||
      c.name.toLowerCase() === lower ||
      c.id.toLowerCase() === lower
  )
}

export function getCategoryColor(tagOrName?: string | null): {
  hex: string
  bgStyle: React.CSSProperties
  dotStyle: React.CSSProperties
  name: string
} {
  const item = getCategoryByTag(tagOrName)
  const hex = item?.colorHex || "#0284c7"
  return {
    hex,
    bgStyle: {
      backgroundColor: `${hex}1a`,
      color: hex,
      borderColor: `${hex}40`,
    },
    dotStyle: {
      backgroundColor: hex,
    },
    name: item?.name ?? tagOrName ?? "Rutin",
  }
}

export function getMasterBadges(activeOnly = false): AttendanceBadge[] {
  let res = DEFAULT_BADGES
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BADGES)
    if (raw) res = JSON.parse(raw)
  } catch {}
  if (activeOnly) return res.filter((b) => b.is_active !== false)
  return res
}
