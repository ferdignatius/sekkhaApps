import { render, screen } from "@testing-library/react"
import { FeatureSection } from "./FeatureSection"

const makeFeatures = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    title: `Feature ${i + 1}`,
    description: `Description for feature ${i + 1}`,
  }))

describe("FeatureSection", () => {
  it("renders 4 FeatureCards when given 4 features", () => {
    const features = makeFeatures(4)
    render(<FeatureSection features={features} />)

    const cards = screen.getAllByRole("heading", { level: 3 })
    expect(cards).toHaveLength(4)
  })

  it("renders 8 FeatureCards when given 8 features", () => {
    const features = makeFeatures(8)
    render(<FeatureSection features={features} />)

    const cards = screen.getAllByRole("heading", { level: 3 })
    expect(cards).toHaveLength(8)
  })

  it("renders the section title h2", () => {
    render(<FeatureSection features={makeFeatures(4)} />)

    const heading = screen.getByRole("heading", { level: 2 })
    expect(heading).toBeTruthy()
  })

  it("renders each feature title in an h3", () => {
    const features = makeFeatures(4)
    render(<FeatureSection features={features} />)

    features.forEach((feature) => {
      expect(screen.getByText(feature.title)).toBeTruthy()
    })
  })
})
