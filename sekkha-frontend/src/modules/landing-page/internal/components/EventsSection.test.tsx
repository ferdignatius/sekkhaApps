import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { EventsSection } from "./EventsSection"
import { landingContent } from "../data/landingContent"

describe("EventsSection", () => {
  it("renders dummy evergreen events with no stale June/July 2026 dates", () => {
    const { container } = render(
      <EventsSection
        heading={landingContent.events.heading}
        subheading={landingContent.events.subheading}
        items={landingContent.events.items}
      />
    )

    expect(container.textContent).not.toMatch(/Jun \d{1,2}, 2026|Jul \d{1,2}, 2026/i)
    expect(screen.getAllByRole("article").length).toBe(4)
  })

  it("filters events by category locally with >= 44px touch targets", () => {
    render(
      <EventsSection
        heading={landingContent.events.heading}
        subheading={landingContent.events.subheading}
        items={landingContent.events.items}
      />
    )

    const fellowshipBtn = screen.getByRole("button", { name: /Fellowship & Puja/i })
    expect(fellowshipBtn.className).toContain("min-h-[44px]")

    fireEvent.click(fellowshipBtn)
    expect(screen.getAllByRole("article").length).toBe(1)
  })

  it("links View all upcoming events CTA directly to /events (auth-gated)", () => {
    render(
      <EventsSection
        heading={landingContent.events.heading}
        subheading={landingContent.events.subheading}
        items={landingContent.events.items}
      />
    )

    const ctaLink = screen.getByRole("link", {
      name: /view all upcoming events/i,
    }) as HTMLAnchorElement
    expect(ctaLink.getAttribute("href")).toBe("/events")
  })
})

