import { describe, it, expect } from "bun:test"
import { peopleServices } from "../services"
import { peopleModels } from "../models"
import { peopleRouter } from "../routes"
import { CreateMemberSchema, SimilarMembersQuerySchema } from "../controllers"

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

  describe("Rule 4: Create Member Pre-Provisioning Defaults & Master Data School", () => {
    it("strips role and date_of_birth from CreateMemberSchema and validates name, school_id, phone", () => {
      const parsed = CreateMemberSchema.parse({
        name: "Budi Santoso",
        school_id: "sch_123",
        phone: "08123456789",
        role: "activist",
        date_of_birth: "2004-05-10",
      }) as Record<string, unknown>

      expect(parsed.name).toBe("Budi Santoso")
      expect(parsed.school_id).toBe("sch_123")
      expect(parsed.phone).toBe("08123456789")
      expect(parsed.role).toBeUndefined()
      expect(parsed.date_of_birth).toBeUndefined()
    })

    it("always defaults pre-provisioned member role to 'member', links active master data school, and omits birthDate", async () => {
      const origFindSchoolById = peopleModels.findSchoolById
      const origFindByUsername = peopleModels.findUserByUsername
      const origCreate = peopleModels.create
      let capturedCreateData: any = null

      peopleModels.findSchoolById = async (id: string) =>
        id === "sch_active_1"
          ? ({ id: "sch_active_1", name: "SMA Tri Ratna", type: "SMA/SMK", status: "active", isActive: true } as any)
          : null
      peopleModels.findUserByUsername = async () => null
      peopleModels.create = async (data: any) => {
        capturedCreateData = data
        return {
          id: "usr_new_1",
          username: data.username,
          role: data.role,
          userNumber: data.userNumber,
          createdAt: new Date("2026-11-11T08:00:00Z"),
          profile: {
            name: data.profile.create.name,
            schoolId: data.profile.create.schoolId,
            school: { id: "sch_active_1", name: "SMA Tri Ratna", status: "active" },
          },
        } as any
      }

      try {
        const created = await peopleServices.createMember(
          {
            name: "Budi Santoso",
            school_id: "sch_active_1",
            phone: "08123456789",
            role: "activist",
            date_of_birth: "2004-05-10",
          } as any,
          ORGANIZER_ACTOR
        )

        expect(created.role).toBe("member")
        expect(created.school_id).toBe("sch_active_1")
        expect(created.school).toBe("SMA Tri Ratna")
        expect(capturedCreateData.role).toBe("member")
        expect(capturedCreateData.profile.create.schoolId).toBe("sch_active_1")
        expect(capturedCreateData.profile.create.birthDate).toBeNull()
      } finally {
        peopleModels.findSchoolById = origFindSchoolById
        peopleModels.findUserByUsername = origFindByUsername
        peopleModels.create = origCreate
      }
    })

    it("rejects createMember when school_id is not found or inactive in master data schools", async () => {
      const origFindSchoolById = peopleModels.findSchoolById
      peopleModels.findSchoolById = async () => null

      try {
        await peopleServices.createMember(
          { name: "Budi Santoso", school_id: "sch_missing" },
          ORGANIZER_ACTOR
        )
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.statusCode).toBe(400)
        expect(err.message).toContain("master data")
      } finally {
        peopleModels.findSchoolById = origFindSchoolById
      }
    })
  })

  describe("Rule 5: Fuzzy Similar Members Lookup & Route Precedence", () => {
    it("ranks fuzzy, typo, and reversed-word matches by descending similarity without exposing PII", async () => {
      const origFindSimilar = (peopleModels as any).findSimilarNameCandidates
      ;(peopleModels as any).findSimilarNameCandidates = async () => [
        {
          id: "usr_1",
          username: "budi1492",
          role: "member",
          userNumber: BigInt(2026110101),
          isClaimed: false,
          email: "encrypted_secret_email",
          profile: {
            name: "Budi Santoso",
            phone: "encrypted_secret_phone",
            school: { name: "SMA Tri Ratna" },
          },
        },
        {
          id: "usr_2",
          username: "santo9911",
          role: "activist",
          userNumber: BigInt(2026110102),
          isClaimed: true,
          profile: {
            name: "Santoso Budi",
            school: { name: "UMN" },
          },
        },
        {
          id: "usr_3",
          username: "budi_santosa",
          role: "member",
          userNumber: BigInt(2026110103),
          isClaimed: true,
          profile: {
            name: "Zyxwvu Unique",
            school: null,
          },
        },
      ]

      try {
        const res = await (peopleServices as any).findSimilarMembers(
          { name: "Budi Santosa", limit: 5 },
          ORGANIZER_ACTOR
        )

        expect(res.items.length).toBe(2)
        expect(res.total).toBe(2)
        expect(res.items[0].name).toBe("Budi Santoso")
        expect(res.items[0].school).toBe("SMA Tri Ratna")
        expect(res.items[0].similarity_score).toBeGreaterThanOrEqual(70)
        // Must match full name only, never leak or match via username when full name differs
        expect(res.items.map((x: any) => x.id)).not.toContain("usr_3")

        // Ensure PII ciphertext is never surfaced in similar candidates
        const first = res.items[0] as Record<string, unknown>
        expect(first.email).toBeUndefined()
        expect(first.phone).toBeUndefined()
        expect(first.birth_date).toBeUndefined()
      } finally {
        ;(peopleModels as any).findSimilarNameCandidates = origFindSimilar
      }
    })

    it("registers GET /similar and /members/similar before /:id routes for organizer/admin", () => {
      const getPaths = peopleRouter.stack
        .filter((l: any) => l.route && l.route.methods.get)
        .map((l: any) => l.route.path)

      const similarIdx = getPaths.indexOf("/similar")
      const membersSimilarIdx = getPaths.indexOf("/members/similar")
      const idIdx = getPaths.indexOf("/:id")
      const membersIdIdx = getPaths.indexOf("/members/:id")

      expect(similarIdx).toBeGreaterThan(-1)
      expect(membersSimilarIdx).toBeGreaterThan(-1)
      expect(similarIdx).toBeLessThan(idIdx)
      expect(membersSimilarIdx).toBeLessThan(membersIdIdx)
    })

    it("enforces hard maximum of 5 similar members in both query schema and service response", async () => {
      const parsedDefault = SimilarMembersQuerySchema.parse({ name: "Budi" })
      expect(parsedDefault.limit).toBe(5)

      const rejectedOverMax = SimilarMembersQuerySchema.safeParse({
        name: "Budi",
        limit: 6,
      })
      expect(rejectedOverMax.success).toBe(false)

      const origFindSimilar = peopleModels.findSimilarNameCandidates
      peopleModels.findSimilarNameCandidates = async () =>
        Array.from({ length: 7 }).map((_, idx) => ({
          id: `usr_budi_${idx + 1}`,
          username: `budi00${idx + 1}`,
          role: "member",
          userNumber: BigInt(2026110100 + idx + 1),
          isClaimed: false,
          profile: {
            name: `Budi Pratama ${idx + 1}`,
            school: null,
          },
        })) as any

      try {
        const res = await peopleServices.findSimilarMembers(
          { name: "Budi Pratama", limit: 20 },
          ORGANIZER_ACTOR
        )
        expect(res.items.length).toBe(5)
        expect(res.total).toBe(5)
      } finally {
        peopleModels.findSimilarNameCandidates = origFindSimilar
      }
    })
  })
})

