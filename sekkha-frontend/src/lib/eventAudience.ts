export const TARGET_AUDIENCE_ROLES = [
  "member",
  "activist",
  "organizer",
] as const

export type TargetAudienceRole = (typeof TARGET_AUDIENCE_ROLES)[number]
export type EventVisibilityOption = "all" | "member" | "activist" | "organizer"

export const TARGET_ROLE_OPTIONS: ReadonlyArray<{
  value: TargetAudienceRole
  label: string
}> = [
  { value: "member", label: "Member" },
  { value: "activist", label: "Activist" },
  { value: "organizer", label: "Organizer" },
]

export function normalizeTargetRoles(
  roles?: readonly string[] | null,
  fallbackVisibility?: string | null
): TargetAudienceRole[] {
  if (roles && roles.length > 0) {
    const picked = new Set(
      roles
        .map((r) => r.toLowerCase())
        .filter((r): r is TargetAudienceRole =>
          (TARGET_AUDIENCE_ROLES as readonly string[]).includes(r)
        )
    )
    if (picked.size > 0) {
      return TARGET_AUDIENCE_ROLES.filter((r) => picked.has(r))
    }
  }

  switch (fallbackVisibility) {
    case "member":
      return ["member", "organizer"]
    case "activist":
      return ["activist", "organizer"]
    case "organizer":
      return ["organizer"]
    case "all":
    default:
      return ["member", "activist", "organizer"]
  }
}

export function toggleTargetRoleSelection(
  current: readonly TargetAudienceRole[],
  role: TargetAudienceRole
): TargetAudienceRole[] {
  const exists = current.includes(role)
  if (exists && current.length <= 1) {
    return [...current]
  }
  const next = exists
    ? current.filter((r) => r !== role)
    : [...current, role]
  return TARGET_AUDIENCE_ROLES.filter((r) => next.includes(r))
}

export function deriveVisibilityFromTargetRoles(
  roles?: readonly string[] | null
): EventVisibilityOption {
  if (!roles || roles.length === 0) return "all"
  const normalized = roles.map((r) => r.toLowerCase())
  const hasMember = normalized.includes("member")
  const hasActivist = normalized.includes("activist")
  if (hasMember && hasActivist) return "all"
  if (hasMember) return "member"
  if (hasActivist) return "activist"
  if (
    normalized.includes("organizer") ||
    normalized.includes("pengurus") ||
    normalized.includes("admin")
  ) {
    return "organizer"
  }
  return "all"
}

export function formatAudienceRolesLabel(
  roles?: readonly string[] | null,
  fallbackVisibility?: string | null
): string {
  const resolved = normalizeTargetRoles(roles, fallbackVisibility)
  if (resolved.length === TARGET_AUDIENCE_ROLES.length) {
    return "All Roles (Member, Activist, Organizer)"
  }
  return resolved
    .map((r) =>
      r === "member" ? "Member" : r === "activist" ? "Activist" : "Organizer"
    )
    .join(", ")
}
