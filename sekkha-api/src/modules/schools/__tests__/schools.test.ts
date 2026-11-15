import { describe, it, expect } from "bun:test"
import { EventEmitter } from "events"
import { schoolServices } from "../services"
import { schoolModels } from "../models"
import { schoolControllers } from "../controllers"
import { configureSchoolsRouter } from "../routes"
import { redis } from "../../../lib/redis"
import { CacheKeys } from "../../../lib/cache"
import { eventbus, DomainEvents } from "../../../core/eventbus"

function makeSchoolRecord(index: number) {
  return {
    id: `sch_${index}`,
    name: `School ${String(index).padStart(2, "0")}`,
    type: "SMA/SMK",
    status: "active",
    isActive: true,
    requestedBy: null,
    reviewedBy: null,
    reviewNote: null,
    createdAt: new Date("2026-11-01T00:00:00Z"),
    updatedAt: new Date("2026-11-01T00:00:00Z"),
    _count: { profiles: index },
  }
}

describe("Schools Module — Infinite Scroll Pagination", () => {
  it("supports page, limit=5, skip offset, true total count, and has_more in schoolServices.getSchools", async () => {
    const origFind = schoolModels.findSchools
    const origCount = schoolModels.countSchoolsByWhere
    const origBackfill = schoolModels.backfillApprovedSchoolRequesters

    let capturedLimit: number | undefined
    let capturedSkip: number | undefined

    schoolModels.backfillApprovedSchoolRequesters = async () => {}
    schoolModels.countSchoolsByWhere = async () => 12
    schoolModels.findSchools = async (_where, limit, skip) => {
      capturedLimit = limit
      capturedSkip = skip
      return [6, 7, 8, 9, 10].map(makeSchoolRecord) as any
    }

    try {
      const page2 = await schoolServices.getSchools({ page: 2, limit: 5 })
      expect(capturedLimit).toBe(5)
      expect(capturedSkip).toBe(5)
      expect(page2.schools).toHaveLength(5)
      expect(page2.total).toBe(12)
      expect(page2.page).toBe(2)
      expect(page2.limit).toBe(5)
      expect(page2.total_pages).toBe(3)
      expect(page2.has_more).toBe(true)

      schoolModels.findSchools = async () => [11, 12].map(makeSchoolRecord) as any
      const page3 = await schoolServices.getSchools({ page: 3, limit: 5 })
      expect(page3.has_more).toBe(false)
      expect(page3.total).toBe(12)
    } finally {
      schoolModels.findSchools = origFind
      schoolModels.countSchoolsByWhere = origCount
      schoolModels.backfillApprovedSchoolRequesters = origBackfill
    }
  })

  it("returns paginated object in data when paginated=true and preserves array data for legacy callers", async () => {
    const origFind = schoolModels.findSchools
    const origCount = schoolModels.countSchoolsByWhere
    const origBackfill = schoolModels.backfillApprovedSchoolRequesters

    schoolModels.backfillApprovedSchoolRequesters = async () => {}
    schoolModels.countSchoolsByWhere = async () => 8
    schoolModels.findSchools = async () => [1, 2, 3, 4, 5].map(makeSchoolRecord) as any

    const captureRes = () => {
      let body: any
      const res: any = {
        json(payload: any) {
          body = payload
        },
      }
      return { res, getBody: () => body }
    }

    try {
      const paginatedRes = captureRes()
      await schoolControllers.getSchools(
        { query: { page: "1", limit: "5", paginated: "true" } } as any,
        paginatedRes.res,
        (() => {}) as any
      )
      expect(paginatedRes.getBody().data).toEqual(
        expect.objectContaining({
          total: 8,
          page: 1,
          limit: 5,
          total_pages: 2,
          has_more: true,
        })
      )
      expect(paginatedRes.getBody().data.items).toHaveLength(5)

      const legacyRes = captureRes()
      await schoolControllers.getSchools(
        { query: { limit: "5" } } as any,
        legacyRes.res,
        (() => {}) as any
      )
      expect(Array.isArray(legacyRes.getBody().data)).toBe(true)
      expect(legacyRes.getBody().total).toBe(8)
      expect(legacyRes.getBody().pagination.has_more).toBe(true)
    } finally {
      schoolModels.findSchools = origFind
      schoolModels.countSchoolsByWhere = origCount
      schoolModels.backfillApprovedSchoolRequesters = origBackfill
    }
  })
})

describe("Schools Module — Redis Caching, Invalidations & Configure Route Isolation", () => {
  function withRedisMock() {
    const store = new Map<string, { value: string; ttl: number }>()
    const scannedPatterns: string[] = []
    const deletedKeys: string[] = []

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

    return { store, scannedPatterns, deletedKeys, restore }
  }

  it("caches getSchools for 120s via CacheKeys.schoolsList without calling backfillApprovedSchoolRequesters", async () => {
    const origFind = schoolModels.findSchools
    const origCount = schoolModels.countSchoolsByWhere
    const origBackfill = schoolModels.backfillApprovedSchoolRequesters
    const cache = withRedisMock()

    let backfillCalls = 0
    let dbCalls = 0
    schoolModels.backfillApprovedSchoolRequesters = async () => {
      backfillCalls++
    }
    schoolModels.countSchoolsByWhere = async () => {
      dbCalls++
      return 1
    }
    schoolModels.findSchools = async () => [makeSchoolRecord(1)] as any

    try {
      const first = await schoolServices.getSchools({ search: "School", page: 1, limit: 20 })
      const second = await schoolServices.getSchools({ search: "School", page: 1, limit: 20 })

      expect(backfillCalls).toBe(0)
      expect(dbCalls).toBe(1)
      expect(second).toEqual(first)
      const [cachedKey, cachedEntry] = Array.from(cache.store.entries())[0]!
      expect(cachedKey.startsWith("schools:list:")).toBe(true)
      expect(cachedEntry.ttl).toBe(120)
    } finally {
      schoolModels.findSchools = origFind
      schoolModels.countSchoolsByWhere = origCount
      schoolModels.backfillApprovedSchoolRequesters = origBackfill
      cache.restore()
    }
  })

  it("caches getSchoolStats under CacheKeys.schoolStats(school) without class_grade key bloat while echoing class_grade", async () => {
    const origCountProfiles = schoolModels.countProfilesBySchoolName
    const cache = withRedisMock()

    let queryCalls = 0
    schoolModels.countProfilesBySchoolName = async () => {
      queryCalls++
      return 18
    }

    try {
      const resA = await schoolServices.getSchoolStats("SMA Tri Ratna", "11 IPA")
      const resB = await schoolServices.getSchoolStats("SMA Tri Ratna", "12 IPS")

      expect(queryCalls).toBe(1)
      expect(resA).toEqual({
        school: "SMA Tri Ratna",
        class_grade: "11 IPA",
        totalInSchool: 18,
        totalInClass: 0,
      })
      expect(resB).toEqual({
        school: "SMA Tri Ratna",
        class_grade: "12 IPS",
        totalInSchool: 18,
        totalInClass: 0,
      })
      expect(cache.store.has(CacheKeys.schoolStats("SMA Tri Ratna"))).toBe(true)
      expect(cache.store.size).toBe(1)
    } finally {
      schoolModels.countProfilesBySchoolName = origCountProfiles
      cache.restore()
    }
  })

  it("invalidates all dependent caches and emits SCHOOL_UPDATED across approve, reject, create, request, update, and delete", async () => {
    const origFindById = schoolModels.findSchoolById
    const origFindByName = schoolModels.findSchoolByName
    const origApprove = schoolModels.approveSchool
    const origReject = schoolModels.rejectSchool
    const origCreate = schoolModels.createSchool
    const origCreateReq = schoolModels.createSchoolRequest
    const origLink = schoolModels.linkUserProfileToSchool
    const origUpdate = schoolModels.updateSchool
    const origCountById = schoolModels.countProfilesBySchoolId
    const origDelete = schoolModels.deleteSchool
    const origPublish = eventbus.publish

    const cache = withRedisMock()
    const published: Array<{ event: string; payload: any }> = []
    eventbus.publish = (event: string, payload: any) => {
      published.push({ event, payload })
    }

    const expectInvalidatedAll = (expectedAction: string, startScanLen: number) => {
      const recentPatterns = cache.scannedPatterns.slice(startScanLen)
      expect(recentPatterns).toEqual(
        expect.arrayContaining([
          "schools:stats:*",
          "schools:list:*",
          "user:*:profile",
          "user:*:home:*",
          "people:list:*",
          "pengurus:insight:*",
        ])
      )
      expect(published.at(-1)).toEqual({
        event: DomainEvents.SCHOOL_UPDATED,
        payload: expect.objectContaining({ action: expectedAction }),
      })
    }

    try {
      // 1. approveSchoolRequest
      schoolModels.findSchoolById = async () =>
        ({ ...makeSchoolRecord(1), status: "pending", requestedBy: "usr_1" } as any)
      schoolModels.approveSchool = async () => ({ ...makeSchoolRecord(1), status: "active", isActive: true }) as any
      let before = cache.scannedPatterns.length
      await schoolServices.approveSchoolRequest("sch_1", "rev_1")
      expectInvalidatedAll("approve", before)

      // 2. rejectSchoolRequest
      schoolModels.rejectSchool = async () => ({ ...makeSchoolRecord(1), status: "cancel", isActive: false }) as any
      before = cache.scannedPatterns.length
      await schoolServices.rejectSchoolRequest("sch_1", "rev_1")
      expectInvalidatedAll("reject", before)

      // 3. createSchool
      schoolModels.findSchoolByName = async () => null
      schoolModels.createSchool = async () => ({ ...makeSchoolRecord(2), id: "sch_2" }) as any
      before = cache.scannedPatterns.length
      await schoolServices.createSchool({ name: "School 02", type: "SMA/SMK" })
      expectInvalidatedAll("create", before)

      // 4. requestSchool (new & existing)
      schoolModels.createSchoolRequest = async () => ({ ...makeSchoolRecord(3), id: "sch_3", status: "pending" }) as any
      schoolModels.linkUserProfileToSchool = async () => ({ count: 1 }) as any
      before = cache.scannedPatterns.length
      await schoolServices.requestSchool("usr_2", { name: "School 03", type: "Universitas" })
      expectInvalidatedAll("request", before)

      schoolModels.findSchoolByName = async () =>
        ({ ...makeSchoolRecord(4), id: "sch_4", status: "active", _count: { profiles: 7 } }) as any
      before = cache.scannedPatterns.length
      const linkedExisting = await schoolServices.requestSchool("usr_2", { name: "School 04" })
      expect(linkedExisting.userCount).toBe(7)
      expectInvalidatedAll("request_existing", before)

      // 5. updateSchool
      schoolModels.findSchoolById = async () => makeSchoolRecord(1) as any
      schoolModels.findSchoolByName = async () => null
      schoolModels.updateSchool = async () => makeSchoolRecord(1) as any
      before = cache.scannedPatterns.length
      await schoolServices.updateSchool("sch_1", { name: "School 01 Renamed" })
      expectInvalidatedAll("update", before)

      // 6. deleteSchool
      schoolModels.countProfilesBySchoolId = async () => 0
      schoolModels.deleteSchool = async () => makeSchoolRecord(1) as any
      before = cache.scannedPatterns.length
      await schoolServices.deleteSchool("sch_1")
      expectInvalidatedAll("delete", before)
    } finally {
      schoolModels.findSchoolById = origFindById
      schoolModels.findSchoolByName = origFindByName
      schoolModels.approveSchool = origApprove
      schoolModels.rejectSchool = origReject
      schoolModels.createSchool = origCreate
      schoolModels.createSchoolRequest = origCreateReq
      schoolModels.linkUserProfileToSchool = origLink
      schoolModels.updateSchool = origUpdate
      schoolModels.countProfilesBySchoolId = origCountById
      schoolModels.deleteSchool = origDelete
      eventbus.publish = origPublish
      cache.restore()
    }
  })

  it("mounts /api/configure school routes in configureSchoolsRouter with per-route guards only", () => {
    const allLayers = configureSchoolsRouter.stack
    expect(allLayers.length).toBeGreaterThan(0)
    // Every layer must be a concrete route (no router-wide .use() middleware hijacking /api/configure/*)
    expect(allLayers.every((layer: any) => Boolean(layer.route))).toBe(true)

    const paths = allLayers.map((layer: any) => layer.route.path)
    expect(paths).toContain("/schools")
    expect(paths).toContain("/school-requests")
    expect(paths).toContain("/schools/pending")
    expect(paths).toContain("/schools/:id/approve")
    expect(paths).toContain("/schools/:id/reject")
    expect(paths).toContain("/school-requests/:id/accept")
    expect(paths).toContain("/school-requests/:id/reject")
    expect(paths.indexOf("/schools/pending")).toBeLessThan(paths.indexOf("/schools/:id"))
  })
})

