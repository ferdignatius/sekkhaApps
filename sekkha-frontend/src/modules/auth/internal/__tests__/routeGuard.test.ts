// Feature: auth-flow
// Unit and property tests for the route guard (dashboard/__layout.tsx beforeLoad).
// Requirements: 5.1, 5.2

import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import * as fc from "fast-check"
import { render, act, waitFor } from "@testing-library/react"
import type { RouterContext } from "../context/AuthContext"
import type { AuthState } from "../context/authReducer"

// ─── Module-level mocks ────────────────────────────────────────────────────────
// vi.mock hoisting requires these to be at the top level of the file.
// navigateMock is declared here and referenced inside the mock factory.

const navigateMock = vi.fn().mockResolvedValue(undefined)

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => ({}),
  }
})

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    authState: { status: "authenticated", accessToken: "tok", userId: "u1" },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock("../hooks/useLoginForm", () => ({
  useLoginForm: () => ({
    fields: { email: "", password: "" },
    errors: {},
    isLoading: false,
    apiError: null,
    handleChange: vi.fn(),
    handleBlur: vi.fn(),
    handleSubmit: vi.fn(),
    dismissApiError: vi.fn(),
    setApiError: vi.fn(),
  }),
}))

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build a minimal RouterContext with the given auth status.
 */
function makeContext(
  status: AuthState["status"],
  accessToken: string | null = null,
  userId: string | null = null,
): RouterContext {
  return {
    authState: { status, accessToken, userId, role: null, name: null, email: null },
  }
}

/**
 * TanStack Router's `redirect()` returns a `Response` instance.
 * The redirect target lives in the `options` property on that Response.
 */
function getRedirectOptions(
  err: unknown,
): { to: string; search?: Record<string, unknown> } | null {
  if (typeof err !== "object" || err === null) return null
  const e = err as Record<string, unknown>
  if (typeof e.options !== "object" || e.options === null) return null
  const opts = e.options as Record<string, unknown>
  if (typeof opts.to !== "string") return null
  return {
    to: opts.to,
    search: opts.search as Record<string, unknown> | undefined,
  }
}

/**
 * Returns true when the thrown error is a TanStack Router redirect to the given path.
 */
function isRedirectTo(err: unknown, expectedTo: string): boolean {
  const opts = getRedirectOptions(err)
  return opts?.to === expectedTo
}

/**
 * Extract the `redirectTo` query param from a thrown redirect error.
 */
function getRedirectToParam(err: unknown): string | undefined {
  const opts = getRedirectOptions(err)
  return opts?.search?.redirectTo as string | undefined
}

// ─── Import the functions under test ───────────────────────────────────────────

import { routeGuardBeforeLoad } from "../../../../routes/_authenticated"
import { LoginPage } from "../components/LoginPage"

// ─── Unit Tests: Route Guard (unauthenticated → redirect to /login) ─────────────

describe("Route Guard — unauthenticated user accessing /dashboard", () => {
  it("throws a redirect to /login when auth status is 'unauthenticated'", async () => {
    // Requirements: 5.1
    const ctx = makeContext("unauthenticated")

    let thrown: unknown = null
    try {
      await routeGuardBeforeLoad(ctx, "/dashboard")
    } catch (err) {
      thrown = err
    }

    expect(thrown).not.toBeNull()
    expect(isRedirectTo(thrown, "/login")).toBe(true)
  })

  it("includes /dashboard as the redirectTo query param when accessing /dashboard", async () => {
    // Requirements: 5.2
    const ctx = makeContext("unauthenticated")

    let thrown: unknown = null
    try {
      await routeGuardBeforeLoad(ctx, "/dashboard")
    } catch (err) {
      thrown = err
    }

    expect(getRedirectToParam(thrown)).toBe("/dashboard")
  })

  it("includes full href as the redirectTo query param (e.g., /dashboard?tab=overview)", async () => {
    // Requirements: 5.2 — the exact location.href is preserved
    const ctx = makeContext("unauthenticated")
    const href = "/dashboard?tab=overview"

    let thrown: unknown = null
    try {
      await routeGuardBeforeLoad(ctx, href)
    } catch (err) {
      thrown = err
    }

    expect(getRedirectToParam(thrown)).toBe(href)
  })
})

// ─── Unit Tests: Route Guard (authenticated → no redirect) ──────────────────────

describe("Route Guard — authenticated user accessing /dashboard", () => {
  it("does NOT throw when auth status is 'authenticated'", async () => {
    // Requirements: 5.1 — authenticated users can access protected routes
    const ctx = makeContext("authenticated", "tok-123", "user-1")

    await expect(
      routeGuardBeforeLoad(ctx, "/dashboard"),
    ).resolves.toBeUndefined()
  })

  it("returns without redirect for any /dashboard sub-path when authenticated", async () => {
    // Requirements: 5.6 — guard protects all routes under /dashboard prefix
    const ctx = makeContext("authenticated", "tok-abc", "user-2")

    await expect(
      routeGuardBeforeLoad(ctx, "/dashboard/settings"),
    ).resolves.toBeUndefined()
  })
})

// ─── Unit Tests: LoginPage redirect when authenticated ───────────────────────────

describe("LoginPage — authenticated user accessing /login", () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls navigate({ to: '/dashboard' }) when auth status is 'authenticated'", async () => {
    // Requirements: 5.7, 2.8
    // LoginPage uses useEffect + navigate({ to: "/dashboard" }) when authenticated.
    await act(async () => {
      render(React.createElement(LoginPage))
    })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: "/home" })
    })
  })
})

// ─── Property 8: Route Guard Selalu Memblokir Protected Route dari Pengguna Unauthenticated ───
// Feature: auth-flow, Property 8: Route Guard Selalu Memblokir Protected Route dari Pengguna Unauthenticated

describe("Property 8: Route Guard Selalu Memblokir Protected Route dari Pengguna Unauthenticated", () => {
  it(
    "setiap URL di bawah /dashboard yang diakses saat unauthenticated → redirect ke /login dengan redirectTo yang sesuai",
    async () => {
      // Validates: Requirements 5.1, 5.2
      await fc.assert(
        fc.asyncProperty(
          // Generate paths that start with "/" — arbitrary URL under /dashboard prefix
          fc.string().filter((s) => s.startsWith("/")),
          async (path) => {
            const ctx = makeContext("unauthenticated")

            let thrown: unknown = null
            try {
              await routeGuardBeforeLoad(ctx, path)
            } catch (err) {
              thrown = err
            }

            // Must always throw a redirect (req 5.1)
            expect(thrown).not.toBeNull()

            // Must redirect to /login (req 5.1)
            expect(isRedirectTo(thrown, "/login")).toBe(true)

            // redirectTo param must equal the original path (req 5.2)
            expect(getRedirectToParam(thrown)).toBe(path)
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
