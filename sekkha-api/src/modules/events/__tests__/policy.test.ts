import { describe, it, expect } from "bun:test"
import { canManageEvent, canRecordAttendance, canViewEvent } from "../policy"
import { CreateEventSchema, UpdateEventSchema, UpdateStatusSchema } from "../controllers"
import { eventServices } from "../services"
import { eventModels } from "../models"
import { prisma } from "../../../lib/prisma"

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

describe("Event Validation Schemas", () => {
  it("rejects event_date in the past on CreateEventSchema", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const result = CreateEventSchema.safeParse({
      title: "Kebaktian Remaja",
      location: "Dhammasala",
      event_date: yesterday,
      event_type_id: "evt_type_1",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Event date cannot be in the past")
    }
  })

  it("accepts future event_date on CreateEventSchema", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const result = CreateEventSchema.safeParse({
      title: "Kebaktian Remaja",
      location: "Dhammasala",
      event_date: future,
      event_type_id: "evt_type_1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects status field on UpdateEventSchema", () => {
    const result = UpdateEventSchema.safeParse({
      title: "Kebaktian Remaja Baru",
      status: "active",
    })
    expect(result.success).toBe(false)
  })

  it("validates UpdateStatusSchema transitions", () => {
    expect(UpdateStatusSchema.safeParse({ status: "active" }).success).toBe(true)
    expect(UpdateStatusSchema.safeParse({ status: "closed" }).success).toBe(true)
    expect(UpdateStatusSchema.safeParse({ status: "cancel" }).success).toBe(true)
    expect(
      UpdateStatusSchema.safeParse({
        status: "scheduled",
        event_date: new Date(Date.now() + 86400000).toISOString(),
      }).success
    ).toBe(true)
    expect(UpdateStatusSchema.safeParse({ status: "invalid_status" }).success).toBe(false)
  })
})

describe("Event Services & State Transitions", () => {
  it("getEventDetail throws 404 if event is not found or hidden by visibility", async () => {
    const originalFind = eventModels.findEventById
    eventModels.findEventById = async () => ({
      id: "evt_secret",
      title: "Pengurus Only",
      description: null,
      location: "Ruang Rapat",
      eventDate: new Date("2026-11-20T10:00:00Z"),
      status: "scheduled",
      visibility: "organizer",
      pointReward: 50,
      maxLateMinutes: 30,
      latePenaltyPoints: 15,
      seasonId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: null,
      season: null,
      _count: { attendances: 0 },
    } as any)

    // Member trying to get organizer-only event should get 404
    try {
      await eventServices.getEventDetail("evt_secret", "member", false)
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.status || err.statusCode).toBe(404)
    }

    // Organizer can view it
    const detail = await eventServices.getEventDetail("evt_secret", "organizer", true)
    expect(detail.id).toBe("evt_secret")

    eventModels.findEventById = originalFind
  })

  it("createEvent throws 400 if event_date is in the past", async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString()
    try {
      await eventServices.createEvent("usr_admin", "admin", {
        title: "Test Event",
        location: "Dhammasala",
        event_date: pastDate,
        event_type_id: "evt_type_1",
      })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.status || err.statusCode).toBe(400)
      expect(err.message).toBe("Event date cannot be in the past")
    }
  })

  it("deleteEvent prevents deleting closed events", async () => {
    const originalFindBasic = eventModels.findEventBasic
    eventModels.findEventBasic = async () => ({
      id: "evt_closed",
      title: "Past Puja",
      eventDate: new Date(),
      pointReward: 50,
      maxLateMinutes: 30,
      latePenaltyPoints: 15,
      status: "closed",
      type: null,
    } as any)

    try {
      await eventServices.deleteEvent("usr_admin", "admin", "evt_closed")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.status || err.statusCode).toBe(400)
      expect(err.message).toBe("Closed events cannot be deleted because points have already been distributed.")
    } finally {
      eventModels.findEventBasic = originalFindBasic
    }
  })

  it("updateEventStatus prevents activating event whose date has passed", async () => {
    const originalTransaction = prisma.$transaction
    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_past",
            title: "Past Puja",
            eventDate: new Date("2026-01-01T09:00:00Z"),
            status: "scheduled",
            type: null,
          }),
        },
      }
      return cb(txMock)
    }

    try {
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_past", "active")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.status || err.statusCode).toBe(400)
      expect(err.message).toBe("Event cannot be activated because its scheduled date has already passed")
    } finally {
      prisma.$transaction = originalTransaction
    }
  })

  it("updateEventStatus validates reschedule requires valid future event_date", async () => {
    const originalTransaction = prisma.$transaction
    ;(prisma as any).$transaction = async (cb: any) => {
      const txMock = {
        event: {
          findUnique: async () => ({
            id: "evt_cancelled",
            title: "Cancelled Puja",
            eventDate: new Date("2026-01-01T09:00:00Z"),
            status: "cancel",
            type: null,
          }),
        },
      }
      return cb(txMock)
    }

    // Missing rescheduleDate
    try {
      await eventServices.updateEventStatus("usr_admin", "admin", "evt_cancelled", "scheduled")
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.status || err.statusCode).toBe(400)
      expect(err.message).toBe("Reschedule date is required.")
    }

    // Past rescheduleDate
    try {
      await eventServices.updateEventStatus(
        "usr_admin",
        "admin",
        "evt_cancelled",
        "scheduled",
        new Date(Date.now() - 3600000).toISOString()
      )
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.status || err.statusCode).toBe(400)
      expect(err.message).toBe("Rescheduled event date cannot be in the past.")
    } finally {
      prisma.$transaction = originalTransaction
    }
  })

  it("listAttendances returns only own record for regular member and all records for organizer", async () => {
    const origFindBasic = eventModels.findEventBasic
    const origFindExisting = eventModels.findExistingAttendance
    const origFindUser = eventModels.findUserForAttendance
    const origCount = eventModels.countEventAttendances
    const origFindMany = eventModels.findEventAttendances

    eventModels.findEventBasic = async () => ({
      id: "evt_test",
      title: "Puja",
      eventDate: new Date(),
      status: "active",
      pointReward: 50,
      maxLateMinutes: 30,
      latePenaltyPoints: 15,
      type: null,
    } as any)

    eventModels.findExistingAttendance = async (eventId, userId) => {
      if (userId === "usr_member_1") {
        return {
          id: "att_1",
          userId: "usr_member_1",
          eventId: "evt_test",
          method: "qr",
          pointsEarned: 50,
          isLate: false,
          latePenaltyApplied: 0,
          badgeActivityId: null,
          badgeBonusPoints: 0,
          isFinalized: false,
          scannedAt: new Date("2026-11-20T10:00:00Z"),
          badgeActivity: null,
        } as any
      }
      return null
    }

    eventModels.findUserForAttendance = async (id) => ({
      id,
      userNumber: BigInt("2026112001"),
      role: "member",
      profile: { name: "Budi", school: { name: "SMA 1" } },
    } as any)

    // Member with attendance
    const memberRes = await eventServices.listAttendances("evt_test", "usr_member_1", false)
    expect(memberRes.attendances.length).toBe(1)
    expect(memberRes.attendances[0].user_id).toBe("usr_member_1")
    expect(memberRes.attendances[0].name).toBe("Budi")
    expect(memberRes.my_attendance?.attendance_id).toBe("att_1")

    // Member without attendance
    const nonAttendedRes = await eventServices.listAttendances("evt_test", "usr_member_2", false)
    expect(nonAttendedRes.attendances.length).toBe(0)
    expect(nonAttendedRes.my_attendance).toBeNull()

    // Organizer gets all records
    eventModels.countEventAttendances = async () => 2
    eventModels.findEventAttendances = async () => [
      {
        id: "att_1",
        userId: "usr_member_1",
        method: "qr",
        pointsEarned: 50,
        isLate: false,
        latePenaltyApplied: 0,
        badgeActivityId: null,
        badgeActivity: null,
        badgeBonusPoints: 0,
        isFinalized: false,
        scannedAt: new Date("2026-11-20T10:00:00Z"),
        user: {
          role: "member",
          userNumber: BigInt("2026112001"),
          profile: { name: "Budi", school: { name: "SMA 1" } },
        },
      },
      {
        id: "att_2",
        userId: "usr_member_2",
        method: "manual",
        pointsEarned: 50,
        isLate: false,
        latePenaltyApplied: 0,
        badgeActivityId: null,
        badgeActivity: null,
        badgeBonusPoints: 0,
        isFinalized: false,
        scannedAt: new Date("2026-11-20T10:05:00Z"),
        user: {
          role: "member",
          userNumber: BigInt("2026112002"),
          profile: { name: "Siti", school: null },
        },
      },
    ] as any

    const organizerRes = await eventServices.listAttendances("evt_test", "usr_admin", true)
    expect(organizerRes.attendances.length).toBe(2)
    expect(organizerRes.total_attended).toBe(2)

    eventModels.findEventBasic = origFindBasic
    eventModels.findExistingAttendance = origFindExisting
    eventModels.findUserForAttendance = origFindUser
    eventModels.countEventAttendances = origCount
    eventModels.findEventAttendances = origFindMany
  })
})
