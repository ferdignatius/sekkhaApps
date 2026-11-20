import { afterEach, describe, expect, it } from "bun:test"
import { userModels } from "../models"
import { userServices } from "../services"

const originalFindAttendances = userModels.findUserAttendancesByDateRange

afterEach(() => {
  userModels.findUserAttendancesByDateRange = originalFindAttendances
})

describe("userServices.getWeeklyActivityHeatmap", () => {
  it("aggregates weekly check-in counts into 1-week buckets grouped by month", async () => {
    userModels.findUserAttendancesByDateRange = (async () => [
      {
        scannedAt: new Date("2026-11-08T03:00:00.000Z"),
        event: { eventDate: new Date("2026-11-08T02:00:00.000Z") },
      },
      {
        scannedAt: new Date("2026-11-04T12:00:00.000Z"),
        event: { eventDate: new Date("2026-11-04T12:00:00.000Z") },
      },
      {
        scannedAt: new Date("2026-11-15T03:00:00.000Z"),
        event: { eventDate: new Date("2026-11-15T02:00:00.000Z") },
      },
    ]) as any

    const res = await userServices.getWeeklyActivityHeatmap("usr_1", 2026)

    expect(res.year).toBe(2026)
    expect(res.total_checkins).toBe(3)
    expect(res.weeks.length).toBeGreaterThanOrEqual(52)

    const novWeeks = res.weeks.filter((w) => w.month === 10)
    expect(novWeeks.length).toBeGreaterThanOrEqual(4)
    expect(novWeeks[0]?.week_of_month).toBe(1)
    expect(novWeeks[0]?.count).toBe(2)
    expect(novWeeks[1]?.count).toBe(1)
  })
})
