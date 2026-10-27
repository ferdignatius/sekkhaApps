import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { SecuritySettingsSection } from "../SecuritySettingsSection"
import { userApi } from "../../api/userApi"

vi.mock("../../api/userApi", () => ({
  userApi: {
    requestChangePasswordOtp: vi.fn(),
    changePassword: vi.fn(),
    requestEmailVerification: vi.fn(),
    confirmEmailVerification: vi.fn(),
  },
}))

describe("SecuritySettingsSection - Change Password with OTP", () => {
  const onToast = vi.fn()
  const onLogout = vi.fn()
  const onEmailUpdated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders the 2FA security notice in the change password form", () => {
    render(
      <SecuritySettingsSection
        currentEmail="user@example.com"
        emailVerified={true}
        onEmailUpdated={onEmailUpdated}
        onLogout={onLogout}
        onToast={onToast}
      />
    )

    expect(screen.getByText(/2-Factor Security Protection/i)).toBeDefined()
    expect(screen.getByText(/Continue & Request OTP/i)).toBeDefined()
  })

  it("requests OTP and advances to OTP verification step", async () => {
    vi.mocked(userApi.requestChangePasswordOtp).mockResolvedValueOnce({
      expires_in_seconds: 600,
      resend_after_seconds: 60,
      masked_email: "us***@example.com",
    })

    render(
      <SecuritySettingsSection
        currentEmail="user@example.com"
        emailVerified={true}
        onEmailUpdated={onEmailUpdated}
        onLogout={onLogout}
        onToast={onToast}
      />
    )

    fireEvent.change(screen.getByPlaceholderText("Enter current password"), {
      target: { value: "oldPassword123" },
    })
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
      target: { value: "newPassword123" },
    })
    fireEvent.change(screen.getByPlaceholderText("Re-enter new password"), {
      target: { value: "newPassword123" },
    })

    fireEvent.click(screen.getByText("Continue & Request OTP"))

    await waitFor(() => {
      expect(userApi.requestChangePasswordOtp).toHaveBeenCalledWith("oldPassword123")
      expect(screen.getByText(/Step 2: Enter Verification Code/i)).toBeDefined()
    })
  })

  it("submits 6-digit OTP and completes change password", async () => {
    vi.mocked(userApi.requestChangePasswordOtp).mockResolvedValueOnce({
      expires_in_seconds: 600,
      resend_after_seconds: 60,
      masked_email: "us***@example.com",
    })
    vi.mocked(userApi.changePassword).mockResolvedValueOnce({
      accessToken: "fresh-token-456",
      password_changed_by_user: true,
    })

    render(
      <SecuritySettingsSection
        currentEmail="user@example.com"
        emailVerified={true}
        onEmailUpdated={onEmailUpdated}
        onLogout={onLogout}
        onToast={onToast}
      />
    )

    fireEvent.change(screen.getByPlaceholderText("Enter current password"), {
      target: { value: "oldPassword123" },
    })
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
      target: { value: "newPassword123" },
    })
    fireEvent.change(screen.getByPlaceholderText("Re-enter new password"), {
      target: { value: "newPassword123" },
    })

    fireEvent.click(screen.getByText("Continue & Request OTP"))

    await waitFor(() => {
      expect(screen.getByText(/Step 2: Enter Verification Code/i)).toBeDefined()
    })

    // Type 6 digits into the boxes
    const digitInputs = screen.getAllByRole("textbox")
    expect(digitInputs.length).toBe(6)

    for (let i = 0; i < 6; i++) {
      fireEvent.change(digitInputs[i], { target: { value: String(i + 1) } })
    }

    fireEvent.click(screen.getByText("Confirm & Update Password"))

    await waitFor(() => {
      expect(userApi.changePassword).toHaveBeenCalledWith({
        current_password: "oldPassword123",
        new_password: "newPassword123",
        otp: "123456",
      })
      expect(onToast).toHaveBeenCalledWith(
        expect.stringContaining("Password updated successfully")
      )
    })
  })
})
