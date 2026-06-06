// Feature: auth-flow, Property 1: Validator Mengembalikan Error yang Akurat untuk Semua Kombinasi Input

import { describe, it } from "vitest"
import * as fc from "fast-check"
import { expect } from "vitest"
import { validateSignUpForm } from "../utils/validator"

// ─── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Property 1: Validator Mengembalikan Error yang Akurat untuk Semua Kombinasi Input ────
// Validates: Requirements 1.11, 1.12, 1.13, 3.1, 3.2, 3.3, 3.4, 3.5

describe("validateSignUpForm — Property 1: Validator Mengembalikan Error yang Akurat untuk Semua Kombinasi Input", () => {
  it("isValid === true hanya jika email valid, password >= 8 char, dan confirmPassword === password", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string(),
          password: fc.string(),
          confirmPassword: fc.string(),
        }),
        ({ email, password, confirmPassword }) => {
          const result = validateSignUpForm({ email, password, confirmPassword })

          const emailValid = EMAIL_REGEX.test(email)
          const passwordValid = password.length >= 8
          const confirmValid = confirmPassword === password

          const shouldBeValid = emailValid && passwordValid && confirmValid

          // isValid harus tepat mencerminkan apakah semua kondisi terpenuhi
          expect(result.isValid).toBe(shouldBeValid)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("jika email tidak valid → result.errors mengandung error dengan field === 'email'", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string(),
          password: fc.string(),
          confirmPassword: fc.string(),
        }),
        ({ email, password, confirmPassword }) => {
          const result = validateSignUpForm({ email, password, confirmPassword })

          const emailValid = EMAIL_REGEX.test(email)

          if (!emailValid) {
            const emailError = result.errors.find((e) => e.field === "email")
            expect(emailError).toBeDefined()
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it("jika password tidak valid (kosong atau < 8 char) → result.errors mengandung error dengan field === 'password'", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string(),
          password: fc.string(),
          confirmPassword: fc.string(),
        }),
        ({ email, password, confirmPassword }) => {
          const result = validateSignUpForm({ email, password, confirmPassword })

          const passwordValid = password.length >= 8

          if (!passwordValid) {
            const passwordError = result.errors.find(
              (e) => e.field === "password",
            )
            expect(passwordError).toBeDefined()
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it("jika confirmPassword !== password → result.errors mengandung error dengan field === 'confirmPassword'", () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string(),
          password: fc.string(),
          confirmPassword: fc.string(),
        }),
        ({ email, password, confirmPassword }) => {
          const result = validateSignUpForm({ email, password, confirmPassword })

          if (confirmPassword !== password) {
            const confirmError = result.errors.find(
              (e) => e.field === "confirmPassword",
            )
            expect(confirmError).toBeDefined()
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 2: Validator Menghapus Error Tepat Saat Field Menjadi Valid ──────
// Feature: auth-flow, Property 2: Validator Menghapus Error Tepat Saat Field Menjadi Valid
// Validates: Requirements 3.7, 3.8

describe("validateSignUpForm — Property 2: Validator Menghapus Error Tepat Saat Field Menjadi Valid", () => {
  it(
    "jika hanya confirmPassword tidak valid, error hanya muncul untuk field confirmPassword; email dan password tidak memiliki error",
    () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
            confirmPassword: fc.string(),
          }),
          ({ email, password, confirmPassword }) => {
            // Hanya jalankan assertion ketika confirmPassword memang berbeda dari password
            // (kondisi di mana hanya confirmPassword yang tidak valid)
            if (confirmPassword === password) return

            const result = validateSignUpForm({ email, password, confirmPassword })

            // email dan password harus tidak memiliki error
            const emailError = result.errors.find((e) => e.field === "email")
            const passwordError = result.errors.find((e) => e.field === "password")
            expect(emailError).toBeUndefined()
            expect(passwordError).toBeUndefined()

            // confirmPassword harus memiliki error
            const confirmError = result.errors.find((e) => e.field === "confirmPassword")
            expect(confirmError).toBeDefined()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    "memperbaiki confirmPassword menjadi sama dengan password → error confirmPassword hilang, isValid menjadi true",
    () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
            confirmPassword: fc.string(),
          }),
          ({ email, password, confirmPassword }) => {
            // Step 1: validasi dengan confirmPassword yang mungkin tidak valid
            const resultBefore = validateSignUpForm({ email, password, confirmPassword })

            // Step 2: perbaiki confirmPassword → identik dengan password
            const resultAfter = validateSignUpForm({
              email,
              password,
              confirmPassword: password,
            })

            // Setelah diperbaiki, tidak boleh ada error untuk confirmPassword
            const confirmErrorAfter = resultAfter.errors.find(
              (e) => e.field === "confirmPassword",
            )
            expect(confirmErrorAfter).toBeUndefined()

            // Karena email dan password sudah valid (dari arbitrary), isValid harus true
            expect(resultAfter.isValid).toBe(true)

            // Untuk menghilangkan warning unused variable
            void resultBefore
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
