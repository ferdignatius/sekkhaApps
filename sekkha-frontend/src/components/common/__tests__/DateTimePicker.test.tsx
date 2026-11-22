import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { ResponsiveFormModal } from "../ResponsiveFormModal"
import { DateTimePicker } from "../DateTimePicker"

beforeEach(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("DateTimePicker (two-pill Date + Time inline picker)", () => {
  it("renders separate Date and Time trigger pills and placeholder when empty", () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <DateTimePicker id="ev-date" value="" onChange={handleChange} />
    )

    expect(screen.getByRole("button", { name: /Select date/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /08:00 WIB/i })).toBeDefined()

    rerender(
      <DateTimePicker
        id="ev-date"
        value="2026-07-26T09:00"
        onChange={handleChange}
      />
    )

    expect(screen.getByRole("button", { name: /Sun, 26 Jul 2026/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /09:00 WIB/i })).toBeDefined()
  })

  it("opens calendar directly on Date click and time controls directly on Time click", () => {
    const handleChange = vi.fn()
    const { container } = render(
      <DateTimePicker
        id="ev-date"
        value="2026-07-26T09:00"
        onChange={handleChange}
      />
    )

    const dateTrigger = screen.getByRole("button", {
      name: /Sun, 26 Jul 2026/i,
    })
    fireEvent.click(dateTrigger)

    expect(dateTrigger.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getAllByRole("button", { name: "Today" })).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Tomorrow" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Next Sun" })).toBeDefined()
    expect(screen.queryByRole("combobox", { name: "Hour" })).toBeNull()

    const timeTrigger = screen.getByRole("button", { name: /09:00 WIB/i })
    fireEvent.click(timeTrigger)

    expect(timeTrigger.getAttribute("aria-expanded")).toBe("true")
    expect(dateTrigger.getAttribute("aria-expanded")).toBe("false")
    expect(container.querySelector('input[type="time"]')).toBeNull()
    expect(screen.getByRole("combobox", { name: "Hour" })).toBeDefined()
    expect(screen.getByRole("combobox", { name: "Minute" })).toBeDefined()
  })

  it("commits quick date & closes, then commits quick time & closes", () => {
    const handleChange = vi.fn()
    render(
      <DateTimePicker
        id="ev-date"
        value="2026-07-26T09:00"
        onChange={handleChange}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Sun, 26 Jul 2026/i }))
    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }))
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("button", { name: "Tomorrow" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /09:00 WIB/i }))
    fireEvent.click(screen.getByRole("button", { name: "19:00" }))
    expect(handleChange).toHaveBeenCalledWith("2026-07-26T19:00")
    expect(screen.queryByRole("combobox", { name: "Hour" })).toBeNull()
  })

  it("renders dynamic recent times when recentTimes prop is supplied and updates on click", () => {
    const handleChange = vi.fn()
    render(
      <DateTimePicker
        id="ev-date"
        value="2026-07-26T09:00"
        onChange={handleChange}
        recentTimes={["18:30", "20:00", "07:30", "18:30", "11:15"]}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /09:00 WIB/i }))

    expect(screen.getByText("Recent times")).toBeDefined()
    expect(screen.getByRole("button", { name: "18:30" })).toBeDefined()
    expect(screen.getByRole("button", { name: "20:00" })).toBeDefined()
    expect(screen.getByRole("button", { name: "07:30" })).toBeDefined()
    expect(screen.queryByRole("button", { name: "11:15" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "18:30" }))
    expect(handleChange).toHaveBeenCalledWith("2026-07-26T18:30")
  })

  it("allows choosing custom hour and minute via Sekkha Select dropdowns", () => {
    const handleChange = vi.fn()
    render(
      <DateTimePicker
        id="ev-date"
        value="2026-07-26T09:17"
        onChange={handleChange}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /09:17 WIB/i }))

    const minuteTrigger = screen.getByRole("combobox", { name: "Minute" })
    expect(minuteTrigger.textContent).toContain("17")

    const hourTrigger = screen.getByRole("combobox", { name: "Hour" })
    fireEvent.click(hourTrigger)
    fireEvent.click(screen.getByRole("option", { name: "15" }))
    expect(handleChange).toHaveBeenCalledWith("2026-07-26T15:17")

    fireEvent.click(minuteTrigger)
    fireEvent.click(screen.getByRole("option", { name: "30" }))
    expect(handleChange).toHaveBeenCalledWith("2026-07-26T09:30")
  })

  it("scrolls Date/Time picker into view inside ResponsiveFormModal without resizing drawer or blurring active input", () => {
    const origInnerWidth = window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    })
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        cb(0)
        return 1
      })

    try {
      render(
        <ResponsiveFormModal open={true} onOpenChange={vi.fn()} title="Create New Event">
          <input aria-label="Event name" />
          <DateTimePicker id="ev-date" value="2026-07-26T09:00" onChange={vi.fn()} />
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

      const dateTrigger = screen.getByRole("button", { name: /Sun, 26 Jul 2026/i })
      const pickerRoot = dateTrigger.closest(".space-y-2") as HTMLElement
      pickerRoot.getBoundingClientRect = () =>
        ({
          top: 480,
          bottom: 830,
          height: 350,
          left: 0,
          right: 390,
          width: 390,
          x: 0,
          y: 480,
          toJSON: () => ({}),
        }) as DOMRect

      const nameInput = screen.getByLabelText("Event name")
      act(() => {
        nameInput.focus()
      })
      expect(document.activeElement).toBe(nameInput)

      act(() => {
        fireEvent.click(dateTrigger)
      })

      const drawerContent = document.querySelector(
        '[data-slot="drawer-content"]'
      ) as HTMLElement
      expect(drawerContent.getAttribute("data-expanded")).toBe("false")
      expect(document.activeElement).toBe(nameInput)
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 142,
        behavior: "smooth",
      })
    } finally {
      rafSpy.mockRestore()
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: origInnerWidth,
      })
    }
  })
})
