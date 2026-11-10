import { describe, it, expect } from "bun:test"
import { calculateWeeklyStreak, toWeekKey } from "../internal/utils"

describe("Weekly Streak Calculation (calculateWeeklyStreak & toWeekKey)", () => {
  it("converts dates to ISO week keys correctly", () => {
    // 2026-01-04 is Sunday of Week 1, 2026-01-05 is Monday of Week 2
    const date1 = new Date("2026-01-04T10:00:00Z")
    const date2 = new Date("2026-01-05T10:00:00Z")
    expect(toWeekKey(date1)).toBe("2026-W01")
    expect(toWeekKey(date2)).toBe("2026-W02")
  })

  it("returns zero streak for empty attendances", () => {
    const res = calculateWeeklyStreak([])
    expect(res.current_streak).toBe(0)
    expect(res.longest_streak).toBe(0)
  })

  it("calculates 4-week consecutive streak correctly with default reference date", () => {
    // 4 consecutive Sundays: 2026-02-01, 2026-02-08, 2026-02-15, 2026-02-22
    const attendances = [
      { scannedAt: "2026-02-01T09:00:00Z" },
      { scannedAt: "2026-02-08T09:00:00Z" },
      { scannedAt: "2026-02-15T09:00:00Z" },
      { scannedAt: "2026-02-22T09:00:00Z" },
    ]
    const refDate = new Date("2026-02-22T12:00:00Z")
    const res = calculateWeeklyStreak(attendances, refDate)
    expect(res.current_streak).toBe(4)
    expect(res.longest_streak).toBe(4)
  })

  it("preserves weekly streak when referenceDate is anchored to eventDate even if evaluated weeks later", () => {
    // Attendances took place in weeks 1, 2, 3, 4 of 2026
    const attendances = [
      { scannedAt: "2026-01-04T09:00:00Z" },
      { scannedAt: "2026-01-11T09:00:00Z" },
      { scannedAt: "2026-01-18T09:00:00Z" },
      { scannedAt: "2026-01-25T09:00:00Z" },
    ]

    // Without referenceDate (evaluated at a much later date, e.g. March 2026), current_streak would reset to 0
    const lateAdminAuditDate = new Date("2026-03-15T10:00:00Z")
    const withoutAnchor = calculateWeeklyStreak(attendances, lateAdminAuditDate)
    expect(withoutAnchor.current_streak).toBe(0)
    expect(withoutAnchor.longest_streak).toBe(4)

    // With eventDate as referenceDate (2026-01-25), current_streak is accurately 4
    const eventDate = new Date("2026-01-25T11:00:00Z")
    const withAnchor = calculateWeeklyStreak(attendances, eventDate)
    expect(withAnchor.current_streak).toBe(4)
    expect(withAnchor.longest_streak).toBe(4)
  })

  it("calculates broken streak and retains true longest streak", () => {
    // Attended 3 weeks, skipped 1 week, attended 2 weeks
    const attendances = [
      { scannedAt: "2026-01-04T09:00:00Z" }, // W01
      { scannedAt: "2026-01-11T09:00:00Z" }, // W02
      { scannedAt: "2026-01-18T09:00:00Z" }, // W03
      // skipped W04
      { scannedAt: "2026-02-01T09:00:00Z" }, // W05
      { scannedAt: "2026-02-08T09:00:00Z" }, // W06
    ]
    const refDate = new Date("2026-02-08T12:00:00Z")
    const res = calculateWeeklyStreak(attendances, refDate)
    expect(res.current_streak).toBe(2)
    expect(res.longest_streak).toBe(3)
  })

  it("handles consecutive streak across year boundaries correctly", () => {
    // 2025-W52 and 2026-W01
    const attendances = [
      { scannedAt: "2025-12-28T09:00:00Z" }, // 2025-W52
      { scannedAt: "2026-01-04T09:00:00Z" }, // 2026-W01
    ]
    const refDate = new Date("2026-01-04T12:00:00Z")
    const res = calculateWeeklyStreak(attendances, refDate)
    expect(res.current_streak).toBe(2)
    expect(res.longest_streak).toBe(2)
  })
})

