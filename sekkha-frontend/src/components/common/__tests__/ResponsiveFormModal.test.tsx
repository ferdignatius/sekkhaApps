import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ResponsiveFormModal } from "../ResponsiveFormModal"

describe("ResponsiveFormModal mobile drawer scroll-to-expand behavior", () => {
  const originalInnerWidth = window.innerWidth
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    })
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it("starts at max-h-[88vh], expands to h-dvh/max-h-dvh on scrollTop > 0, stays expanded at scrollTop === 0, and resets after closing", () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <ResponsiveFormModal
        open={true}
        onOpenChange={onOpenChange}
        title="Create New Event"
        description="Fill in the form to create a new event."
      >
        <div style={{ height: 1200 }}>Long form content</div>
      </ResponsiveFormModal>
    )

    const drawerContent = document.querySelector(
      '[data-slot="drawer-content"]'
    ) as HTMLElement
    expect(drawerContent).toBeTruthy()
    expect(drawerContent.getAttribute("data-expanded")).toBe("false")
    expect(drawerContent.className).toContain("max-h-[88dvh]")
    expect(drawerContent.className).toContain("rounded-t-[28px]")
    expect(drawerContent.className).toContain("transition-[transform,max-height,box-shadow]")
    expect(drawerContent.className).toContain("ease-[cubic-bezier(0.32,0.72,0,1)]")

    const scrollContainer = screen.getByTestId("drawer-scroll-container")
    Object.defineProperty(scrollContainer, "scrollTop", {
      writable: true,
      configurable: true,
      value: 48,
    })
    fireEvent.scroll(scrollContainer)

    expect(drawerContent.getAttribute("data-expanded")).toBe("true")
    expect(drawerContent.className).toContain("max-h-[100dvh]")
    expect(drawerContent.className).toContain("rounded-t-[28px]")

    // Scrolling back to top (scrollTop === 0) keeps drawer expanded until closed
    Object.defineProperty(scrollContainer, "scrollTop", {
      writable: true,
      configurable: true,
      value: 0,
    })
    fireEvent.scroll(scrollContainer)
    expect(drawerContent.getAttribute("data-expanded")).toBe("true")

    // Closing and reopening resets expansion back to initial 88vh state
    rerender(
      <ResponsiveFormModal
        open={false}
        onOpenChange={onOpenChange}
        title="Create New Event"
        description="Fill in the form to create a new event."
      >
        <div style={{ height: 1200 }}>Long form content</div>
      </ResponsiveFormModal>
    )
    rerender(
      <ResponsiveFormModal
        open={true}
        onOpenChange={onOpenChange}
        title="Create New Event"
        description="Fill in the form to create a new event."
      >
        <div style={{ height: 1200 }}>Long form content</div>
      </ResponsiveFormModal>
    )

    const reopenedContent = document.querySelector(
      '[data-slot="drawer-content"]'
    ) as HTMLElement
    expect(reopenedContent.getAttribute("data-expanded")).toBe("false")
    expect(reopenedContent.className).toContain("max-h-[88dvh]")
  })
})
