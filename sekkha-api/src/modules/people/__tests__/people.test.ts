import { describe, it, expect } from "bun:test"
import { peopleServices } from "../services"
import { peopleModels } from "../models"
import { peopleRouter } from "../routes"

const ADMIN_ACTOR = { userId: "usr_admin_1", role: "admin" }
const ORGANIZER_ACTOR = { userId: "usr_org_1", role: "organizer" }

function makeUserRecord(overrides: Record<string, any> = {}) {
  return {
    id: "usr_target_1",
    userNumber: BigInt(2026111001),
    username: "budi1234",
    email: null,
    role: "member",
    isClaimed: false,
    passwordChangedByUser: false,
    createdAt: new Date("2026-11-01T00:00:00Z"),
    updatedAt: new Date("2026-11-01T00:00:00Z"),
    profile: {
      userId: "usr_target_1",
      name: "Budi Santoso",
      phone: null,
      schoolId: null,
      birthDate: null,
      school: null,
    },
    stats: {
      points: 100,
      lastActivityAt: null,
    },
    attendances: [],
    ...overrides,
  }
}

describe("People Module RBAC & Self-Protection Guardrails", () => {
  describe("Rule 1: Self-Protection Guards (even for Admin)", () => {
    it("prevents admin from deleting their own account", async () => {
      const origFind = peopleModels.findUserById
      peopleModels.findUserById = async () => makeUserRecord({ id: ADMIN_ACTOR.userId, role: "admin" }) as any

      try {
        await peopleServices.deleteMember(ADMIN_ACTOR.userId, ADMIN_ACTOR)
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(400)
        expect(err.message).toBe("You cannot delete your own account.")
      } finally {
        peopleModels.findUserById = origFind
      }
    })

    it("prevents admin from changing their own role via updateMember", async () => {
      const origFind = peopleModels.findUserWithProfile
      peopleModels.findUserWithProfile = async () =>
        makeUserRecord({ id: ADMIN_ACTOR.userId, role: "admin" }) as any

      try {
        await peopleServices.updateMember(ADMIN_ACTOR.userId, { role: "member" }, ADMIN_ACTOR)
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(403)
        expect(err.message).toContain("own role or account data")
      } finally {
        peopleModels.findUserWithProfile = origFind
      }
    })

    it("prevents admin from updating their own profile data via People module", async () => {
      const origFind = peopleModels.findUserWithProfile
      peopleModels.findUserWithProfile = async () =>
        makeUserRecord({ id: ADMIN_ACTOR.userId, role: "admin" }) as any

      try {
        await peopleServices.updateMember(
          ADMIN_ACTOR.userId,
          { name: "Renamed Admin", phone: "081234567890" },
          ADMIN_ACTOR
        )
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(403)
        expect(err.message).toContain("own role or account data")
      } finally {
        peopleModels.findUserWithProfile = origFind
      }
    })

    it("prevents admin from resetting their own temporary password", async () => {
      const origFind = peopleModels.findUserWithProfile
      peopleModels.findUserWithProfile = async () =>
        makeUserRecord({ id: ADMIN_ACTOR.userId, role: "admin", isClaimed: false }) as any

      try {
        await peopleServices.resetTemporaryPassword(ADMIN_ACTOR.userId, ADMIN_ACTOR)
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(403)
        expect(err.message).toContain("own temporary password")
      } finally {
        peopleModels.findUserWithProfile = origFind
      }
    })
  })

  describe("Rule 2: Organizer (Pengurus) Restrictions & Unclaimed-Only Reset", () => {
    it("prevents organizer from changing another user's role", async () => {
      const origFind = peopleModels.findUserWithProfile
      peopleModels.findUserWithProfile = async () => makeUserRecord() as any

      try {
        await peopleServices.updateMember("usr_target_1", { role: "activist" }, ORGANIZER_ACTOR)
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(403)
      } finally {
        peopleModels.findUserWithProfile = origFind
      }
    })

    it("prevents organizer from updating profile data of any existing user (claimed or unclaimed)", async () => {
      const origFind = peopleModels.findUserWithProfile
      peopleModels.findUserWithProfile = async () => makeUserRecord({ isClaimed: false }) as any

      try {
        await peopleServices.updateMember(
          "usr_target_1",
          { name: "Edited By Organizer" },
          ORGANIZER_ACTOR
        )
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(403)
      } finally {
        peopleModels.findUserWithProfile = origFind
      }
    })

    it("prevents organizer from updating their own account via People module", async () => {
      try {
        await peopleServices.updateMember(
          ORGANIZER_ACTOR.userId,
          { name: "Self Edit" },
          ORGANIZER_ACTOR
        )
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(403)
      }
    })

    it("prevents organizer from deleting any user account, including their own", async () => {
      const origFind = peopleModels.findUserById
      peopleModels.findUserById = async (id: string) =>
        makeUserRecord({ id, role: id === ORGANIZER_ACTOR.userId ? "organizer" : "member" }) as any

      try {
        // Delete another member
        try {
          await peopleServices.deleteMember("usr_target_1", ORGANIZER_ACTOR)
          expect(true).toBe(false)
        } catch (err: any) {
          expect(err.statusCode).toBe(403)
        }

        // Delete own account
        try {
          await peopleServices.deleteMember(ORGANIZER_ACTOR.userId, ORGANIZER_ACTOR)
          expect(true).toBe(false)
        } catch (err: any) {
          expect(err.statusCode).toBe(403)
        }
      } finally {
        peopleModels.findUserById = origFind
      }
    })

    it("allows organizer to read directory and detail for both claimed and unclaimed accounts", async () => {
      const origCount = peopleModels.count
      const origFindMany = peopleModels.findMany
      const origCountRole = peopleModels.countByRole
      const origCountClaim = peopleModels.countByClaimStatus
      const origDetail = peopleModels.findMemberDetail

      peopleModels.count = async () => 1
      peopleModels.findMany = async () => [makeUserRecord({ isClaimed: true })] as any
      peopleModels.countByRole = async () => [{ role: "member", _count: { _all: 1 } }] as any
      peopleModels.countByClaimStatus = async () => [{ isClaimed: true, _count: { _all: 1 } }] as any
      peopleModels.findMemberDetail = async () => makeUserRecord({ isClaimed: true }) as any

      try {
        const list = await peopleServices.getMembers({ page: 1, limit: 20 }, ORGANIZER_ACTOR)
        expect(list.items.length).toBe(1)
        expect(list.items[0].is_claimed).toBe(true)

        const detail = await peopleServices.getMemberDetail("usr_target_1", ORGANIZER_ACTOR)
        expect(detail.id).toBe("usr_target_1")
        expect(detail.is_claimed).toBe(true)
      } finally {
        peopleModels.count = origCount
        peopleModels.findMany = origFindMany
        peopleModels.countByRole = origCountRole
        peopleModels.countByClaimStatus = origCountClaim
        peopleModels.findMemberDetail = origDetail
      }
    })

    it("allows organizer to reset temporary password for unclaimed member accounts", async () => {
      const origFind = peopleModels.findUserWithProfile
      const origUpdate = peopleModels.update
      let updatedPayload: any = null

      peopleModels.findUserWithProfile = async () =>
        makeUserRecord({ isClaimed: false, passwordChangedByUser: false, role: "member" }) as any
      peopleModels.update = async (_id: string, data: any) => {
        updatedPayload = data
        return {} as any
      }

      try {
        const res = await peopleServices.resetTemporaryPassword("usr_target_1", ORGANIZER_ACTOR)
        expect(res.temporary_password).toMatch(/^sekkha\d{5}puggala$/)
        expect(updatedPayload).not.toBeNull()
        expect(updatedPayload.passwordChangedByUser).toBe(false)
      } finally {
        peopleModels.findUserWithProfile = origFind
        peopleModels.update = origUpdate
      }
    })

    it("prevents organizer from resetting temporary password for claimed accounts", async () => {
      const origFind = peopleModels.findUserWithProfile
      peopleModels.findUserWithProfile = async () =>
        makeUserRecord({ isClaimed: true, passwordChangedByUser: true, role: "member" }) as any

      try {
        await peopleServices.resetTemporaryPassword("usr_target_1", ORGANIZER_ACTOR)
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(400)
        expect(err.message).toContain("ACCOUNT_ALREADY_CLAIMED")
      } finally {
        peopleModels.findUserWithProfile = origFind
      }
    })

    it("prevents organizer from resetting temporary password for unclaimed organizer/admin accounts or self", async () => {
      const origFind = peopleModels.findUserWithProfile
      peopleModels.findUserWithProfile = async (id: string) =>
        makeUserRecord({
          id,
          isClaimed: false,
          passwordChangedByUser: false,
          role: id === "usr_admin_unclaimed" ? "admin" : "organizer",
        }) as any

      try {
        // Self reset blocked
        try {
          await peopleServices.resetTemporaryPassword(ORGANIZER_ACTOR.userId, ORGANIZER_ACTOR)
          expect(true).toBe(false)
        } catch (err: any) {
          expect(err.statusCode).toBe(403)
        }

        // Unclaimed admin blocked for organizer
        try {
          await peopleServices.resetTemporaryPassword("usr_admin_unclaimed", ORGANIZER_ACTOR)
          expect(true).toBe(false)
        } catch (err: any) {
          expect(err.statusCode).toBe(403)
        }

        // Unclaimed peer organizer blocked for organizer
        try {
          await peopleServices.resetTemporaryPassword("usr_org_2", ORGANIZER_ACTOR)
          expect(true).toBe(false)
        } catch (err: any) {
          expect(err.statusCode).toBe(403)
        }
      } finally {
        peopleModels.findUserWithProfile = origFind
      }
    })
  })

  describe("Admin Allowed Actions on Other Users & Route Guards", () => {
    it("allows admin to update profile data and role of another user", async () => {
      const origFind = peopleModels.findUserWithProfile
      const origTx = peopleModels.transaction

      peopleModels.findUserWithProfile = async () => makeUserRecord({ role: "member" }) as any
      peopleModels.transaction = async (fn: any) => {
        const txMock = {
          user: {
            update: async ({ data }: any) => ({
              ...makeUserRecord(),
              role: data.role ?? "member",
            }),
          },
          userProfile: {
            upsert: async ({ update }: any) => ({
              userId: "usr_target_1",
              name: update.name ?? "Budi Santoso",
              schoolId: null,
              school: null,
            }),
          },
        }
        return fn(txMock)
      }

      try {
        const updated = await peopleServices.updateMember(
          "usr_target_1",
          { name: "Budi Updated", role: "activist" },
          ADMIN_ACTOR
        )
        expect(updated.role).toBe("activist")
        expect(updated.name).toBe("Budi Updated")
      } finally {
        peopleModels.findUserWithProfile = origFind
        peopleModels.transaction = origTx
      }
    })

    it("enforces admin-only middleware on PUT and DELETE routes in peopleRouter", () => {
      const routeLayers = peopleRouter.stack.filter((layer: any) => layer.route)

      const putRoutes = routeLayers.filter((l: any) => l.route.methods.put)
      expect(putRoutes.length).toBeGreaterThan(0)

      for (const layer of putRoutes) {
        // Run the role guard middleware (2nd middleware after requireAuth) with a fake organizer req.user
        const middlewares = layer.route.stack.map((s: any) => s.handle)
        const roleGuard = middlewares[1]
        let statusCode: number | null = null
        let nextCalled = false

        roleGuard(
          { user: ORGANIZER_ACTOR } as any,
          {
            status(code: number) {
              statusCode = code
              return this
            },
            json() {
              return this
            },
          } as any,
          () => {
            nextCalled = true
          }
        )

        expect(nextCalled).toBe(false)
        expect(statusCode).toBe(403)
      }

      const deleteRoutes = routeLayers.filter((l: any) => l.route.methods.delete)
      expect(deleteRoutes.length).toBeGreaterThan(0)
      for (const layer of deleteRoutes) {
        const middlewares = layer.route.stack.map((s: any) => s.handle)
        const roleGuard = middlewares[1]
        let statusCode: number | null = null
        let nextCalled = false

        roleGuard(
          { user: ORGANIZER_ACTOR } as any,
          {
            status(code: number) {
              statusCode = code
              return this
            },
            json() {
              return this
            },
          } as any,
          () => {
            nextCalled = true
          }
        )

        expect(nextCalled).toBe(false)
        expect(statusCode).toBe(403)
      }
    })
  })

  describe("Rule 3: Lightweight Detail Payload (Last 5 Events & Directory Isolation)", () => {
    it("caps getMemberDetail attendances to latest 5 events while returning lifetime total_attendances", async () => {
      const origDetail = peopleModels.findMemberDetail
      const sevenEvents = Array.from({ length: 7 }).map((_, i) => ({
        id: `att_${i + 1}`,
        method: "qr_scan",
        pointsEarned: 50,
        scannedAt: new Date(`2026-11-${String(20 - i).padStart(2, "0")}T09:00:00Z`),
        event: {
          title: `Event ${i + 1}`,
          eventDate: new Date(`2026-11-${String(20 - i).padStart(2, "0")}T09:00:00Z`),
        },
      }))

      peopleModels.findMemberDetail = async () =>
        makeUserRecord({
          stats: {
            points: 1200,
            totalAttendances: 24,
            lastActivityAt: null,
          },
          attendances: sevenEvents,
        }) as any

      try {
        const detail = await peopleServices.getMemberDetail("usr_target_1", ORGANIZER_ACTOR)
        expect(detail.attendances).toHaveLength(5)
        expect(detail.attendances[0].event_title).toBe("Event 1")
        expect(detail.attendances[4].event_title).toBe("Event 5")
        expect(detail.total_attendances).toBe(24)
        expect(detail.points).toBe(1200)
      } finally {
        peopleModels.findMemberDetail = origDetail
      }
    })

    it("omits detail PII, points, and attendance history from getMembers directory listing", async () => {
      const origCount = peopleModels.count
      const origFindMany = peopleModels.findMany
      const origRoleCounts = peopleModels.countByRole
      const origClaimCounts = peopleModels.countByClaimStatus

      peopleModels.count = async () => 1
      peopleModels.findMany = async () => [makeUserRecord()] as any
      peopleModels.countByRole = async () => [] as any
      peopleModels.countByClaimStatus = async () => [] as any

      try {
        const res = await peopleServices.getMembers({ page: 1, limit: 20 }, ORGANIZER_ACTOR)
        expect(res.items).toHaveLength(1)
        const item = res.items[0] as Record<string, any>
        expect(item.email).toBeUndefined()
        expect(item.phone).toBeUndefined()
        expect(item.birth_date).toBeUndefined()
        expect(item.school).toBeUndefined()
        expect(item.points).toBeUndefined()
        expect(item.attendances).toBeUndefined()
        expect(item.total_attendances).toBeUndefined()
      } finally {
        peopleModels.count = origCount
        peopleModels.findMany = origFindMany
        peopleModels.countByRole = origRoleCounts
        peopleModels.countByClaimStatus = origClaimCounts
      }
    })
  })
})

