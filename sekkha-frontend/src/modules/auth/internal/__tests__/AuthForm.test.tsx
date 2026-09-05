// Feature: auth-flow
// Tests for AuthFormField component — ARIA attributes and label accessibility.
// Task 7.2: Unit tests for AuthForm component.

import React from "react"
import { describe, it, expect, afterEach, vi } from "vitest"
import * as fc from "fast-check"
import { render, cleanup, within, screen, fireEvent } from "@testing-library/react"
import { AuthFormField } from "../components/AuthFormField"

// Arbitrary for valid HTML element id values (alphanumeric + hyphen/underscore).
// Avoids characters that are special in CSS selectors to keep tests simple.
const validIdArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/)

// Clean up the DOM after each test to prevent state leakage between runs.
afterEach(cleanup)

// ─── Property 3: Field dengan Error Menampilkan Atribut ARIA yang Benar ────────

// Feature: auth-flow, Property 3: Field dengan Error Menampilkan Atribut ARIA yang Benar
describe("AuthFormField — Property 3: ARIA attributes with/without error", () => {
  /**
   * Validates: Requirements 3.6, 10.3
   *
   * For every AuthFormField rendered with a non-empty `error` string:
   *   - The <input> must carry aria-invalid="true"
   *   - The <input> must carry aria-describedby pointing to "{id}-error"
   *   - An element with id="{id}-error" must exist in the rendered output
   *
   * For every AuthFormField rendered without an `error` prop:
   *   - The <input> must carry aria-invalid="false"
   *   - The <input> must NOT have an aria-describedby attribute
   *   - No element with id="{id}-error" should exist in the rendered output
   */
  it("sets aria-invalid=true and aria-describedby when error is present", () => {

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),   // arbitrary non-empty error message
        validIdArb,                    // arbitrary valid HTML id
        (errorMsg, fieldId) => {
          const { container, unmount } = render(
            <AuthFormField
              id={fieldId}
              label="Test Label"
              type="text"
              value=""
              onChange={() => {}}
              error={errorMsg}
            />,
          )

          // Use within() to scope queries to this container only
          const utils = within(container)
          const input = utils.getByRole("textbox")
          const expectedErrorId = `${fieldId}-error`

          // aria-invalid must be "true" when error is present
          expect(input.getAttribute("aria-invalid")).toBe("true")

          // aria-describedby must reference the error element's id
          expect(input.getAttribute("aria-describedby")).toBe(expectedErrorId)

          // The error element with that id must exist inside the container
          expect(
            container.ownerDocument.getElementById(expectedErrorId),
          ).not.toBeNull()

          unmount()
        },
      ),
      { numRuns: 100 },
    )
  }, { timeout: 30000 })

  it("sets aria-invalid=false and omits aria-describedby when error is absent", () => {
    fc.assert(
      fc.property(
        validIdArb,                    // arbitrary valid HTML id
        (fieldId) => {
          const { container, unmount } = render(
            <AuthFormField
              id={fieldId}
              label="Test Label"
              type="text"
              value=""
              onChange={() => {}}
              // no error prop → field is valid
            />,
          )

          // Use within() to scope queries to this container only
          const utils = within(container)
          const input = utils.getByRole("textbox")
          const errorElementId = `${fieldId}-error`

          // aria-invalid must be "false" when there is no error
          expect(input.getAttribute("aria-invalid")).toBe("false")

          // aria-describedby must NOT be present when there is no error
          expect(input.getAttribute("aria-describedby")).toBeNull()

          // No error element should exist inside the container
          expect(
            container.ownerDocument.getElementById(errorElementId),
          ).toBeNull()

          unmount()
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 12: Setiap Field Input Memiliki Label yang Terhubung ─────────────

// Feature: auth-flow, Property 12: Setiap Field Input Memiliki Label yang Terhubung Secara Aksesibel
import { AuthForm } from "../components/AuthForm"

// Mock @tanstack/react-router so AuthForm can render without a router context.
// Link is replaced with a plain <a> to keep DOM assertions straightforward.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={String(to)} {...rest}>
      {children}
    </a>
  ),
}))

// Mock SocialAuthButton to avoid the AuthProvider/useAuth dependency — the
// accessibility property test is about label↔input linkage, not OAuth.
vi.mock("../components/SocialAuthButton", () => ({
  SocialAuthButton: () => <button type="button">Lanjutkan dengan Google</button>,
}))

// Default props shared by all renders — no loading, no error, empty fields.
const defaultFormProps = {
  onSubmit: async () => {},
  isLoading: false,
  apiError: null,
  fields: { email: "", password: "", confirmPassword: "" },
  errors: {},
  onFieldChange: () => {},
  onFieldBlur: () => {},
}

describe("AuthForm — Property 12: Setiap Field Input Memiliki Label yang Terhubung Secara Aksesibel", () => {
  /**
   * Validates: Requirements 10.2
   *
   * For every rendered AuthForm (in both sign-up and login modes):
   *   - Every <input> must have a corresponding <label> whose htmlFor (= for)
   *     equals the input's id.
   *   - No <input> should exist in the form without a connected label.
   *
   * Using fc.constant(undefined) as the arbitrary (single render, DOM verify).
   */
  it("sign-up mode: every input has a label connected via htmlFor/id", () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        () => {
          const { unmount, container } = render(
            <AuthForm {...defaultFormProps} mode="sign-up" />,
          )

          const inputs = Array.from(container.querySelectorAll("input"))
          const labels = Array.from(container.querySelectorAll("label"))

          // Build a map of label.htmlFor → label element for fast lookup
          const labelForMap = new Map(labels.map((lbl) => [lbl.htmlFor, lbl]))

          for (const input of inputs) {
            const inputId = input.id

            // Every input must have a non-empty id
            expect(inputId.length > 0, `Input without id found: ${input.outerHTML}`).toBe(true)

            // A label whose htmlFor equals the input id must exist
            expect(
              labelForMap.has(inputId),
              `No <label htmlFor="${inputId}"> found for input id="${inputId}"`,
            ).toBe(true)
          }

          // No orphaned input (input with an id that has no matching label)
          const orphans = inputs.filter((inp) => !labelForMap.has(inp.id))
          expect(
            orphans.length,
            `Orphaned inputs (no label): ${orphans.map((i) => i.id).join(", ")}`,
          ).toBe(0)

          unmount()
        },
      ),
      { numRuns: 100 },
    )
  })

  it("login mode: every input has a label connected via htmlFor/id", () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        () => {
          const { unmount, container } = render(
            <AuthForm {...defaultFormProps} mode="login" />,
          )

          const inputs = Array.from(container.querySelectorAll("input"))
          const labels = Array.from(container.querySelectorAll("label"))

          const labelForMap = new Map(labels.map((lbl) => [lbl.htmlFor, lbl]))

          for (const input of inputs) {
            const inputId = input.id

            expect(inputId.length > 0, `Input without id found: ${input.outerHTML}`).toBe(true)

            expect(
              labelForMap.has(inputId),
              `No <label htmlFor="${inputId}"> found for input id="${inputId}"`,
            ).toBe(true)
          }

          const orphans = inputs.filter((inp) => !labelForMap.has(inp.id))
          expect(
            orphans.length,
            `Orphaned inputs (no label): ${orphans.map((i) => i.id).join(", ")}`,
          ).toBe(0)

          unmount()
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 4: Tombol Submit Selalu Disabled Selama Request Berlangsung ──────

// Feature: auth-flow, Property 4: Tombol Submit Selalu Disabled Selama Request Berlangsung
describe("AuthForm — Property 4: Tombol Submit Selalu Disabled Selama Request Berlangsung", () => {
  /**
   * Validates: Requirements 1.14, 2.11, 3.9
   *
   * For every value of isLoading (true or false) rendered in AuthForm:
   *   - If isLoading === true  → the submit button must have the `disabled` attribute
   *   - If isLoading === false → the submit button must NOT have the `disabled` attribute
   *
   * Tested for both "sign-up" and "login" modes to cover Requirements 1.14 and 2.11.
   */
  it("sign-up mode: submit button is disabled iff isLoading is true", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isLoading) => {
          const { unmount, container } = render(
            <AuthForm
              {...defaultFormProps}
              mode="sign-up"
              isLoading={isLoading}
            />,
          )

          const submitButton = container.querySelector<HTMLButtonElement>(
            'button[type="submit"]',
          )
          expect(submitButton).not.toBeNull()

          if (isLoading) {
            expect(submitButton!.disabled).toBe(true)
          } else {
            expect(submitButton!.disabled).toBe(false)
          }

          unmount()
        },
      ),
      { numRuns: 100 },
    )
  })

  it("login mode: submit button is disabled iff isLoading is true", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isLoading) => {
          const { unmount, container } = render(
            <AuthForm
              {...defaultFormProps}
              mode="login"
              isLoading={isLoading}
            />,
          )

          const submitButton = container.querySelector<HTMLButtonElement>(
            'button[type="submit"]',
          )
          expect(submitButton).not.toBeNull()

          if (isLoading) {
            expect(submitButton!.disabled).toBe(true)
          } else {
            expect(submitButton!.disabled).toBe(false)
          }

          unmount()
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 11: Auth_Error_Banner Hilang Saat Pengguna Mulai Mengetik ────────

// Feature: auth-flow, Property 11: Auth_Error_Banner Hilang Saat Pengguna Mulai Mengetik
describe("AuthForm — Property 11: Auth_Error_Banner Hilang Saat Pengguna Mulai Mengetik", () => {
  /**
   * Validates: Requirements 7.5
   *
   * For every AuthForm rendered with a non-null `apiError`:
   *   - The Auth_Error_Banner (role="alert") must be visible in the DOM.
   *   - When the user types a character into any input field, `onInputChange`
   *     must be called — this is the signal used to dismiss the banner.
   *
   * The property tests sign-up mode (3 fields) so every field that could
   * trigger the dismiss callback is exercised via the email field.
   */
  it("banner is visible and onInputChange is called on first keystroke (sign-up mode)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),  // arbitrary non-empty error message
        (errorMessage) => {
          const onInputChange = vi.fn()

          const { container, unmount } = render(
            <AuthForm
              {...defaultFormProps}
              mode="sign-up"
              apiError={errorMessage}
              onInputChange={onInputChange}
            />,
          )

          // The banner must be visible when apiError is non-null
          const banner = container.querySelector('[role="alert"]')
          expect(banner, "Auth_Error_Banner should be rendered when apiError is set").not.toBeNull()

          // Simulate the first keystroke on the email field
          const emailInput = container.querySelector('input[id="email"]') as HTMLInputElement
          expect(emailInput, "Email input should be present in the form").not.toBeNull()

          fireEvent.change(emailInput, { target: { value: "a" } })

          // onInputChange must have been called — the dismiss signal
          expect(onInputChange).toHaveBeenCalled()

          unmount()
        },
      ),
      { numRuns: 100 },
    )
  })

  it("banner is visible and onInputChange is called on first keystroke (login mode)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),  // arbitrary non-empty error message
        (errorMessage) => {
          const onInputChange = vi.fn()

          const { container, unmount } = render(
            <AuthForm
              {...defaultFormProps}
              mode="login"
              apiError={errorMessage}
              onInputChange={onInputChange}
            />,
          )

          // The banner must be visible when apiError is non-null
          const banner = container.querySelector('[role="alert"]')
          expect(banner, "Auth_Error_Banner should be rendered when apiError is set").not.toBeNull()

          // Simulate the first keystroke on the email field
          const emailInput = container.querySelector('input[id="email"]') as HTMLInputElement
          expect(emailInput, "Email input should be present in the form").not.toBeNull()

          fireEvent.change(emailInput, { target: { value: "a" } })

          // onInputChange must have been called — the dismiss signal
          expect(onInputChange).toHaveBeenCalled()

          unmount()
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Unit Tests: AuthForm — Task 7.2 ──────────────────────────────────────────

// Feature: auth-flow
// Unit tests for AuthForm component.
// Requirements: 1.2, 2.2, 3.9, 7.5

describe("AuthForm — unit tests (task 7.2)", () => {
  /**
   * Test mode "sign-up" → 3 fields rendered (email, password, confirmPassword)
   * Validates: Requirements 1.2
   */
  it('mode "sign-up" renders 3 fields: email, password, confirmPassword', () => {
    const { container, unmount } = render(
      <AuthForm
        {...defaultFormProps}
        mode="sign-up"
        fields={{ email: "", password: "", confirmPassword: "" }}
      />,
    )

    const inputs = container.querySelectorAll("input")
    expect(inputs).toHaveLength(4)

    // Verify the expected fields by id
    expect(container.querySelector("#email")).not.toBeNull()
    expect(container.querySelector("#password")).not.toBeNull()
    expect(container.querySelector("#confirmPassword")).not.toBeNull()
    expect(container.querySelector("#agreeToPrivacy")).not.toBeNull()

    unmount()
  })

  /**
   * Test mode "login" → 2 fields rendered (email, password)
   * Validates: Requirements 2.2
   */
  it('mode "login" renders 2 fields: email and password only', () => {
    const { container, unmount } = render(
      <AuthForm {...defaultFormProps} mode="login" />,
    )

    const inputs = container.querySelectorAll("input")
    expect(inputs).toHaveLength(2)

    expect(container.querySelector("#email")).not.toBeNull()
    expect(container.querySelector("#password")).not.toBeNull()
    expect(container.querySelector("#confirmPassword")).toBeNull()

    unmount()
  })

  /**
   * Test submit with empty fields → all Inline_Errors appear, onSubmit not called.
   *
   * AuthForm itself always calls the onSubmit prop on form submit.
   * The validation logic lives in the hook (useSignUpForm / useLoginForm).
   * This test wraps AuthForm with a lightweight stateful harness that mimics
   * the hook: on submit it validates and — if invalid — sets errors without
   * forwarding the call to a spy, which represents the real API call being
   * skipped.
   *
   * Validates: Requirements 1.2, 2.2, 3.1, 3.3, 3.5
   */
  it("submit with empty fields shows all inline errors and does not call the API", async () => {
    const apiSpy = vi.fn()

    // Minimal stateful harness that mimics useSignUpForm validation behaviour.
    function SignUpHarness() {
      const [fields, setFields] = React.useState({
        email: "",
        password: "",
        confirmPassword: "",
      })
      const [errors, setErrors] = React.useState<{
        email?: string
        password?: string
        confirmPassword?: string
      }>({})

      const handleSubmit = async () => {
        const newErrors: typeof errors = {}
        if (!fields.email) newErrors.email = "Email wajib diisi"
        if (!fields.password) newErrors.password = "Password wajib diisi"
        if (!fields.confirmPassword)
          newErrors.confirmPassword = "Konfirmasi password tidak cocok"

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors)
          return // do NOT call apiSpy
        }

        await apiSpy()
      }

      return (
        <AuthForm
          mode="sign-up"
          onSubmit={handleSubmit}
          isLoading={false}
          apiError={null}
          fields={fields}
          errors={errors}
          onFieldChange={(field, value) =>
            setFields((prev) => ({ ...prev, [field]: value }))
          }
          onFieldBlur={() => {}}
        />
      )
    }

    const { unmount } = render(<SignUpHarness />)

    // Submit with all fields empty — find the form by its aria-label
    const formEl = screen.getByRole("form", { name: /(sign up form|formulir pendaftaran)/i })
    fireEvent.submit(formEl)

    // Allow state updates to propagate
    await new Promise((resolve) => setTimeout(resolve, 0))

    // All inline errors must be visible
    expect(screen.getByText("Email wajib diisi")).not.toBeNull()
    expect(screen.getByText("Password wajib diisi")).not.toBeNull()
    expect(screen.getByText("Konfirmasi password tidak cocok")).not.toBeNull()

    // The underlying API call must NOT have been triggered
    expect(apiSpy).not.toHaveBeenCalled()

    unmount()
  })

  /**
   * Test submit when isLoading=true → submit button is disabled.
   * Validates: Requirements 3.9
   */
  it("submit button is disabled when isLoading=true", () => {
    const { container, unmount } = render(
      <AuthForm {...defaultFormProps} mode="login" isLoading={true} />,
    )

    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(submitBtn).not.toBeNull()
    expect(submitBtn.disabled).toBe(true)

    unmount()
  })

  it("submit button is enabled when isLoading=false", () => {
    const { container, unmount } = render(
      <AuthForm {...defaultFormProps} mode="login" isLoading={false} />,
    )

    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(submitBtn).not.toBeNull()
    expect(submitBtn.disabled).toBe(false)

    unmount()
  })

  /**
   * Test typing when apiError is active → onInputChange is called.
   * Validates: Requirements 7.5
   */
  it("calls onInputChange when user types in any field while apiError is set", () => {
    const onInputChangeSpy = vi.fn()

    const { container, unmount } = render(
      <AuthForm
        {...defaultFormProps}
        mode="login"
        apiError="Terjadi kesalahan."
        onInputChange={onInputChangeSpy}
      />,
    )

    // The error banner must be visible before typing
    expect(screen.getByRole("alert")).not.toBeNull()

    // Simulate typing in the email field
    const emailInput = container.querySelector("#email") as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: "a" } })

    // onInputChange should have been called
    expect(onInputChangeSpy).toHaveBeenCalled()

    unmount()
  })

  it("calls onInputChange when user types in password field while apiError is set", () => {
    const onInputChangeSpy = vi.fn()

    const { container, unmount } = render(
      <AuthForm
        {...defaultFormProps}
        mode="login"
        apiError="Terjadi kesalahan."
        onInputChange={onInputChangeSpy}
      />,
    )

    const passwordInput = container.querySelector("#password") as HTMLInputElement
    fireEvent.change(passwordInput, { target: { value: "x" } })

    expect(onInputChangeSpy).toHaveBeenCalled()

    unmount()
  })
})
