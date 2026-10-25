// feature/events/masterdata.ts
// Dynamic Master Data Provider & Storage for Events module.
// Eliminates hardcoded categories, badges, and time presets.

import type { AttendanceBadge } from "./types"
import { api } from "@/lib/api"

// ─── 1. Kategori Event Master Data ────────────────────────────────────────────

export type UserRoleName = "admin" | "organizer" | "activist" | "member"

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
    id: "cmvmnorpy000k11joreumudbp",
    tag: "regular-puja",
    name: "Regular Puja",
    bg: "bg-[#4262FF]/10",
    text: "text-[#4262FF]",
    dot: "bg-[#4262FF]",
    points: 50,
    is_active: true,
    colorHex: "#4262FF",
    autofillTitle: "Regular Puja",
    autofillLocation: "Main Dhammasala Vihara Sekkha",
    autofillDesc: "Kebaktian rutin mingguan pemuda vihara",
    target_roles: ["admin", "organizer", "activist", "member"],
  },
  {
    id: "cmvmnorq0000l11jo8krahg9v",
    tag: "chanting",
    name: "Chanting",
    bg: "bg-[#0D9488]/10",
    text: "text-[#0D9488]",
    dot: "bg-[#0D9488]",
    points: 60,
    is_active: true,
    colorHex: "#0D9488",
    autofillTitle: "Chanting",
    autofillLocation: "Meditation Hall",
    autofillDesc: "Sesi pelafalan paritta dan sutra kebajikan",
    target_roles: ["admin", "organizer", "activist", "member"],
  },
  {
    id: "cmvmnorq2000m11jogyq78k6x",
    tag: "volunteer",
    name: "Volunteer",
    bg: "bg-[#EC4899]/10",
    text: "text-[#EC4899]",
    dot: "bg-[#EC4899]",
    points: 80,
    is_active: true,
    colorHex: "#EC4899",
    autofillTitle: "Volunteer",
    autofillLocation: "Vihara Sekkha",
    autofillDesc: "Kegiatan bakti sosial dan aksi kerelawanan pemuda",
    target_roles: ["admin", "organizer", "activist", "member"],
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

export async function syncMasterCategories(): Promise<EventCategoryItem[]> {
  try {
    const data = await api.get<any[]>("/configure/event-types")
    if (Array.isArray(data) && data.length > 0) {
      const items: EventCategoryItem[] = data.map((t) => {
        const hex = t.color || "#4262FF"
        return {
          id: t.id,
          tag: t.code,
          name: t.label,
          colorHex: hex,
          bg: `bg-[${hex}]/10`,
          text: `text-[${hex}]`,
          dot: `bg-[${hex}]`,
          points: t.default_point_reward ?? 50,
          is_active: t.is_active !== false,
          autofillTitle: t.label,
          autofillLocation: "Vihara Sekkha",
          autofillDesc:
            t.description || `${t.label} session with Sekkha community members.`,
          target_roles: ["admin", "organizer", "activist", "member"],
        }
      })
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(items))
        } catch {}
      }
      return items
    }
  } catch (err) {
    console.warn("Could not sync master categories from API:", err)
  }
  return getMasterCategories()
}

export function getMasterCategories(activeOnly = false): EventCategoryItem[] {
  let res: EventCategoryItem[] = []
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
      if (raw) res = JSON.parse(raw)
    } catch {}
  }
  if (!res || res.length === 0) {
    res = DEFAULT_CATEGORIES
  }
  if (activeOnly) return res.filter((c) => c.is_active !== false)
  return res
}

export function getAccessibleCategories(
  userRole?: string | null,
  activeOnly = true
): EventCategoryItem[] {
  const cats = getMasterCategories(activeOnly)
  const role = (userRole || "member").toLowerCase()
  return cats.filter((c) => {
    if (!c.target_roles || c.target_roles.length === 0) return true
    return c.target_roles.some((r) => r.toLowerCase() === role)
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

export function getEventTag(
  ev?: {
    tag?: string | null
    event_type?: any
  } | null
): string {
  if (!ev) return ""
  // Priority 1: master data event_type object (has code & label from database)
  if (ev.event_type && typeof ev.event_type === "object") {
    if (typeof ev.event_type.code === "string" && ev.event_type.code.trim()) {
      return ev.event_type.code.trim().toLowerCase()
    }
    if (typeof ev.event_type.label === "string" && ev.event_type.label.trim()) {
      return ev.event_type.label.trim().toLowerCase()
    }
  }
  // Priority 2: specific tag if present
  if (typeof ev.tag === "string" && ev.tag.trim()) {
    return ev.tag.trim().toLowerCase()
  }
  // Priority 3: event_type string
  if (typeof ev.event_type === "string" && ev.event_type.trim()) {
    return ev.event_type.trim().toLowerCase()
  }
  return ""
}

function formatCategoryLabel(str?: string | null): string {
  if (!str) return "Event"
  return str
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

export function getCategoryColor(
  tagOrEvent?: string | { tag?: string | null; event_type?: any } | null
): {
  hex: string
  bgStyle: React.CSSProperties
  dotStyle: React.CSSProperties
  name: string
} {
  // If an event object or event_type object is provided, extract directly from master data
  if (tagOrEvent && typeof tagOrEvent === "object") {
    const et = tagOrEvent.event_type
    if (et && typeof et === "object") {
      const hex = et.color || "#4262FF"
      const name = et.label || formatCategoryLabel(et.code)
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
        name,
      }
    }
  }

  const rawTagOrName =
    typeof tagOrEvent === "string" ? tagOrEvent : getEventTag(tagOrEvent)
  const item = getCategoryByTag(rawTagOrName)
  const hex = item?.colorHex || "#4262FF"
  const name = item?.name ?? formatCategoryLabel(rawTagOrName)

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
    name,
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
