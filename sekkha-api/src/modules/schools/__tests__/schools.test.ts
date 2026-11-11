import { describe, it, expect } from "bun:test"
import { schoolServices } from "../services"
import { schoolModels } from "../models"
import { schoolControllers } from "../controllers"

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

