import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { DashboardMockup } from "./DashboardMockup"

describe("DashboardMockup (Sekkha v2.x Workspace Preview)", () => {
  it("excludes eliminated v1 gamification concepts (Level, XP, Streak Shield, Badge Collection)", () => {
    const { container } = render(<DashboardMockup />)
    const text = container.textContent ?? ""

    expect(text).not.toMatch(/\bLv\.\s*\d+/i)
    expect(text).not.toMatch(/\bXP\b/)
    expect(text).not.toMatch(/Weekly Quests/i)
    expect(text).not.toMatch(/Streak Shield/i)
    expect(text).not.toMatch(/Badge Collection/i)
    expect(container.querySelector(".font-roobert")).toBeNull()
  })

  it("renders v2.x Digital Member Quick ID, Weekly Streak, Active Season, Daily Dhamma Wisdom, and @username Top 3", () => {
    render(<DashboardMockup />)

    expect(screen.getByText(/ID 2026111201/i)).toBeDefined()
    expect(screen.getByText(/5 Weeks/i)).toBeDefined()
    expect(screen.getByText(/Vassa Season 2026/i)).toBeDefined()
    expect(screen.getByText(/@sari_dewi/)).toBeDefined()
    expect(screen.getByText(/@budi_santoso/)).toBeDefined()
    expect(screen.getByText(/@mei_ling/)).toBeDefined()
    expect(screen.getByText(/Daily Dhamma Wisdom/i)).toBeDefined()
  })

  it("updates simulated Season Points interactively when toggling attendance or Seva service duties", () => {
    render(<DashboardMockup />)

    expect(screen.getByText(/180 pts/i)).toBeDefined()

    const sevaButton = screen.getByRole("button", {
      name: /MC \/ Host Service Duty/i,
    })
    fireEvent.click(sevaButton)

    expect(screen.getByText(/210 pts/i)).toBeDefined()
    expect(sevaButton.getAttribute("aria-pressed")).toBe("true")
  })
})

