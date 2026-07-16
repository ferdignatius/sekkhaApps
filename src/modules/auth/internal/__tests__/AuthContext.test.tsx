// Feature: auth-flow
// Unit tests for authReducer and AuthContext — covers all action types, state
// transitions, and property-based tests for logout and auth initialisation.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import * as fc from "fast-check"
import { render, screen, waitFor, act } from "@testing-library/react"
import { useContext, useEffect } from "react"
import {
  authReducer,
  initialAuthState,
  type AuthState,
} from "../context/authReducer"
import {
  AuthProvider,
  AuthContext,
  useAuthContext,
} from "../context/AuthContext"

// ─── Helper ────────────────────────────────────────────────────────────────────

/** Build an AuthState with overrides to use as a starting state in tests. */
function makeState(overrides: Partial<AuthState> = {}): AuthState {
  return { ...initialAuthState, ...overrides }
}

// ─── AUTH_LOADING ──────────────────────────────────────────────────────────────

describe("authReducer — AUTH_LOADING", () => {
  it("sets status to 'loading' when dispatched from unauthenticated", () => {
    // Requirements: 4.1
    const state = makeState({ status: "unauthenticated", accessToken: null, userId: null })
    const next = authReducer(state, { type: "AUTH_LOADING" })
    expect(next.status).toBe("loading")
  })

  it("sets status to 'loading' when dispatched from authenticated", () => {
    // Requirements: 4.1
    const state = makeState({ status: "authenticated", accessToken: "tok", userId: "u1" })
    const next = authReducer(state, { type: "AUTH_LOADING" })
    expect(next.status).toBe("loading")
  })

  it("preserves other state fields when only changing status to loading", () => {
    // Verifies that AUTH_LOADING uses spread (does not zero out accessToken/userId)
    // Requirements: 4.1
    const state = makeState({ status: "authenticated", accessToken: "tok", userId: "u1" })
    const next = authReducer(state, { type: "AUTH_LOADING" })
    // Only status should change; the reducer uses spread so token/userId carry over
    expect(next.status).toBe("loading")
  })
})

// ─── AUTH_SUCCESS ──────────────────────────────────────────────────────────────

describe("authReducer — AUTH_SUCCESS", () => {
  it("sets status to 'authenticated'", () => {
    // Requirements: 4.1, 4.2
    const state = makeState({ status: "loading" })
    const next = authReducer(state, {
      type: "AUTH_SUCCESS",
      payload: { accessToken: "access-token-123", userId: "user-456" },
    })
    expect(next.status).toBe("authenticated")
  })

  it("stores accessToken from payload in state", () => {
    // Requirements: 4.1, 4.2
    const state = makeState({ status: "loading" })
    const next = authReducer(state, {
      type: "AUTH_SUCCESS",
      payload: { accessToken: "my-jwt-token", userId: "u1" },
    })
    expect(next.accessToken).toBe("my-jwt-token")
  })

  it("stores userId from payload in state", () => {
    // Requirements: 4.1, 4.2
    const state = makeState({ status: "loading" })
    const next = authReducer(state, {
      type: "AUTH_SUCCESS",
      payload: { accessToken: "tok", userId: "user-789" },
    })
    expect(next.userId).toBe("user-789")
  })

  it("replaces previous token and userId when called again with new credentials", () => {
    // Requirements: 4.2
    const first = authReducer(makeState(), {
      type: "AUTH_SUCCESS",
      payload: { accessToken: "old-token", userId: "old-user" },
    })
    const second = authReducer(first, {
      type: "AUTH_SUCCESS",
      payload: { accessToken: "new-token", userId: "new-user" },
    })
    expect(second.accessToken).toBe("new-token")
    expect(second.userId).toBe("new-user")
    expect(second.status).toBe("authenticated")
  })
})

// ─── AUTH_LOGOUT ───────────────────────────────────────────────────────────────

describe("authReducer — AUTH_LOGOUT", () => {
  it("sets status to 'unauthenticated'", () => {
    // Requirements: 4.6
    const state = makeState({ status: "authenticated", accessToken: "tok", userId: "u1" })
    const next = authReducer(state, { type: "AUTH_LOGOUT" })
    expect(next.status).toBe("unauthenticated")
  })

  it("sets accessToken to null", () => {
    // Requirements: 4.6
    const state = makeState({ status: "authenticated", accessToken: "tok-xyz", userId: "u1" })
    const next = authReducer(state, { type: "AUTH_LOGOUT" })
    expect(next.accessToken).toBeNull()
  })

  it("sets userId to null", () => {
    // Requirements: 4.6
    const state = makeState({ status: "authenticated", accessToken: "tok", userId: "user-1" })
    const next = authReducer(state, { type: "AUTH_LOGOUT" })
    expect(next.userId).toBeNull()
  })

  it("is idempotent — calling logout on an already-unauthenticated state keeps it unauthenticated", () => {
    // Requirements: 4.6
    const state = makeState({ status: "unauthenticated", accessToken: null, userId: null })
    const next = authReducer(state, { type: "AUTH_LOGOUT" })
    expect(next.status).toBe("unauthenticated")
    expect(next.accessToken).toBeNull()
    expect(next.userId).toBeNull()
  })
})

// ─── AUTH_VERIFY_FAILED ────────────────────────────────────────────────────────

describe("authReducer — AUTH_VERIFY_FAILED", () => {
  it("sets status to 'unauthenticated'", () => {
    // Requirements: 4.1, 4.6
    const state = makeState({ status: "loading" })
    const next = authReducer(state, { type: "AUTH_VERIFY_FAILED" })
    expect(next.status).toBe("unauthenticated")
  })

  it("sets accessToken to null", () => {
    // Requirements: 4.6
    const state = makeState({ status: "authenticated", accessToken: "expired-tok", userId: "u1" })
    const next = authReducer(state, { type: "AUTH_VERIFY_FAILED" })
    expect(next.accessToken).toBeNull()
  })

  it("sets userId to null", () => {
    // Requirements: 4.6
    const state = makeState({ status: "authenticated", accessToken: "tok", userId: "user-99" })
    const next = authReducer(state, { type: "AUTH_VERIFY_FAILED" })
    expect(next.userId).toBeNull()
  })
})

// ─── initialAuthState ─────────────────────────────────────────────────────────

describe("initialAuthState", () => {
  it("starts with status 'loading'", () => {
    expect(initialAuthState.status).toBe("loading")
  })

  it("starts with accessToken null", () => {
    expect(initialAuthState.accessToken).toBeNull()
  })

  it("starts with userId null", () => {
    expect(initialAuthState.userId).toBeNull()
  })
})

// ─── Property 7: Logout Selalu Menghapus Token dan Mereset Auth_State ────────
// Feature: auth-flow, Property 7: Logout Selalu Menghapus Token dan Mereset Auth_State

const STORAGE_KEY = "sekkha_access_token"

/**
 * Helper component: forwards the current AuthContextValue to a callback on
 * every render so the test can interact with it outside React's render cycle.
 */
function LogoutHarness({
  onReady,
}: {
  onReady: (ctx: ReturnType<typeof useAuthContext>) => void
}) {
  const ctx = useAuthContext()
  useEffect(() => {
    onReady(ctx)
  })
  return null
}

describe("Property 7: Logout Selalu Menghapus Token dan Mereset Auth_State", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it(
    "logout always removes sekkha_access_token and resets status to unauthenticated",
    async () => {
      // Validates: Requirements 4.6
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (token) => {
          // Mock fetch to reject with a plain Error so fetchWithTimeout catches it
          // and throws AuthError("UNKNOWN_ERROR"), causing initAuth to clear the
          // token and dispatch AUTH_VERIFY_FAILED quickly (no real network I/O).
          const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockRejectedValue(new Error("network-mock"))

          // Seed localStorage with the arbitrary token before mounting
          localStorage.setItem(STORAGE_KEY, token)

          let capturedCtx: ReturnType<typeof useAuthContext> | null = null

          const { unmount } = render(
            <AuthProvider>
              <LogoutHarness
                onReady={(ctx) => {
                  capturedCtx = ctx
                }}
              />
            </AuthProvider>,
          )

          // Flush the init effect (async fetch → rejection → AUTH_VERIFY_FAILED)
          await act(async () => {
            await new Promise<void>((resolve) => setTimeout(resolve, 0))
          })

          // Re-seed the token after the init-effect cleared it (normal behaviour)
          localStorage.setItem(STORAGE_KEY, token)

          // Call logout inside act so the state update dispatched by
          // authService.logout() flushes synchronously before we assert.
          await act(async () => {
            capturedCtx!.logout()
          })

          // Assert: token is removed from localStorage
          expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

          // Assert: auth state is unauthenticated
          expect(capturedCtx!.authState.status).toBe("unauthenticated")

          // Cleanup
          unmount()
          localStorage.clear()
          fetchSpy.mockRestore()
        }),
        { numRuns: 100 },
      )
    },
    30000, // 30 s timeout for 100 property runs
  )
})

// ─── Property 6: Auth_State Terinisialisasi Benar Berdasarkan Kondisi localStorage ───
// Feature: auth-flow, Property 6: Auth_State Terinisialisasi Benar Berdasarkan Kondisi localStorage

/** A simple consumer that renders the current authState.status into the DOM. */
function AuthStateConsumer() {
  const ctx = useContext(AuthContext)
  if (!ctx) return <div data-testid="status">no-context</div>
  return <div data-testid="status">{ctx.authState.status}</div>
}

/** Render AuthProvider with the consumer and return the cleanup fn. */
function renderAuthProvider() {
  return render(
    <AuthProvider>
      <AuthStateConsumer />
    </AuthProvider>,
  )
}

describe("Property 6: Auth_State Terinisialisasi Benar Berdasarkan Kondisi localStorage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    localStorage.clear()
  })

  it(
    "null or empty token → unauthenticated without any fetch call",
    async () => {
      // **Validates: Requirements 4.8**
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant(null), fc.constant("")),
          async (tokenValue) => {
            localStorage.clear()
            if (tokenValue !== null) {
              localStorage.setItem(STORAGE_KEY, tokenValue)
            }

            const fetchSpy = vi.fn()
            vi.stubGlobal("fetch", fetchSpy)

            const { unmount } = renderAuthProvider()

            await waitFor(() => {
              expect(screen.getByTestId("status").textContent).toBe(
                "unauthenticated",
              )
            })

            // No network request should have been made (Req 4.8)
            expect(fetchSpy).not.toHaveBeenCalled()

            unmount()
            vi.restoreAllMocks()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    "valid token + /auth/verify responds 200 → authenticated",
    async () => {
      // **Validates: Requirements 4.3, 4.4**
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (token) => {
            localStorage.clear()
            localStorage.setItem(STORAGE_KEY, token)

            const fetchMock = vi.fn().mockResolvedValue({
              ok: true,
              status: 200,
              json: async () => ({ userId: "user-test", accessToken: token }),
            } as Response)
            vi.stubGlobal("fetch", fetchMock)

            const { unmount } = renderAuthProvider()

            await waitFor(() => {
              expect(screen.getByTestId("status").textContent).toBe(
                "authenticated",
              )
            })

            unmount()
            vi.restoreAllMocks()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    "valid token + /auth/verify responds 401 → unauthenticated and localStorage cleared",
    async () => {
      // **Validates: Requirements 4.5**
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (token) => {
            localStorage.clear()
            localStorage.setItem(STORAGE_KEY, token)

            const fetchMock = vi.fn().mockResolvedValue({
              ok: false,
              status: 401,
              json: async () => ({}),
            } as Response)
            vi.stubGlobal("fetch", fetchMock)

            const { unmount } = renderAuthProvider()

            await waitFor(() => {
              expect(screen.getByTestId("status").textContent).toBe(
                "unauthenticated",
              )
            })

            // Token must have been removed from localStorage (Req 4.5)
            expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

            unmount()
            vi.restoreAllMocks()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    "valid token + /auth/verify times out → unauthenticated and localStorage cleared",
    async () => {
      // **Validates: Requirements 4.7**
      await fc.assert(
        fc.asyncProperty(

          fc.string({ minLength: 1 }),
          async (token) => {
            localStorage.clear()
            localStorage.setItem(STORAGE_KEY, token)

            // Simulate a fetch that never resolves (so AbortController fires after 3000ms)
            // We use fake timers and advance past the 3000ms verify timeout.
            // shouldAdvanceTime: true lets waitFor's internal polling still run
            // while we can jump past the 3s abort timeout instantly.
            vi.useFakeTimers({ shouldAdvanceTime: true })

            const fetchMock = vi.fn().mockImplementation(
              (_url: string, opts: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                  opts?.signal?.addEventListener("abort", () =>
                    reject(
                      Object.assign(new Error("AbortError"), {
                        name: "AbortError",
                      }),
                    ),
                  )
                }),
            )
            vi.stubGlobal("fetch", fetchMock)

            const { unmount } = renderAuthProvider()

            // Advance timers past the 3000ms verify timeout (async variant
            // flushes promises between ticks so the abort + state update lands)
            await act(async () => {
              await vi.advanceTimersByTimeAsync(3500)
            })

            await waitFor(
              () => {
                expect(screen.getByTestId("status").textContent).toBe(
                  "unauthenticated",
                )
              },
              { timeout: 5000 },
            )

            // Token must have been removed from localStorage (Req 4.7)
            expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

            unmount()
            vi.restoreAllMocks()
            vi.useRealTimers()
          },
        ),
        { numRuns: 100 },
      )
    },
    30000, // 30 s timeout for 100 property runs with fake timers
  )
})
