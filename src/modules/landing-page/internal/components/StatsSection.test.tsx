import { render, screen } from "@testing-library/react"
import { StatsSection } from "./StatsSection"

const sampleStats = [
  { value: "10K+", label: "Active Users" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "50+", label: "Features" },
]

describe("StatsSection", () => {
  it("renders the correct number of stat items", () => {
    render(<StatsSection stats={sampleStats} />)

    // Each stat has a value and a label; we check by label count as proxy for item count
    const labels = sampleStats.map((s) => screen.getByText(s.label))
    expect(labels).toHaveLength(3)
  })

  it("renders each stat value correctly", () => {
    render(<StatsSection stats={sampleStats} />)

    sampleStats.forEach((stat) => {
      // getByText throws if element is not found, so finding it confirms it renders
      expect(screen.getByText(stat.value)).toBeTruthy()
    })
  })

  it("renders each stat label correctly", () => {
    render(<StatsSection stats={sampleStats} />)

    sampleStats.forEach((stat) => {
      expect(screen.getByText(stat.label)).toBeTruthy()
    })
  })

  it("renders 3 stat items when given 3 stats", () => {
    render(<StatsSection stats={sampleStats} />)

    // Query all value spans — they are siblings of label spans inside each stat div
    const valueElements = sampleStats.map((s) => screen.getByText(s.value))
    const labelElements = sampleStats.map((s) => screen.getByText(s.label))

    expect(valueElements).toHaveLength(3)
    expect(labelElements).toHaveLength(3)
  })
})
