// Feature: auth-flow
// Unit tests for authService — covers login, register, verifyToken, logout,
// including success paths, error codes, and network timeout behaviour.
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createAuthService, STORAGE_KEY } from "../api/authService"
import { AuthError } from "../context/authReducer"
import type { AuthAction } from "../context/authReducer"

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal Response-like object that fetch would return. */
function makeFetchResponse(
  status: number,
  body: unknown = {},
  ok?: boolean,
): Response {
  return {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    json: async () => body,
  } as Response
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

let dispatch: ReturnType<typeof vi.fn>
let service: ReturnType<typeof createAuthService>

beforeEach(() => {
  dispatch = vi.fn()
  service = createAuthService(dispatch)
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

// ─── login — success ──────────────────────────────────────────────────────────

describe("authService.login — success", () => {
  it("stores the access token in localStorage", async () => {
    // Requirements: 4.2
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeFetchResponse(200, { accessToken: "tok-abc", userId: "user-1" }),
      ),
    )

    await service.login("user@example.com", "password123")

    expect(localStorage.getItem(STORAGE_KEY)).toBe("tok-abc")
  })

  it("dispatches AUTH_SUCCESS with the token and userId", async () => {
    // Requirements: 4.2
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeFetchResponse(200, { accessToken: "tok-abc", userId: "user-1" }),
      ),
    )

    await service.login("user@example.com", "password123")

    expect(dispatch).toHaveBeenCalledOnce()
    expect(dispatch).toHaveBeenCalledWith<[AuthAction]>({
      type: "AUTH_SUCCESS",
      payload: { accessToken: "tok-abc", userId: "user-1", role: "umat" },
    })
  })
})

// ─── login — 401 ─────────────────────────────────────────────────────────────

describe("authService.login — 401", () => {
  it("throws AuthError with code INVALID_CREDENTIALS", async () => {
    // Requirements: 4.2
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeFetchResponse(401, {})),
    )

    await expect(
      service.login("wrong@example.com", "badpass"),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AuthError && err.code === "INVALID_CREDENTIALS",
    )
  })

  it("does not dispatch any action on 401", async () => {
    // Requirements: 4.2
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeFetchResponse(401, {})),
    )

    await service.login("wrong@example.com", "badpass").catch(() => {
      /* swallow */
    })

    expect(dispatch).not.toHaveBeenCalled()
  })
})

// ─── register — success ───────────────────────────────────────────────────────

describe("authService.register — success", () => {
  it("stores the access token in localStorage", async () => {
    // Requirements: 4.1
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeFetchResponse(200, { accessToken: "reg-tok", userId: "user-2" }),
      ),
    )

    await service.register("new@example.com", "securePass1")

    expect(localStorage.getItem(STORAGE_KEY)).toBe("reg-tok")
  })

  it("dispatches AUTH_SUCCESS with the token and userId", async () => {
    // Requirements: 4.1
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        makeFetchResponse(200, { accessToken: "reg-tok", userId: "user-2" }),
      ),
    )

    await service.register("new@example.com", "securePass1")

    expect(dispatch).toHaveBeenCalledOnce()
    expect(dispatch).toHaveBeenCalledWith<[AuthAction]>({
      type: "AUTH_SUCCESS",
      payload: { accessToken: "reg-tok", userId: "user-2", role: "umat" },
    })
  })
})

// ─── register — 409 ──────────────────────────────────────────────────────────

describe("authService.register — 409", () => {
  it("throws AuthError with code EMAIL_ALREADY_EXISTS", async () => {
    // Requirements: 4.1
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeFetchResponse(409, {})),
    )

    await expect(
      service.register("taken@example.com", "password123"),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AuthError && err.code === "EMAIL_ALREADY_EXISTS",
    )
  })

  it("does not dispatch any action on 409", async () => {
    // Requirements: 4.1
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeFetchResponse(409, {})),
    )

    await service
      .register("taken@example.com", "password123")
      .catch(() => { /* swallow */ })

    expect(dispatch).not.toHaveBeenCalled()
  })
})

// ─── verifyToken — 200 ───────────────────────────────────────────────────────

describe("authService.verifyToken — 200", () => {
  it("resolves without throwing", async () => {
    // Requirements: 4.3, 4.4
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeFetchResponse(200, {})),
    )

    await expect(service.verifyToken("valid-token")).resolves.toBeUndefined()
  })

  it("does not dispatch any action on successful verify", async () => {
    // Requirements: 4.3
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeFetchResponse(200, {})),
    )

    await service.verifyToken("valid-token")

    expect(dispatch).not.toHaveBeenCalled()
  })
})

// ─── verifyToken — 401 ───────────────────────────────────────────────────────

describe("authService.verifyToken — 401", () => {
  it("throws AuthError with code INVALID_CREDENTIALS", async () => {
    // Requirements: 4.5
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeFetchResponse(401, {})),
    )

    await expect(service.verifyToken("expired-token")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AuthError && err.code === "INVALID_CREDENTIALS",
    )
  })
})

// ─── verifyToken — network timeout (3000 ms) ─────────────────────────────────

describe("authService.verifyToken — network timeout", () => {
  it("throws AuthError with code NETWORK_TIMEOUT when request times out after 3000ms", async () => {
    // Requirements: 4.7
    vi.useFakeTimers()

    // fetch never resolves; abort signal fires after 3000ms
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, opts: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          opts?.signal?.addEventListener("abort", () =>
            reject(
              Object.assign(new Error("AbortError"), { name: "AbortError" }),
            ),
          )
        }),
      ),
    )

    const verifyPromise = service.verifyToken("some-token")

    // Advance time past the 3000ms timeout used by verifyToken
    vi.advanceTimersByTime(3500)

    await expect(verifyPromise).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AuthError && err.code === "NETWORK_TIMEOUT",
    )

    vi.useRealTimers()
  })
})

// ─── logout ───────────────────────────────────────────────────────────────────

describe("authService.logout", () => {
  it("removes sekkha_access_token from localStorage", () => {
    // Requirements: 4.6
    localStorage.setItem(STORAGE_KEY, "some-token")

    service.logout()

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("dispatches AUTH_LOGOUT", () => {
    // Requirements: 4.6
    service.logout()

    expect(dispatch).toHaveBeenCalledOnce()
    expect(dispatch).toHaveBeenCalledWith<[AuthAction]>({ type: "AUTH_LOGOUT" })
  })

  it("does not dispatch AUTH_SUCCESS or AUTH_LOADING", () => {
    // Requirements: 4.6
    service.logout()

    const call = (dispatch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as AuthAction
    expect(call.type).toBe("AUTH_LOGOUT")
  })
})

// ─── Property 5: Token Round-Trip ke localStorage ─────────────────────────────
// Feature: auth-flow, Property 5: Token Round-Trip ke localStorage
// Validates: Requirements 4.1, 4.2

import * as fc from "fast-check"

describe("Property 5 — Token Round-Trip ke localStorage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it(
    "login: localStorage[STORAGE_KEY] identik dengan accessToken dari respons backend",
    async () => {
      // Validates: Requirements 4.2
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (accessToken) => {
            localStorage.clear()
            const localDispatch = vi.fn()
            const localService = createAuthService(localDispatch)

            vi.stubGlobal(
              "fetch",
              vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ accessToken, userId: "user-prop5" }),
              } as Response),
            )

            await localService.login("test@example.com", "password123")

            const stored = localStorage.getItem(STORAGE_KEY)
            vi.restoreAllMocks()
            return stored === accessToken
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  it(
    "register: localStorage[STORAGE_KEY] identik dengan accessToken dari respons backend",
    async () => {
      // Validates: Requirements 4.1
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (accessToken) => {
            localStorage.clear()
            const localDispatch = vi.fn()
            const localService = createAuthService(localDispatch)

            vi.stubGlobal(
              "fetch",
              vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ accessToken, userId: "user-prop5" }),
              } as Response),
            )

            await localService.register("new@example.com", "password123")

            const stored = localStorage.getItem(STORAGE_KEY)
            vi.restoreAllMocks()
            return stored === accessToken
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
