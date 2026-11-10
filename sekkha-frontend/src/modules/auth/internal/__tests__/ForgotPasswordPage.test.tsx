import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { ForgotPasswordPage } from "../components/ForgotPasswordPage"
import { api } from "@/lib/api"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}))

describe("ForgotPasswordPage — Strict @gmail.com Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("blocks non-@gmail.com and malformed emails client-side before sending recovery OTP", () => {
    render(<ForgotPasswordPage />)

    const emailInput = screen.getByLabelText(/Your Account Email/i)
    const submitBtn = screen.getByRole("button", { name: /Send Reset Code/i })

    for (const invalidEmail of [
      "user@yahoo.com",
      "spam@mailinator.com",
      "user..name@gmail.com",
      "user@gmail.co",
    ]) {
      fireEvent.change(emailInput, { target: { value: invalidEmail } })
      fireEvent.click(submitBtn)

      expect(screen.getByText(/Please use a valid @gmail\.com email address/i)).toBeDefined()
      expect(api.post).not.toHaveBeenCalled()
    }
  })

  it("accepts normalized @gmail.com address and calls /auth/forgot-password/request", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      success: true,
      message: "Recovery code sent",
    })

    render(<ForgotPasswordPage />)

    const emailInput = screen.getByLabelText(/Your Account Email/i)
    fireEvent.change(emailInput, { target: { value: "  Member.One@GMAIL.com  " } })
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Code/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/forgot-password/request", {
        email: "member.one@gmail.com",
      })
    })
  })
})

