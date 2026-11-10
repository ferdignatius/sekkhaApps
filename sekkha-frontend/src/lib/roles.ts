import type { SekkhaBadgeProps } from "@/components/base/Badge"

export type CanonicalRole = "admin" | "organizer" | "activist" | "member"

/**
 * Normalizes backend/legacy English & Indonesian role aliases into 4 canonical keys.
 */
export function normalizeRoleKey(role?: string | null): CanonicalRole {
  const normalized = (role || "member").toLowerCase()
  switch (normalized) {
    case "admin":
      return "admin"
    case "organizer":
    case "pengurus":
      return "organizer"
    case "activist":
    case "aktivis":
      return "activist"
    case "member":
    case "umat":
    default:
      return "member"
  }
}

export function formatRoleLabel(role?: string | null): string {
  switch (normalizeRoleKey(role)) {
    case "admin":
      return "Admin"
    case "organizer":
      return "Organizer"
    case "activist":
      return "Activist"
    case "member":
    default:
      return "Member"
  }
}

/**
 * Unified Sekkha Badge variant mapping (Opsi 2):
 * - Admin: Obsidian + Gold (`obsidian`)
 * - Organizer: Clay Teal (`teal`)
 * - Activist: Clay Lavender (`lavender`)
 * - Member: Warm Cream (`default`)
 */
export function getRoleBadgeVariant(
  role?: string | null
): SekkhaBadgeProps["variant"] {
  switch (normalizeRoleKey(role)) {
    case "admin":
      return "obsidian"
    case "organizer":
      return "teal"
    case "activist":
      return "lavender"
    case "member":
    default:
      return "default"
  }
}

/**
 * Unified avatar box styling per role used across Home, Profile, People, and Sidebar.
 */
export function getRoleAvatarClass(role?: string | null): string {
  switch (normalizeRoleKey(role)) {
    case "admin":
      return "bg-ink text-clay-ochre border-clay-ochre/40"
    case "organizer":
      return "bg-clay-teal text-white border-clay-teal"
    case "activist":
      return "bg-clay-lavender text-ink border-clay-lavender"
    case "member":
    default:
      return "bg-clay-ochre text-ink border-clay-ochre/50"
  }
}

