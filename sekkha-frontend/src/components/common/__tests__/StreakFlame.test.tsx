import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import {
  StreakFlame,
  STREAK_BASE_ASSET_PATH,
  recolorStreakAnimationData,
  resolveStreakFlameMeta,
} from "../StreakFlame"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("StreakFlame", () => {
  it("resolves all 4 tiers using unified streak-big.json and maps dormant/starter/rising/milestone thresholds", () => {
    expect(resolveStreakFlameMeta(0, "inactive")).toMatchObject({
      tier: "dormant",
      level: 0,
      assetPath: STREAK_BASE_ASSET_PATH,
    })
    expect(resolveStreakFlameMeta(5, "paused")).toMatchObject({
      tier: "dormant",
      level: 0,
      assetPath: STREAK_BASE_ASSET_PATH,
    })
    expect(resolveStreakFlameMeta(3, "expired")).toMatchObject({
      tier: "dormant",
      level: 0,
      assetPath: STREAK_BASE_ASSET_PATH,
    })
    expect(resolveStreakFlameMeta(1, "active")).toMatchObject({
      tier: "starter",
      level: 1,
      assetPath: STREAK_BASE_ASSET_PATH,
    })
    expect(resolveStreakFlameMeta(2, "active")).toMatchObject({
      tier: "rising",
      level: 2,
      assetPath: STREAK_BASE_ASSET_PATH,
    })
    expect(resolveStreakFlameMeta(3, "active")).toMatchObject({
      tier: "rising",
      level: 2,
      assetPath: STREAK_BASE_ASSET_PATH,
    })
    expect(resolveStreakFlameMeta(4, "active")).toMatchObject({
      tier: "milestone",
      level: 3,
      assetPath: STREAK_BASE_ASSET_PATH,
    })
  })

  it("dynamically recolors streak-big.json per tier (Gray, Orange-Yellow, Red, Purple) without mutating source", () => {
    const bigJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/streak-pack/streak-big.json"), "utf-8")
    )
    const dormant = recolorStreakAnimationData(bigJson, "dormant")
    const starter = recolorStreakAnimationData(bigJson, "starter")
    const rising = recolorStreakAnimationData(bigJson, "rising")
    const milestone = recolorStreakAnimationData(bigJson, "milestone")

    expect(JSON.stringify(dormant)).not.toBe(JSON.stringify(starter))
    expect(JSON.stringify(starter)).not.toBe(JSON.stringify(rising))
    expect(JSON.stringify(rising)).not.toBe(JSON.stringify(milestone))
  })

  it("mounts animated SVG from /streak-pack/streak-big.json for both milestone and static dormant states", async () => {
    const bigJsonRaw = readFileSync(
      resolve(process.cwd(), "public/streak-pack/streak-big.json"),
      "utf-8"
    )
    const bigJson = JSON.parse(bigJsonRaw)
    expect(bigJson.layers[0].op).toBeGreaterThanOrEqual(bigJson.op)

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(bigJson),
      } as Response)

    render(<StreakFlame count={4} status="active" className="h-14 w-10" />)

    const wrapper = screen.getByTestId("streak-flame")
    expect(wrapper.getAttribute("data-streak-tier")).toBe("milestone")
    expect(wrapper.getAttribute("data-streak-animated")).toBe("timed")
    expect(wrapper.getAttribute("data-streak-milestone")).toBe("true")
    expect(wrapper.getAttribute("data-streak-asset")).toBe(STREAK_BASE_ASSET_PATH)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(STREAK_BASE_ASSET_PATH)
      expect(wrapper.querySelector("svg")).not.toBeNull()
    })

    cleanup()

    render(<StreakFlame count={0} status="inactive" className="h-14 w-10" />)

    const dormantWrapper = screen.getByTestId("streak-flame")
    expect(dormantWrapper.getAttribute("data-streak-tier")).toBe("dormant")
    expect(dormantWrapper.getAttribute("data-streak-animated")).toBe("false")
    expect(dormantWrapper.getAttribute("data-streak-milestone")).toBe("false")
    expect(dormantWrapper.getAttribute("data-streak-asset")).toBe(STREAK_BASE_ASSET_PATH)

    await waitFor(() => {
      expect(dormantWrapper.querySelector("svg")).not.toBeNull()
    })
  })
})
