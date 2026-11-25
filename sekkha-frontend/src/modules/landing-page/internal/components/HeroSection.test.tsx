import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { __resetPwaInstallStoreForTest } from "@/hooks/usePwaInstall"
import type { BeforeInstallPromptEvent } from "@/hooks/usePwaInstall"
import { HeroSection } from "./HeroSection"

describe("HeroSection", () => {
  const defaultProps = {
    headline: "Build Better Products Faster",
    subheadline: "The all-in-one platform to manage your projects and teams.",
  }

  // Requirement 3.1 — headline rendered in <h1>
  it("renders the headline in an <h1> element", () => {
    render(<HeroSection {...defaultProps} />)
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeDefined()
    expect(heading.textContent).toBe(defaultProps.headline)
  })

  // Requirement 3.2 — subheadline rendered in a <p>
  it("renders the subheadline text correctly", () => {
    render(<HeroSection {...defaultProps} />)
    const subheadline = screen.getByText(defaultProps.subheadline)
    expect(subheadline).toBeDefined()
    expect(subheadline.tagName.toLowerCase()).toBe("p")
  })

  // Requirement 3.3 — primary CTA button rendered
  it('renders the "Sign In" CTA button', () => {
    render(<HeroSection {...defaultProps} />)
    const primaryCta = screen.getByRole("button", {
      name: /(sign in|join for free|bergabung sekarang)/i,
    })
    expect(primaryCta).toBeDefined()
  })

  // Requirement 3.4 — secondary CTA button rendered
  it('renders the "Explore Events" CTA button', () => {
    render(<HeroSection {...defaultProps} />)
    const secondaryCta = screen.getByRole("button", {
      name: /(explore events|lihat kegiatan)/i,
    })
    expect(secondaryCta).toBeDefined()
  })

  // Both CTA buttons rendered together
  it("renders both CTA buttons", () => {
    render(<HeroSection {...defaultProps} />)
    const signInCta = screen.getByRole("button", {
      name: /(sign in|join for free|bergabung sekarang)/i,
    })
    const exploreCta = screen.getByRole("button", {
      name: /(explore events|lihat kegiatan)/i,
    })
    expect(signInCta).toBeDefined()
    expect(exploreCta).toBeDefined()
  })

  // Headline reflects the prop value passed in
  it("renders the correct headline when a different headline is provided", () => {
    render(
      <HeroSection
        headline="Custom Headline"
        subheadline={defaultProps.subheadline}
      />
    )
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading.textContent).toBe("Custom Headline")
  })

  // Subheadline reflects the prop value passed in
  it("renders the correct subheadline when a different subheadline is provided", () => {
    render(
      <HeroSection
        headline={defaultProps.headline}
        subheadline="Custom subheadline text."
      />
    )
    expect(screen.getByText("Custom subheadline text.")).toBeDefined()
  })
})

describe("HeroSection — Download App (PWA)", () => {
  beforeEach(() => {
    __resetPwaInstallStoreForTest({ deferredPrompt: null, installed: false })
  })

  it('renders "Download App" button and opens InstallAppGuideDialog when native prompt is unavailable', async () => {
    render(
      <HeroSection
        headline="Build Better Products Faster"
        subheadline="The all-in-one platform to manage your projects and teams."
      />
    )
    const downloadBtn = screen.getByRole("button", { name: /Download App/i })
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Install Sekkha on Your Home Screen/i)
      ).toBeDefined()
    })
  })

  it('triggers native beforeinstallprompt when available and updates label to "App Installed"', async () => {
    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const fakeEvent = {
      platforms: ["web"],
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    } as unknown as BeforeInstallPromptEvent

    __resetPwaInstallStoreForTest({
      deferredPrompt: fakeEvent,
      installed: false,
    })

    render(
      <HeroSection
        headline="Build Better Products Faster"
        subheadline="The all-in-one platform to manage your projects and teams."
      />
    )
    const downloadBtn = screen.getByRole("button", { name: /Download App/i })
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalledTimes(1)
      expect(screen.getByRole("button", { name: /App Installed/i })).toBeDefined()
    })
  })
})
