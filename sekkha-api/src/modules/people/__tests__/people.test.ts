import { describe, it, expect } from "bun:test"
import { EventEmitter } from "events"
import { peopleServices, generateWhatsAppInviteMessage } from "../services"
import { peopleModels } from "../models"
import { peopleRouter } from "../routes"
import { CreateMemberSchema, ListMembersQuerySchema, SimilarMembersQuerySchema } from "../controllers"
import { redis } from "../../../lib/redis"
import { CacheKeys } from "../../../lib/cache"
import { eventbus, DomainEvents } from "../../../core/eventbus"
import {
  saveRefreshToken,
  verifyAndRotateRefreshTokenRecord,
} from "../../auth"

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
      schoolId: null,
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
          { name: "Renamed Admin" },
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
    it("strips role, phone, and date_of_birth from CreateMemberSchema and validates name, school_id", () => {
      const parsed = CreateMemberSchema.parse({
        name: "Budi Santoso",
        school_id: "sch_123",
        phone: "08123456789",
        role: "activist",
        date_of_birth: "2004-05-10",
      }) as Record<string, unknown>

      expect(parsed.name).toBe("Budi Santoso")
      expect(parsed.school_id).toBe("sch_123")
      expect(parsed.phone).toBeUndefined()
      expect(parsed.role).toBeUndefined()
      expect(parsed.date_of_birth).toBeUndefined()
    })

    it("always defaults pre-provisioned member role to 'member' and links active master data school without phone or birthDate", async () => {
      const origFindSchoolById = peopleModels.findSchoolById
      const origFindByUsername = peopleModels.findUserByUsername
      const origCreate = peopleModels.create
      const origGenerateUserNumber = peopleModels.generateUserNumber
      let capturedCreateData: any = null

      peopleModels.generateUserNumber = async () => 2026111101n

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
            role: "activist",
          } as any,
          ORGANIZER_ACTOR
        )

        expect(created.role).toBe("member")
        expect(created.school_id).toBe("sch_active_1")
        expect(created.school).toBe("SMA Tri Ratna")
        expect(capturedCreateData.role).toBe("member")
        expect(capturedCreateData.profile.create.schoolId).toBe("sch_active_1")
        expect(capturedCreateData.profile.create.phone).toBeUndefined()
        expect(capturedCreateData.profile.create.birthDate).toBeUndefined()
      } finally {
        peopleModels.findSchoolById = origFindSchoolById
        peopleModels.findUserByUsername = origFindByUsername
        peopleModels.create = origCreate
        peopleModels.generateUserNumber = origGenerateUserNumber
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

  describe("Rule 6: Session Revocation, Duplicate Email 409, Cache & EventBus", () => {
    function withRedisCacheCapture() {
      const store = new Map<string, { value: string; ttl: number }>()
      const deletedKeys: string[] = []
      const scannedPatterns: string[] = []

      const origGetDesc = Object.getOwnPropertyDescriptor(redis, "get")
      const origSetDesc = Object.getOwnPropertyDescriptor(redis, "set")
      const origDelDesc = Object.getOwnPropertyDescriptor(redis, "del")
      const origScanDesc = Object.getOwnPropertyDescriptor(redis, "scanStream")

      ;(redis as any).get = async (key: string) => store.get(key)?.value ?? null
      ;(redis as any).set = async (key: string, val: string, _mode: string, ttl: number) => {
        store.set(key, { value: val, ttl })
        return "OK"
      }
      ;(redis as any).del = async (...keys: string[]) => {
        for (const k of keys) {
          store.delete(k)
          deletedKeys.push(k)
        }
        return keys.length
      }
      ;(redis as any).scanStream = ({ match }: { match: string }) => {
        scannedPatterns.push(match)
        const emitter = new EventEmitter()
        queueMicrotask(() => {
          const prefix = match.replace(/\*$/, "")
          const matched = Array.from(store.keys()).filter((k) => k.startsWith(prefix))
          if (matched.length > 0) emitter.emit("data", matched)
          emitter.emit("end")
        })
        return emitter
      }

      const restore = () => {
        const restoreProp = (prop: string, desc: PropertyDescriptor | undefined) => {
          if (desc) Object.defineProperty(redis, prop, desc)
          else delete (redis as any)[prop]
        }
        restoreProp("get", origGetDesc)
        restoreProp("set", origSetDesc)
        restoreProp("del", origDelDesc)
        restoreProp("scanStream", origScanDesc)
      }

      return { store, deletedKeys, scannedPatterns, restore }
    }

    it("revokes refresh tokens, sets passwordChangedAt, invalidates caches, and emits USER_UPDATED on role change", async () => {
      const origFind = peopleModels.findUserWithProfile
      const origTx = peopleModels.transaction
      const origPublish = eventbus.publish
      const cache = withRedisCacheCapture()
      cache.store.set("people:list:test", { value: "{}", ttl: 30 })
      cache.store.set("leaderboard:points:s1", { value: "{}", ttl: 60 })
      cache.store.set("pengurus:insight:2026", { value: "{}", ttl: 120 })
      cache.store.set("schools:stats:sma", { value: "{}", ttl: 300 })
      cache.store.set("schools:list:all", { value: "{}", ttl: 120 })

      let capturedUserUpdate: any = null
      const publishedEvents: Array<{ event: string; payload: any }> = []
      eventbus.publish = (event: string, payload: any) => {
        publishedEvents.push({ event, payload })
      }

      await saveRefreshToken("usr_target_1", "refresh_tok_role_change", 120)

      peopleModels.findUserWithProfile = async () => makeUserRecord({ role: "member" }) as any
      peopleModels.transaction = async (fn: any) => {
        const txMock = {
          user: {
            update: async ({ data }: any) => {
              capturedUserUpdate = data
              return {
                ...makeUserRecord(),
                role: data.role ?? "member",
              }
            },
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
        await peopleServices.updateMember("usr_target_1", { role: "activist" }, ADMIN_ACTOR)
        expect(capturedUserUpdate.role).toBe("activist")
        expect(capturedUserUpdate.passwordChangedAt).toBeInstanceOf(Date)
        expect(await verifyAndRotateRefreshTokenRecord("refresh_tok_role_change")).toBeNull()
        expect(cache.scannedPatterns).toContain("people:list:*")
        expect(cache.scannedPatterns).toContain("leaderboard:*")
        expect(cache.scannedPatterns).toContain("pengurus:insight:*")
        expect(cache.scannedPatterns).toContain("schools:stats:*")
        expect(cache.scannedPatterns).toContain("schools:list:*")
        expect(cache.deletedKeys).toContain(CacheKeys.userProfile("usr_target_1"))
        expect(publishedEvents).toEqual([
          { event: DomainEvents.USER_UPDATED, payload: { userId: "usr_target_1", fields: ["role"] } },
        ])
      } finally {
        peopleModels.findUserWithProfile = origFind
        peopleModels.transaction = origTx
        eventbus.publish = origPublish
        cache.restore()
      }
    })

    it("revokes refresh tokens and emits USER_UPDATED on resetTemporaryPassword", async () => {
      const origFind = peopleModels.findUserWithProfile
      const origUpdate = peopleModels.update
      const origPublish = eventbus.publish
      const cache = withRedisCacheCapture()

      const publishedEvents: Array<{ event: string; payload: any }> = []
      eventbus.publish = (event: string, payload: any) => {
        publishedEvents.push({ event, payload })
      }

      await saveRefreshToken("usr_target_1", "refresh_tok_temp_reset", 120)
      peopleModels.findUserWithProfile = async () =>
        makeUserRecord({ isClaimed: false, passwordChangedByUser: false, role: "member" }) as any
      peopleModels.update = async () => ({}) as any

      try {
        await peopleServices.resetTemporaryPassword("usr_target_1", ORGANIZER_ACTOR)
        expect(await verifyAndRotateRefreshTokenRecord("refresh_tok_temp_reset")).toBeNull()
        expect(cache.scannedPatterns).toContain("people:list:*")
        expect(publishedEvents).toEqual([
          {
            event: DomainEvents.USER_UPDATED,
            payload: { userId: "usr_target_1", fields: ["password"] },
          },
        ])
      } finally {
        peopleModels.findUserWithProfile = origFind
        peopleModels.update = origUpdate
        eventbus.publish = origPublish
        cache.restore()
      }
    })

    it("revokes refresh tokens, invalidates downstream caches, and emits USER_DELETED on deleteMember", async () => {
      const origFind = peopleModels.findUserById
      const origDelete = peopleModels.delete
      const origPublish = eventbus.publish
      const cache = withRedisCacheCapture()

      const publishedEvents: Array<{ event: string; payload: any }> = []
      eventbus.publish = (event: string, payload: any) => {
        publishedEvents.push({ event, payload })
      }

      await saveRefreshToken("usr_target_1", "refresh_tok_delete", 120)
      peopleModels.findUserById = async () => makeUserRecord({ role: "member" }) as any
      peopleModels.delete = async () => ({}) as any

      try {
        const res = await peopleServices.deleteMember("usr_target_1", ADMIN_ACTOR)
        expect(res.success).toBe(true)
        expect(await verifyAndRotateRefreshTokenRecord("refresh_tok_delete")).toBeNull()
        expect(cache.scannedPatterns).toEqual(
          expect.arrayContaining([
            "people:list:*",
            "leaderboard:*",
            "pengurus:insight:*",
            "schools:stats:*",
            "schools:list:*",
            "user:usr_target_1:home:*",
          ])
        )
        expect(publishedEvents).toEqual([
          {
            event: DomainEvents.USER_DELETED,
            payload: { userId: "usr_target_1", reason: "admin_delete" },
          },
        ])
      } finally {
        peopleModels.findUserById = origFind
        peopleModels.delete = origDelete
        eventbus.publish = origPublish
        cache.restore()
      }
    })

    it("returns 409 EMAIL_ALREADY_EXISTS on duplicate email pre-check and P2002 race", async () => {
      const origFindByEmail = peopleModels.findUserByEmailBindex
      const origFindByUsername = peopleModels.findUserByUsername
      const origGenNum = peopleModels.generateUserNumber
      const origCreate = peopleModels.create

      peopleModels.findUserByUsername = async () => null
      peopleModels.generateUserNumber = async () => 2026111501n

      try {
        // 1. Pre-check via findUserByEmailBindex
        peopleModels.findUserByEmailBindex = async () => ({ id: "usr_dup" }) as any
        try {
          await peopleServices.createMember(
            { name: "Dup User", email: "Dup@Example.com" },
            ORGANIZER_ACTOR
          )
          expect(true).toBe(false)
        } catch (err: any) {
          expect(err.status).toBe(409)
          expect(err.code).toBe("EMAIL_ALREADY_EXISTS")
        }

        // 2. Concurrent P2002 fallback on email_bindex
        let createAttempts = 0
        peopleModels.findUserByEmailBindex = async () => null
        peopleModels.create = async () => {
          createAttempts++
          const p2002: any = new Error("Unique constraint failed")
          p2002.code = "P2002"
          p2002.meta = { target: ["email_bindex"] }
          throw p2002
        }

        try {
          await peopleServices.createMember(
            { name: "Race User", email: "race@example.com" },
            ORGANIZER_ACTOR
          )
          expect(true).toBe(false)
        } catch (err: any) {
          expect(createAttempts).toBe(1)
          expect(err.status).toBe(409)
          expect(err.code).toBe("EMAIL_ALREADY_EXISTS")
        }
      } finally {
        peopleModels.findUserByEmailBindex = origFindByEmail
        peopleModels.findUserByUsername = origFindByUsername
        peopleModels.generateUserNumber = origGenNum
        peopleModels.create = origCreate
      }
    })

    it("returns 409 USER_NUMBER_CONFLICT after exhausting userNumber retries and uses English invite + 100 limit cap", async () => {
      const origFindByUsername = peopleModels.findUserByUsername
      const origGenNum = peopleModels.generateUserNumber
      const origCreate = peopleModels.create

      peopleModels.findUserByUsername = async () => null
      peopleModels.generateUserNumber = async () => 2026111599n
      peopleModels.create = async () => {
        const p2002: any = new Error("Unique constraint failed")
        p2002.code = "P2002"
        p2002.meta = { target: ["user_number"] }
        throw p2002
      }

      try {
        await peopleServices.createMember({ name: "Collision Member" }, ORGANIZER_ACTOR)
        expect(true).toBe(false)
      } catch (err: any) {
        expect(err.status).toBe(409)
        expect(err.code).toBe("USER_NUMBER_CONFLICT")
      } finally {
        peopleModels.findUserByUsername = origFindByUsername
        peopleModels.generateUserNumber = origGenNum
        peopleModels.create = origCreate
      }

      const invite = generateWhatsAppInviteMessage({
        name: "Sari",
        userNumber: 2026111501,
        username: "sari1234",
        tempPassword: "sekkha12345puggala",
      })
      expect(invite).toContain("Your Sekkha Apps account has been created")
      expect(invite).not.toContain("Akun Sekkha Apps Anda")

      expect(ListMembersQuerySchema.safeParse({ limit: 100 }).success).toBe(true)
      expect(ListMembersQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
    })

    it("caches getMembers directory reads in Redis with 30s TTL via CacheKeys.peopleDirectory", async () => {
      const origCount = peopleModels.count
      const origFindMany = peopleModels.findMany
      const origRoleCounts = peopleModels.countByRole
      const origClaimCounts = peopleModels.countByClaimStatus
      const cache = withRedisCacheCapture()

      let dbCalls = 0
      peopleModels.count = async () => {
        dbCalls++
        return 1
      }
      peopleModels.findMany = async () => [makeUserRecord()] as any
      peopleModels.countByRole = async () => [] as any
      peopleModels.countByClaimStatus = async () => [] as any

      try {
        const first = await peopleServices.getMembers({ page: 1, limit: 20 }, ORGANIZER_ACTOR)
        const second = await peopleServices.getMembers({ page: 1, limit: 20 }, ORGANIZER_ACTOR)

        expect(dbCalls).toBe(1)
        expect(second).toEqual(first)
        const stored = Array.from(cache.store.entries())[0]
        expect(stored?.[0].startsWith("people:list:")).toBe(true)
        expect(stored?.[1].ttl).toBe(30)
      } finally {
        peopleModels.count = origCount
        peopleModels.findMany = origFindMany
        peopleModels.countByRole = origRoleCounts
        peopleModels.countByClaimStatus = origClaimCounts
        cache.restore()
      }
    })
  })
})

