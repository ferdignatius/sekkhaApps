export const TARGET_AUDIENCE_ROLES = ["member", "activist", "organizer"] as const

export type TargetAudienceRole = (typeof TARGET_AUDIENCE_ROLES)[number]
export type EventVisibilityTier = "all" | "member" | "activist" | "organizer"

const TARGET_ROLE_SET = new Set<string>(TARGET_AUDIENCE_ROLES)

export function visibilityToDefaultRoles(visibility?: string | null): TargetAudienceRole[] {
  switch (visibility) {
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

export function normalizeTargetRoles(
  roles?: readonly string[] | null,
  fallbackVisibility?: string | null
): TargetAudienceRole[] {
  if (!roles || roles.length === 0) {
    return visibilityToDefaultRoles(fallbackVisibility)
  }

  const unique = new Set<TargetAudienceRole>()
  for (const r of roles) {
    if (TARGET_ROLE_SET.has(r)) {
      unique.add(r as TargetAudienceRole)
    }
  }

  if (unique.size === 0) {
    return visibilityToDefaultRoles(fallbackVisibility)
  }

  return TARGET_AUDIENCE_ROLES.filter((r) => unique.has(r))
}

export function deriveVisibilityFromTargetRoles(
  roles: readonly string[]
): EventVisibilityTier {
  const hasMember = roles.includes("member")
  const hasActivist = roles.includes("activist")
  if (hasMember && hasActivist) return "all"
  if (hasMember) return "member"
  if (hasActivist) return "activist"
  return "organizer"
}

export function resolveAudiencePolicy(params: {
  targetRoles?: readonly string[] | null
  visibility?: EventVisibilityTier | null
  fallbackTargetRoles?: readonly string[] | null
  fallbackVisibility?: EventVisibilityTier | null
}): { targetRoles: TargetAudienceRole[]; visibility: EventVisibilityTier } {
  if (params.targetRoles && params.targetRoles.length > 0) {
    const targetRoles = normalizeTargetRoles(params.targetRoles, params.fallbackVisibility)
    return {
      targetRoles,
      visibility: deriveVisibilityFromTargetRoles(targetRoles),
    }
  }

  if (params.visibility) {
    const targetRoles = visibilityToDefaultRoles(params.visibility)
    return {
      targetRoles,
      visibility: params.visibility,
    }
  }

  const targetRoles = normalizeTargetRoles(params.fallbackTargetRoles, params.fallbackVisibility)
  return {
    targetRoles,
    visibility: deriveVisibilityFromTargetRoles(targetRoles),
  }
}
