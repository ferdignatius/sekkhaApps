import { describe, it, expect } from "vitest"
import { configureModule } from "../../index"

describe("Configure Module Definition English UI Compliance", () => {
  it("registers configure sections with strictly English labels", () => {
    const sections = configureModule.configureSections
    expect(sections).toBeDefined()
    expect(sections?.length).toBe(2)

    const [masterData, rules] = sections!
    expect(masterData.label).toBe("Master Data")
    expect(rules.label).toBe("Rules")

    const masterItems = masterData.items.map((i) => i.label)
    expect(masterItems).toEqual([
      "Schools Directory",
      "Event Categories",
      "Badge Activity",
    ])

    const ruleItems = rules.items.map((i) => i.label)
    expect(ruleItems).toEqual(["Season Leaderboard", "Point Rules"])
  })

  it("points configure navigation items to valid route paths", () => {
    const sections = configureModule.configureSections!
    const allRoutes = sections.flatMap((s) => s.items.map((i) => i.to))

    expect(allRoutes).toContain("/configure/master/school")
    expect(allRoutes).toContain("/configure/master/event-type")
    expect(allRoutes).toContain("/configure/master/badge-activity")
    expect(allRoutes).toContain("/configure/rules/season")
    expect(allRoutes).toContain("/configure/rules/points")
  })
})
