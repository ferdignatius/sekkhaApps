import { describe, it, expect } from "bun:test"
import { isValidGmailEmail, gmailEmailSchema } from "../../../lib/emailValidation"
import {
  RegisterSchema,
  RequestRegisterOtpSchema,
  VerifyRegisterOtpSchema,
  ResendOtpSchema,
  ForgotPasswordRequestSchema,
  ForgotPasswordVerifyOtpSchema,
  ResetPasswordSchema,
  LoginSchema,
} from "../internal/validation"
import { RequestEmailVerificationSchema } from "../../users/controllers"
import { userServices } from "../../users/services"

describe("Gmail Email Validation (Anti-Spam)", () => {
  it("accepts valid @gmail.com emails including dots, +, and whitespace/case normalization", () => {
    expect(isValidGmailEmail("budi@gmail.com")).toBe(true)
    expect(isValidGmailEmail("Budi.Santoso+sekkha@GMAIL.COM")).toBe(true)
    expect(isValidGmailEmail("  a_1-b@gmail.com  ")).toBe(true)
    expect(isValidGmailEmail("a@gmail.com")).toBe(true)

    const parsed = gmailEmailSchema.parse("  Member.Test@GMAIL.com ")
    expect(parsed).toBe("member.test@gmail.com")
  })

  it("rejects non-gmail domains, temp-mail providers, and malformed local-parts", () => {
    const invalidInputs = [
      "",
      "notanemail",
      "user@yahoo.com",
      "user@mailinator.com",
      "user@tempmail.com",
      "admin@sekkha.com",
      "user@gmail.co",
      "user@gmail.com.id",
      "user@sub.gmail.com",
      ".user@gmail.com",
      "user.@gmail.com",
      "user..name@gmail.com",
      "user name@gmail.com",
      "user@@gmail.com",
    ]

    for (const email of invalidInputs) {
      expect(isValidGmailEmail(email)).toBe(false)
      expect(gmailEmailSchema.safeParse(email).success).toBe(false)
    }
  })

  it("enforces @gmail.com across Sign Up, Forgot Password, and Change Email Zod schemas while keeping Login flexible", () => {
    const baseSignUp = {
      password: "securePassword123",
      name: "Budi Santoso",
    }

    expect(
      RequestRegisterOtpSchema.safeParse({ ...baseSignUp, email: "budi@gmail.com" }).success
    ).toBe(true)
    expect(
      RequestRegisterOtpSchema.safeParse({ ...baseSignUp, email: "budi@yahoo.com" }).success
    ).toBe(false)

    expect(
      RegisterSchema.safeParse({ ...baseSignUp, email: "budi@gmail.com" }).success
    ).toBe(true)
    expect(
      RegisterSchema.safeParse({ ...baseSignUp, email: "budi@tempmail.com" }).success
    ).toBe(false)

    expect(
      VerifyRegisterOtpSchema.safeParse({ email: "budi@mailinator.com", otp: "123456" }).success
    ).toBe(false)
    expect(
      ResendOtpSchema.safeParse({ email: "budi@sekkha.com" }).success
    ).toBe(false)

    expect(
      ForgotPasswordRequestSchema.safeParse({ email: "budi@gmail.com" }).success
    ).toBe(true)
    expect(
      ForgotPasswordRequestSchema.safeParse({ email: "budi@yahoo.com" }).success
    ).toBe(false)

    expect(
      ForgotPasswordVerifyOtpSchema.safeParse({ email: "budi@yahoo.com", otp: "123456" }).success
    ).toBe(false)
    expect(
      ResetPasswordSchema.safeParse({
        email: "budi@yahoo.com",
        otp: "123456",
        newPassword: "newPassword123",
      }).success
    ).toBe(false)

    expect(
      RequestEmailVerificationSchema.safeParse({ email: "budi@gmail.com" }).success
    ).toBe(true)
    expect(
      RequestEmailVerificationSchema.safeParse({ email: "budi@outlook.com" }).success
    ).toBe(false)

    // Existing seeded & legacy accounts (e.g. admin@sekkha.com) must still be able to log in
    expect(
      LoginSchema.safeParse({ identifier: "admin@sekkha.com", password: "password123" }).success
    ).toBe(true)
  })

  it("rejects non-gmail target email inside userServices.requestEmailVerification with HTTP 400", async () => {
    let caught: any = null
    try {
      await userServices.requestEmailVerification("usr_test", "spam@mailinator.com")
    } catch (err) {
      caught = err
    }

    expect(caught).toBeDefined()
    expect(caught.statusCode).toBe(400)
  })
})

