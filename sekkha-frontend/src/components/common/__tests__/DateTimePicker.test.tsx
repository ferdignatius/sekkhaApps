import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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

describe("DateTimePicker (inline collapsible + uniform Sekkha controls)", () => {
  it("renders collapsed trigger with formatted date & time and placeholder when empty", () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <DateTimePicker id="ev-date" value="" onChange={handleChange} />
    )

    expect(screen.getByText(/Select Date & Time\.\.\./i)).toBeDefined()
    expect(screen.getByRole("button", { name: /Select Date & Time/i })).toBeDefined()

    rerender(
      <DateTimePicker
        id="ev-date"
        value="2026-07-26T09:00"
        onChange={handleChange}
      />
    )

    expect(screen.getByText(/Sun, 26 Jul 2026 · 09:00 WIB/i)).toBeDefined()
    expect(screen.getByText("Change")).toBeDefined()
  })

  it("expands inline with Date/Time segmented toggle, single Today button, and Sekkha Hour/Minute selects", () => {
    const handleChange = vi.fn()
    const { container } = render(
      <DateTimePicker
        id="ev-date"
        value="2026-07-26T09:00"
        onChange={handleChange}
      />
    )

    const trigger = screen.getByRole("button", {
      name: /Sun, 26 Jul 2026 · 09:00 WIB/i,
    })
    fireEvent.click(trigger)

    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("button", { name: /Date · 26 Jul/i }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /Time · 09:00/i }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getAllByRole("button", { name: "Today" })).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Tomorrow" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Next Sun" })).toBeDefined()

    expect(container.querySelector('input[type="time"]')).toBeNull()
    expect(screen.getByRole("combobox", { name: "Hour" })).toBeDefined()
    expect(screen.getByRole("combobox", { name: "Minute" })).toBeDefined()
  })

  it("auto-switches to Time tab after selecting a date, commits quick preset, and collapses on Done", () => {
    const handleChange = vi.fn()
    render(
      <DateTimePicker
        id="ev-date"
        value="2026-07-26T09:00"
        onChange={handleChange}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: /Sun, 26 Jul 2026 · 09:00 WIB/i })
    )

    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }))
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: /Time · 09:00/i }).getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(screen.getByRole("button", { name: "19:00" }))
    expect(handleChange).toHaveBeenCalledWith("2026-07-26T19:00")

    fireEvent.click(screen.getByRole("button", { name: "Done" }))
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
        defaultOpen
      />
    )

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
        defaultOpen
      />
    )

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
})
