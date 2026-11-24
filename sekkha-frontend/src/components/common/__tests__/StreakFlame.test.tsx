import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import { StreakFlame, resolveStreakFlameMeta } from "../StreakFlame"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("StreakFlame", () => {
  it("resolves all 4 tiers and treats paused/inactive/expired as Dead Fire (Level 0)", () => {
    expect(resolveStreakFlameMeta(0, "inactive")).toMatchObject({
      tier: "dead",
      level: 0,
      assetPath: "/streak-pack/streak-dead.json",
    })
    expect(resolveStreakFlameMeta(5, "paused")).toMatchObject({
      tier: "dead",
      level: 0,
      assetPath: "/streak-pack/streak-dead.json",
    })
    expect(resolveStreakFlameMeta(3, "expired")).toMatchObject({
      tier: "dead",
      level: 0,
      assetPath: "/streak-pack/streak-dead.json",
    })
    expect(resolveStreakFlameMeta(1, "active")).toMatchObject({
      tier: "small",
      level: 1,
      assetPath: "/streak-pack/streak-small.json",
    })
    expect(resolveStreakFlameMeta(2, "active")).toMatchObject({
      tier: "medium",
      level: 2,
      assetPath: "/streak-pack/streak-medium.json",
    })
    expect(resolveStreakFlameMeta(3, "active")).toMatchObject({
      tier: "big",
      level: 3,
      assetPath: "/streak-pack/streak-big.json",
    })
  })

  it("mounts animated SVG from public/streak-pack Lottie JSON without falling back to static icon", async () => {
    const bigJsonRaw = readFileSync(
      resolve(process.cwd(), "public/streak-pack/streak-big.json"),
      "utf-8"
    )
    const bigJson = JSON.parse(bigJsonRaw)
    expect(bigJson.layers[0].op).toBeGreaterThanOrEqual(bigJson.op)
    const deadJsonRaw = readFileSync(
      resolve(process.cwd(), "public/streak-pack/streak-dead.json"),
      "utf-8"
    )
    const deadJson = JSON.parse(deadJsonRaw)
    expect(deadJson.op).toBe(1)
    expect(deadJsonRaw).not.toContain('"a":1')

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = typeof input === "string" ? input : input.toString()
        const payload = url.includes("streak-dead.json") ? deadJson : bigJson
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(payload),
        } as Response)
      })

    render(<StreakFlame count={4} status="active" className="h-14 w-10" />)

    const wrapper = screen.getByTestId("streak-flame")
    expect(wrapper.getAttribute("data-streak-tier")).toBe("big")
    expect(wrapper.getAttribute("data-streak-animated")).toBe("timed")
    expect(wrapper.getAttribute("data-streak-asset")).toBe(
      "/streak-pack/streak-big.json"
    )

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/streak-pack/streak-big.json")
      expect(wrapper.querySelector("svg")).not.toBeNull()
    })

    cleanup()

    render(<StreakFlame count={0} status="inactive" className="h-14 w-10" />)

    const deadWrapper = screen.getByTestId("streak-flame")
    expect(deadWrapper.getAttribute("data-streak-tier")).toBe("dead")
    expect(deadWrapper.getAttribute("data-streak-animated")).toBe("false")
    expect(deadWrapper.getAttribute("data-streak-asset")).toBe(
      "/streak-pack/streak-dead.json"
    )

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/streak-pack/streak-dead.json")
      expect(deadWrapper.querySelector("svg")).not.toBeNull()
    })
  })
})
