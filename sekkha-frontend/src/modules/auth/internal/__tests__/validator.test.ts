// Feature: auth-flow
// Form validation tests — Sign Up (@gmail.com strict validation) and Login form rules.

import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

import { validateSignUpForm, validateLoginForm } from "../utils/validator"
import { isValidGmailEmail } from "@/lib/emailValidation"

const gmailLocalArb = fc
  .array(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyz0123456789".split("")
    ),
    { minLength: 1, maxLength: 16 }
  )
  .map((chars) => chars.join(""))

const validGmailArb = fc
  .tuple(gmailLocalArb, fc.option(gmailLocalArb, { nil: undefined }))
  .map(([a, b]) => (b ? `${a}.${b}@gmail.com` : `${a}@gmail.com`))

describe("validateSignUpForm — Property 1: Validator Mengembalikan Error yang Akurat untuk Semua Kombinasi Input", () => {
  it("returns isValid === true only if email is a valid @gmail.com address, password >= 8 char, and confirmPassword === password", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.oneof(fc.string(), validGmailArb),
          password: fc.string(),
          confirmPassword: fc.string(),
        }),
        ({ email, password, confirmPassword }) => {
          const result = validateSignUpForm({
            email,
            password,
            confirmPassword,
          })

          const emailValid = isValidGmailEmail(email)
          const passwordValid = password.length >= 8
          const confirmValid = confirmPassword === password

          expect(result.isValid).toBe(emailValid && passwordValid && confirmValid)
        }
      ),
      { numRuns: 100 }
    )
  })

  it("rejects non-@gmail.com domains and malformed local-parts during Sign Up", () => {
    const invalidEmails = [
      "user@yahoo.com",
      "user@example.com",
      "user@mailinator.com",
      "user@gmail.co",
      ".user@gmail.com",
      "user.@gmail.com",
      "user..name@gmail.com",
      "a@b.c",
    ]

    for (const email of invalidEmails) {
      const result = validateSignUpForm({
        email,
        password: "validPassword123",
        confirmPassword: "validPassword123",
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.field === "email")).toBe(true)
    }
  })

  it("keeps Login validation flexible for existing non-gmail accounts such as admin@sekkha.com", () => {
    const result = validateLoginForm({
      identifier: "admin@sekkha.com",
      password: "password123",
    })
    expect(result.isValid).toBe(true)
  })
})

describe("validateSignUpForm — Property 2: Validator Menghapus Error Tepat Saat Field Menjadi Valid", () => {
  it("if only confirmPassword is invalid, error only appears for confirmPassword; email and password have no errors", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: validGmailArb,
          password: fc.string({ minLength: 8 }),
          confirmPassword: fc.string(),
        }),
        ({ email, password, confirmPassword }) => {
          if (confirmPassword === password) return

          const result = validateSignUpForm({
            email,
            password,
            confirmPassword,
          })

          expect(result.errors.find((e) => e.field === "email")).toBeUndefined()
          expect(result.errors.find((e) => e.field === "password")).toBeUndefined()
          expect(result.errors.find((e) => e.field === "confirmPassword")).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it("fixing confirmPassword to match password -> confirmPassword error clears, isValid becomes true", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: validGmailArb,
          password: fc.string({ minLength: 8 }),
          confirmPassword: fc.string(),
        }),
        ({ email, password, confirmPassword }) => {
          void validateSignUpForm({
            email,
            password,
            confirmPassword,
          })

          const resultAfter = validateSignUpForm({
            email,
            password,
            confirmPassword: password,
          })

          expect(
            resultAfter.errors.find((e) => e.field === "confirmPassword")
          ).toBeUndefined()
          expect(resultAfter.isValid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
