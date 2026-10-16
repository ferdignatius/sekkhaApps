import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { DateTimePickerPopover } from "../DateTimePickerPopover"

describe("DateTimePickerPopover", () => {
  it("renders trigger button with formatted display date", () => {
    const handleChange = vi.fn()
    render(
      <DateTimePickerPopover value="2026-07-26T09:00" onChange={handleChange} />
    )

    expect(screen.getByText(/Sun, 26 Jul 2026 · 09:00/i)).toBeDefined()
    expect(screen.getByRole("button", { name: /(change|ubah)/i })).toBeDefined()
  })

  it("opens modal and displays date and time options", () => {
    const handleChange = vi.fn()
    render(
      <DateTimePickerPopover value="2026-07-26T09:00" onChange={handleChange} />
    )

    fireEvent.click(screen.getByRole("button", { name: /(change|ubah)/i }))

    expect(screen.getByText("Set Date & Time")).toBeDefined()
    expect(screen.getByText("Date")).toBeDefined()
    expect(screen.getByText("Time")).toBeDefined()
  })

  it("allows entering a custom time and applying changes", () => {
    const handleChange = vi.fn()
    render(
      <DateTimePickerPopover value="2026-07-26T09:00" onChange={handleChange} />
    )

    fireEvent.click(screen.getByRole("button", { name: /(change|ubah)/i }))

    fireEvent.change(screen.getByLabelText("Event time"), {
      target: { value: "15:00" },
    })

    // Click Apply
    const applyButton = screen.getByRole("button", {
      name: /(apply|terapkan)/i,
    })
    fireEvent.click(applyButton)

    expect(handleChange).toHaveBeenCalledWith("2026-07-26T15:00")
  })
})
