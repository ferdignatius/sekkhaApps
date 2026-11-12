import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { LeaderboardSection } from "./LeaderboardSection"
import { landingContent } from "../data/landingContent"

describe("LeaderboardSection", () => {
  it("renders season leaderboard entries using @username without numeric Level subtitles", () => {
    const { container } = render(
      <LeaderboardSection
        heading={landingContent.leaderboard.heading}
        subheading={landingContent.leaderboard.subheading}
        entries={landingContent.leaderboard.entries}
      />
    )

    expect(container.textContent).not.toMatch(/\bLevel \d+/i)
    expect(container.textContent).toMatch(/Season Leaderboard/i)
    expect(screen.getByText("@sari_dewi")).toBeDefined()
    expect(screen.getAllByText(/Vihara Member/i).length).toBe(5)
  })

  it("links View full community leaderboard CTA to /leaderboard (auth-gated)", () => {
    render(
      <LeaderboardSection
        heading={landingContent.leaderboard.heading}
        subheading={landingContent.leaderboard.subheading}
        entries={landingContent.leaderboard.entries}
      />
    )

    const ctaLink = screen.getByRole("link", {
      name: /view full community leaderboard/i,
    }) as HTMLAnchorElement
    expect(ctaLink.getAttribute("href")).toBe("/leaderboard")
  })

  it("standardizes section and leaderboard card width to DESIGN.md 1280px container without narrow 860px override", () => {
    const { container } = render(
      <LeaderboardSection
        heading={landingContent.leaderboard.heading}
        subheading={landingContent.leaderboard.subheading}
        entries={landingContent.leaderboard.entries}
      />
    )

    const outerWrapper = container.querySelector("section > div")
    expect(outerWrapper?.className).toContain("max-w-[1280px]")

    const listContainer = container.querySelector("ol")?.parentElement
    expect(listContainer?.className).not.toContain("max-w-[860px]")
    expect(listContainer?.className).toContain("w-full")
  })
})

