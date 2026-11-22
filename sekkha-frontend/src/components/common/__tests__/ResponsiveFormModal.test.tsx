import { useRef } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react"
import { ResponsiveFormModal, useResponsiveModalScroll } from "../ResponsiveFormModal"

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
    expect(drawerContent.className).toContain("h-[88dvh]")
    expect(drawerContent.className).toContain("max-h-[88dvh]")
    expect(drawerContent.className).toContain("rounded-t-[28px]")
    expect(drawerContent.className).toContain("transition-[height,max-height,box-shadow]")
    expect(drawerContent.className).toContain("ease-[cubic-bezier(0.32,0.72,0,1)]")

    const scrollContainer = screen.getByTestId("drawer-scroll-container")
    Object.defineProperty(scrollContainer, "scrollTop", {
      writable: true,
      configurable: true,
      value: 48,
    })
    fireEvent.scroll(scrollContainer)

    expect(drawerContent.getAttribute("data-expanded")).toBe("true")
    expect(drawerContent.className).toContain("h-[94dvh]")
    expect(drawerContent.className).toContain("max-h-[94dvh]")
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
    expect(reopenedContent.className).toContain("h-[88dvh]")
    expect(reopenedContent.className).toContain("max-h-[88dvh]")
  })

  it("keeps drawer completely static (no bottom, maxHeight, paddingBottom, or auto-scroll) when focusing inputs", () => {
    render(
      <ResponsiveFormModal open={true} onOpenChange={vi.fn()} title="Edit Event">
        <input aria-label="Event Location" />
      </ResponsiveFormModal>
    )

    const drawerContent = document.querySelector(
      '[data-slot="drawer-content"]'
    ) as HTMLElement
    const scrollContainer = screen.getByTestId("drawer-scroll-container")
    const scrollToSpy = vi.fn()
    scrollContainer.scrollTo = scrollToSpy

    const locInput = screen.getByLabelText("Event Location")
    act(() => {
      locInput.focus()
    })

    expect(drawerContent.getAttribute("data-expanded")).toBe("false")
    expect(drawerContent.style.bottom).toBe("")
    expect(drawerContent.style.maxHeight).toBe("")
    expect(scrollContainer.style.paddingBottom).toBe("")
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  it("does not auto-focus the first input inside mobile drawer when opened", async () => {
    render(
      <ResponsiveFormModal open={true} onOpenChange={vi.fn()} title="All Menus & Features">
        <input aria-label="Search menus and features" />
      </ResponsiveFormModal>
    )

    const searchInput = screen.getByLabelText("Search menus and features")
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(document.activeElement).not.toBe(searchInput)
  })

  it("scrolls inline Calendar/Time panels into view via revealElement without resizing the drawer or blurring active inputs", () => {
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        cb(0)
        return 1
      })

    try {
      function PanelChild() {
        const { revealElement } = useResponsiveModalScroll()
        const panelRef = useRef<HTMLDivElement>(null)
        return (
          <div>
            <input aria-label="Title" />
            <div ref={panelRef} data-testid="inline-panel">
              Inline Calendar
            </div>
            <button
              type="button"
              onClick={() => revealElement(panelRef.current)}
            >
              Open Panel
            </button>
          </div>
        )
      }

      render(
        <ResponsiveFormModal open={true} onOpenChange={vi.fn()} title="Create New Event">
          <PanelChild />
        </ResponsiveFormModal>
      )

      const scrollContainer = screen.getByTestId("drawer-scroll-container")
      const scrollToSpy = vi.fn()
      scrollContainer.scrollTo = scrollToSpy
      Object.defineProperty(scrollContainer, "scrollTop", {
        writable: true,
        configurable: true,
        value: 0,
      })
      scrollContainer.getBoundingClientRect = () =>
        ({
          top: 60,
          bottom: 700,
          height: 640,
          left: 0,
          right: 390,
          width: 390,
          x: 0,
          y: 60,
          toJSON: () => ({}),
        }) as DOMRect

      const panel = screen.getByTestId("inline-panel")
      panel.getBoundingClientRect = () =>
        ({
          top: 520,
          bottom: 840,
          height: 320,
          left: 0,
          right: 390,
          width: 390,
          x: 0,
          y: 520,
          toJSON: () => ({}),
        }) as DOMRect

      const titleInput = screen.getByLabelText("Title")
      act(() => {
        titleInput.focus()
      })
      expect(document.activeElement).toBe(titleInput)

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Open Panel" }))
      })

      // Keeps drawer static (data-expanded stays false) and does not alter input focus
      expect(document.activeElement).toBe(titleInput)
      const drawerContent = document.querySelector(
        '[data-slot="drawer-content"]'
      ) as HTMLElement
      expect(drawerContent.getAttribute("data-expanded")).toBe("false")

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 152,
        behavior: "smooth",
      })
    } finally {
      rafSpy.mockRestore()
    }
  })
})
