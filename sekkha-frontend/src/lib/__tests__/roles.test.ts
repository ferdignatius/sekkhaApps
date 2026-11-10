import { describe, it, expect } from "vitest"
import {
  normalizeRoleKey,
  formatRoleLabel,
  getRoleBadgeVariant,
  getRoleAvatarClass,
} from "../roles"

describe("Unified Role Badge & Avatar Palette (Opsi 2: Obsidian Gold Admin)", () => {
  it("normalizes English and Indonesian role aliases consistently", () => {
    expect(normalizeRoleKey("admin")).toBe("admin")
    expect(normalizeRoleKey("pengurus")).toBe("organizer")
    expect(normalizeRoleKey("organizer")).toBe("organizer")
    expect(normalizeRoleKey("aktivis")).toBe("activist")
    expect(normalizeRoleKey("activist")).toBe("activist")
    expect(normalizeRoleKey("umat")).toBe("member")
    expect(normalizeRoleKey("member")).toBe("member")
    expect(normalizeRoleKey(null)).toBe("member")
  })

  it("maps each role to one consistent Badge variant across Home, Profile, People, and Sidebar", () => {
    expect(getRoleBadgeVariant("admin")).toBe("obsidian")
    expect(getRoleBadgeVariant("organizer")).toBe("teal")
    expect(getRoleBadgeVariant("pengurus")).toBe("teal")
    expect(getRoleBadgeVariant("activist")).toBe("lavender")
    expect(getRoleBadgeVariant("aktivis")).toBe("lavender")
    expect(getRoleBadgeVariant("member")).toBe("default")
    expect(getRoleBadgeVariant("umat")).toBe("default")

    expect(formatRoleLabel("admin")).toBe("Admin")
    expect(formatRoleLabel("pengurus")).toBe("Organizer")
    expect(formatRoleLabel("aktivis")).toBe("Activist")
    expect(formatRoleLabel("umat")).toBe("Member")
  })

  it("provides unified avatar colors for every role", () => {
    expect(getRoleAvatarClass("admin")).toContain("bg-ink")
    expect(getRoleAvatarClass("admin")).toContain("text-clay-ochre")
    expect(getRoleAvatarClass("organizer")).toContain("bg-clay-teal")
    expect(getRoleAvatarClass("activist")).toContain("bg-clay-lavender")
    expect(getRoleAvatarClass("member")).toContain("bg-clay-ochre")
  })
})

