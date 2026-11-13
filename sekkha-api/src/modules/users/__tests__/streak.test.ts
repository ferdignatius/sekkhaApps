import { describe, it, expect } from "bun:test"
import {
  calculateWeeklyStreak,
  toWeekKey,
  toMonthKey,
  evaluatePerfectMonthBonus,
} from "../internal/utils"

describe("Weekly Streak Calculation (TikTok-Style 3-State Engine + Vihara Bye-Week)", () => {
  it("converts dates to ISO week keys and UTC month keys correctly", () => {
    const date1 = new Date("2026-01-04T10:00:00Z")
    const date2 = new Date("2026-01-05T10:00:00Z")
    expect(toWeekKey(date1)).toBe("2026-W01")
    expect(toWeekKey(date2)).toBe("2026-W02")
    expect(toMonthKey(date1)).toBe("2026-01")
  })

  it("returns inactive status and zero streak for empty attendances", () => {
    const res = calculateWeeklyStreak([])
    expect(res.current_streak).toBe(0)
    expect(res.longest_streak).toBe(0)
    expect(res.status).toBe("inactive")
  })

  it("calculates 4-week consecutive active streak accurately", () => {
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
    expect(res.status).toBe("active")
  })

  it("pauses streak when missing 1-3 consecutive active weeks instead of resetting", () => {
    const attendances = [
      { scannedAt: "2026-01-04T09:00:00Z" }, // W01
      { scannedAt: "2026-01-11T09:00:00Z" }, // W02
      { scannedAt: "2026-01-18T09:00:00Z" }, // W03 -> streak 3
    ]

    // 1 active week missed (ref in W05, missed W04) -> paused, streak stays 3!
    const missedOneWeekRef = new Date("2026-02-01T12:00:00Z")
    const res1 = calculateWeeklyStreak(attendances, missedOneWeekRef)
    expect(res1.status).toBe("paused")
    expect(res1.current_streak).toBe(3)
    expect(res1.longest_streak).toBe(3)

    // 2 active weeks missed (ref in W06, missed W04 & W05) -> still paused, streak stays 3!
    const missedTwoWeeksRef = new Date("2026-02-08T12:00:00Z")
    const res2 = calculateWeeklyStreak(attendances, missedTwoWeeksRef)
    expect(res2.status).toBe("paused")
    expect(res2.current_streak).toBe(3)
  })

  it("re-activates paused streak on first return without incrementing, then increments on next week", () => {
    const attendances = [
      { scannedAt: "2026-01-04T09:00:00Z" }, // W01 -> 1
      { scannedAt: "2026-01-11T09:00:00Z" }, // W02 -> 2
      { scannedAt: "2026-01-18T09:00:00Z" }, // W03 -> 3
      // skipped W04 (paused at 3)
      { scannedAt: "2026-02-01T09:00:00Z" }, // W05 -> re-activates (status active, count stays 3)
    ]

    const reactivationRef = new Date("2026-02-01T12:00:00Z")
    const resReactivate = calculateWeeklyStreak(attendances, reactivationRef)
    expect(resReactivate.status).toBe("active")
    expect(resReactivate.current_streak).toBe(3)
    expect(resReactivate.longest_streak).toBe(3)

    // Next week attendance in W06 increments streak from 3 to 4
    const continuedAttendances = [
      ...attendances,
      { scannedAt: "2026-02-08T09:00:00Z" }, // W06 -> 4
    ]
    const nextWeekRef = new Date("2026-02-08T12:00:00Z")
    const resContinued = calculateWeeklyStreak(continuedAttendances, nextWeekRef)
    expect(resContinued.status).toBe("active")
    expect(resContinued.current_streak).toBe(4)
    expect(resContinued.longest_streak).toBe(4)
  })

  it("expires streak to 0 only after missing 4+ consecutive active weeks (~1 month), preserving longest_streak", () => {
    const attendances = [
      { scannedAt: "2026-01-04T09:00:00Z" },
      { scannedAt: "2026-01-11T09:00:00Z" },
      { scannedAt: "2026-01-18T09:00:00Z" },
      { scannedAt: "2026-01-25T09:00:00Z" }, // W04 -> 4
    ]

    // Late evaluation 7 weeks later (W05..W10 missed) -> expired to 0, longest_streak = 4
    const lateDate = new Date("2026-03-15T10:00:00Z")
    const expiredRes = calculateWeeklyStreak(attendances, lateDate)
    expect(expiredRes.status).toBe("expired")
    expect(expiredRes.current_streak).toBe(0)
    expect(expiredRes.longest_streak).toBe(4)

    // Anchored to eventDate (2026-01-25) keeps streak active at 4
    const eventDate = new Date("2026-01-25T11:00:00Z")
    const anchoredRes = calculateWeeklyStreak(attendances, eventDate)
    expect(anchoredRes.status).toBe("active")
    expect(anchoredRes.current_streak).toBe(4)
  })

  it("skips Vihara Bye-Weeks (weeks with 0 community events) without pausing or expiring streak", () => {
    const attendances = [
      { scannedAt: "2026-01-04T09:00:00Z" }, // W01 -> 1
      // W02: Vihara Bye-Week (0 events)
      // W03: Vihara Bye-Week (0 events)
      { scannedAt: "2026-01-25T09:00:00Z" }, // W04 -> 2!
    ]
    const activeCommunityWeeks = ["2026-W01", "2026-W04"]
    const res = calculateWeeklyStreak(
      attendances,
      new Date("2026-01-25T12:00:00Z"),
      activeCommunityWeeks
    )
    expect(res.status).toBe("active")
    expect(res.current_streak).toBe(2)
    expect(res.longest_streak).toBe(2)
  })

  it("handles consecutive streak across year boundaries correctly", () => {
    const attendances = [
      { scannedAt: "2025-12-28T09:00:00Z" }, // 2025-W52
      { scannedAt: "2026-01-04T09:00:00Z" }, // 2026-W01
    ]
    const refDate = new Date("2026-01-04T12:00:00Z")
    const res = calculateWeeklyStreak(attendances, refDate)
    expect(res.current_streak).toBe(2)
    expect(res.longest_streak).toBe(2)
    expect(res.status).toBe("active")
  })
})

describe("Perfect Month Bonus Evaluation (Minimum 3 Active Weeks Threshold)", () => {
  it("awards monthly bonus when W_active >= 3 and user attended 100% of active weeks", () => {
    const monthEventDates = [
      new Date("2026-02-01T09:00:00Z"),
      new Date("2026-02-08T09:00:00Z"),
      new Date("2026-02-22T09:00:00Z"), // 3 active weeks (W05, W06, W08; W07 is Bye-Week)
    ]
    const userAttendances = monthEventDates.map((d) => ({ scannedAt: d }))
    const res = evaluatePerfectMonthBonus({
      userId: "usr_1",
      userAttendances,
      monthEventDates,
      referenceEventDate: new Date("2026-02-22T09:00:00Z"),
      hasFutureUnclosedWeeksInMonth: false,
    })

    expect(res.eligible).toBe(true)
    expect(res.activeWeeksCount).toBe(3)
    expect(res.yearMonth).toBe("2026-02")
    expect(res.referenceId).toBe("monthly_streak:usr_1:2026-02")
  })

  it("denies monthly bonus when month has < 3 active weeks (e.g. only 2 weeks with events)", () => {
    const monthEventDates = [
      new Date("2026-02-01T09:00:00Z"),
      new Date("2026-02-15T09:00:00Z"), // only 2 active weeks in month
    ]
    const userAttendances = monthEventDates.map((d) => ({ scannedAt: d }))
    const res = evaluatePerfectMonthBonus({
      userId: "usr_1",
      userAttendances,
      monthEventDates,
      referenceEventDate: new Date("2026-02-15T09:00:00Z"),
      hasFutureUnclosedWeeksInMonth: false,
    })

    expect(res.activeWeeksCount).toBe(2)
    expect(res.eligible).toBe(false)
  })

  it("denies monthly bonus if user missed at least 1 active week in an eligible month", () => {
    const monthEventDates = [
      new Date("2026-02-01T09:00:00Z"),
      new Date("2026-02-08T09:00:00Z"),
      new Date("2026-02-15T09:00:00Z"),
      new Date("2026-02-22T09:00:00Z"),
    ]
    const userAttendances = [
      { scannedAt: new Date("2026-02-01T09:00:00Z") },
      { scannedAt: new Date("2026-02-08T09:00:00Z") },
      // missed 2026-02-15
      { scannedAt: new Date("2026-02-22T09:00:00Z") },
    ]
    const res = evaluatePerfectMonthBonus({
      userId: "usr_1",
      userAttendances,
      monthEventDates,
      referenceEventDate: new Date("2026-02-22T09:00:00Z"),
      hasFutureUnclosedWeeksInMonth: false,
    })

    expect(res.activeWeeksCount).toBe(4)
    expect(res.eligible).toBe(false)
  })
})
