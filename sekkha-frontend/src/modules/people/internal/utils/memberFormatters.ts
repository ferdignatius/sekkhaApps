import { getInitials } from "@/lib/initials"
import {
  normalizeRoleKey,
  formatRoleLabel,
  getRoleBadgeVariant,
  getRoleAvatarClass,
} from "@/lib/roles"

export {
  normalizeRoleKey,
  formatRoleLabel,
  getRoleBadgeVariant,
  getRoleAvatarClass,
}

export function getRoleDescription(role?: string | null): string {
  switch (normalizeRoleKey(role)) {
    case "admin":
      return "Full system governance, role management, and directory administration."
    case "organizer":
      return "Event management, attendance scanning, and member onboarding."
    case "activist":
      return "Verified Dhamma youth activist eligible for temple service duties."
    case "member":
    default:
      return "Standard community member eligible for attendance and karma points."
  }
}

export function formatMemberInitials(name?: string | null): string {
  return getInitials(name, "MB")
}

export function formatMemberDate(dateStr?: string | null): string {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function formatAttendanceMethodLabel(method?: string | null): string {
  const m = (method || "").toLowerCase()
  if (m === "manual") return "Manual Check-in"
  if (!m || m === "qr_scan" || m === "qr") return "QR Scan"
  return method || "QR Scan"
}

export function normalizeWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (!digits) return null
  if (digits.startsWith("0")) return `62${digits.slice(1)}`
  return digits
}
