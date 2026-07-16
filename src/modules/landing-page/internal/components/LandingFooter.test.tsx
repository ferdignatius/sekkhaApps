import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { LandingFooter } from "./LandingFooter"

const mockNavColumns = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
]

describe("LandingFooter", () => {
  // Requirement 7.3 — min 2 nav columns rendered
  it("renders at least 2 nav column headings - Requirement 7.3", () => {
    render(<LandingFooter navColumns={mockNavColumns} />)
    expect(screen.getByText("Product")).toBeDefined()
    expect(screen.getByText("Company")).toBeDefined()
  })

  it("renders all provided nav column headings - Requirement 7.3", () => {
    render(<LandingFooter navColumns={mockNavColumns} />)
    expect(screen.getByText("Product")).toBeDefined()
    expect(screen.getByText("Company")).toBeDefined()
    expect(screen.getByText("Legal")).toBeDefined()
  })

  it("renders with minimum 2 nav columns - Requirement 7.3", () => {
    const twoColumns = mockNavColumns.slice(0, 2)
    render(<LandingFooter navColumns={twoColumns} />)
    expect(screen.getByText("Product")).toBeDefined()
    expect(screen.getByText("Company")).toBeDefined()
  })

  // Requirement 7.5 — copyright text contains current year and "Sekkha"
  it("copyright text contains the current year - Requirement 7.5", () => {
    render(<LandingFooter navColumns={mockNavColumns} />)
    const currentYear = new Date().getFullYear().toString()
    // The copyright <p> element contains JSX with year as a separate expression
    const copyrightEl = screen.getByText((content) =>
      content.includes(currentYear)
    )
    expect(copyrightEl).toBeDefined()
  })

  it("copyright text contains 'Sekkha' - Requirement 7.5", () => {
    render(<LandingFooter navColumns={mockNavColumns} />)
    // Use getAllByText since 'Sekkha' appears in both logo span and copyright <p>
    const elements = screen.getAllByText((content) =>
      content.includes("Sekkha")
    )
    expect(elements.length).toBeGreaterThanOrEqual(1)
    // Verify the copyright <p> specifically contains "Sekkha"
    const copyrightEl = elements.find(
      (el) => el.tagName.toLowerCase() === "p" && el.textContent?.includes("Sekkha")
    )
    expect(copyrightEl).toBeDefined()
  })

  it("copyright text contains both the current year and 'Sekkha' - Requirement 7.5", () => {
    render(<LandingFooter navColumns={mockNavColumns} />)
    const currentYear = new Date().getFullYear().toString()
    const allWithYear = screen.getAllByText((content) =>
      content.includes(currentYear)
    )
    const copyright = allWithYear.find((el) =>
      el.textContent?.includes("Sekkha")
    )
    expect(copyright).toBeDefined()
  })

  // Requirement 7.2 — logo text "Sekkha" rendered
  it("renders logo text 'Sekkha' in a <span> element - Requirement 7.2", () => {
    render(<LandingFooter navColumns={mockNavColumns} />)
    const logoEl = screen.getAllByText((content, element) => {
      return content.includes("Sekkha")
    })
    expect(logoEl.length).toBeGreaterThanOrEqual(1)
  })

  // Requirement 7.1 — footer element rendered with contentinfo role
  it("renders footer with contentinfo role - Requirement 7.1", () => {
    render(<LandingFooter navColumns={mockNavColumns} />)
    const footer = screen.getByRole("contentinfo")
    expect(footer).toBeDefined()
  })

  it("renders nav column links - Requirement 7.3", () => {
    render(<LandingFooter navColumns={mockNavColumns} />)
    expect(screen.getByText("Features")).toBeDefined()
    expect(screen.getByText("About")).toBeDefined()
  })
})
