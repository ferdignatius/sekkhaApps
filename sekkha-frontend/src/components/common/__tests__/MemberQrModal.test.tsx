import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { MemberQrModal } from "../MemberQrModal"

afterEach(() => {
  cleanup()
})

describe("MemberQrModal", () => {
  it("does not render when open is false", () => {
    render(
      <MemberQrModal
        open={false}
        onClose={vi.fn()}
        userNumber="SKH-1234"
        name="Brother Metta"
      />
    )
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("renders modal with header, member id, name, and QR when open is true", () => {
    render(
      <MemberQrModal
        open={true}
        onClose={vi.fn()}
        userNumber="SKH-1234"
        name="Brother Metta"
      />
    )

    expect(screen.getByRole("dialog")).toBeDefined()
    expect(screen.getByText("Check-in QR Code")).toBeDefined()
    expect(
      screen.getByText("Show this code to organizers at the entrance")
    ).toBeDefined()
    expect(screen.getByText("SKH-1234")).toBeDefined()
    expect(screen.getByText("Brother Metta")).toBeDefined()
    expect(screen.getByRole("button", { name: /done/i })).toBeDefined()
  })

  it("calls onClose when the Done button is clicked", () => {
    const handleClose = vi.fn()
    render(
      <MemberQrModal
        open={true}
        onClose={handleClose}
        userNumber="SKH-1234"
        name="Brother Metta"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /done/i }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when the X close button is clicked", () => {
    const handleClose = vi.fn()
    render(
      <MemberQrModal
        open={true}
        onClose={handleClose}
        userNumber="SKH-1234"
        name="Brother Metta"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /close/i }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn()
    render(
      <MemberQrModal
        open={true}
        onClose={handleClose}
        userNumber="SKH-1234"
        name="Brother Metta"
      />
    )

    fireEvent.keyDown(window, { key: "Escape" })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when the presentation backdrop is clicked", () => {
    const handleClose = vi.fn()
    render(
      <MemberQrModal
        open={true}
        onClose={handleClose}
        userNumber="SKH-1234"
        name="Brother Metta"
      />
    )

    const backdrop = screen.getByRole("presentation")
    fireEvent.mouseDown(backdrop)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
