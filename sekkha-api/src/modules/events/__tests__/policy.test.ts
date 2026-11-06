import { describe, it, expect } from "bun:test"
import { canManageEvent, canRecordAttendance, canViewEvent } from "../policy"

describe("Event Policy & Access Control", () => {
  it("allows only organizer and admin to manage events", () => {
    expect(canManageEvent("admin")).toBe(true)
    expect(canManageEvent("organizer")).toBe(true)
    expect(canManageEvent("activist")).toBe(false)
    expect(canManageEvent("member")).toBe(false)
    expect(canManageEvent("")).toBe(false)
  })

  it("allows only organizer and admin to record attendance per PRD AC-ATT-03", () => {
    expect(canRecordAttendance("admin")).toBe(true)
    expect(canRecordAttendance("organizer")).toBe(true)
    expect(canRecordAttendance("activist")).toBe(false)
    expect(canRecordAttendance("member")).toBe(false)
  })

  it("enforces visibility rules per PRD matrix", () => {
    // Admin & Organizer see all events regardless of status/visibility
    expect(canViewEvent("admin", "cancel", "all")).toBe(true)
    expect(canViewEvent("organizer", "cancel", "member")).toBe(true)

    // Cancelled events are hidden from non-managers
    expect(canViewEvent("member", "cancel", "all")).toBe(false)
    expect(canViewEvent("activist", "cancel", "all")).toBe(false)

    // Visibility: all
    expect(canViewEvent("member", "scheduled", "all")).toBe(true)
    expect(canViewEvent("activist", "scheduled", "all")).toBe(true)

    // Visibility: member only
    expect(canViewEvent("member", "scheduled", "member")).toBe(true)
    expect(canViewEvent("activist", "scheduled", "member")).toBe(false)

    // Visibility: activist only
    expect(canViewEvent("activist", "scheduled", "activist")).toBe(true)
    expect(canViewEvent("member", "scheduled", "activist")).toBe(false)

    // Visibility: organizer only
    expect(canViewEvent("member", "scheduled", "organizer")).toBe(false)
    expect(canViewEvent("activist", "scheduled", "organizer")).toBe(false)
  })
})
