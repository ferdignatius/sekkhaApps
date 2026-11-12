import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import type * as ReactRouter from "@tanstack/react-router"
import { AuthContext } from "../context/AuthContext"
import { initialAuthState } from "../context/authReducer"
import type { AuthState, RouterContext } from "../../index"
import { rootBeforeLoad } from "../utils/routeGuards"
import { IndexRouteComponent } from "@/shell/IndexRouteComponent"

const navigateMock = vi.fn().mockResolvedValue(undefined)

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useRouter: () => ({ navigate: navigateMock }),
  }
})

vi.mock("@/modules/landing-page", () => ({
  LandingPage: () => <div data-testid="mock-landing-page">Landing Page</div>,
}))

function getRedirectOptions(err: unknown): { to: string; replace?: boolean } | null {
  if (typeof err !== "object" || err === null) return null
  const e = err as Record<string, unknown>
  if (typeof e.options !== "object" || e.options === null) return null
  const opts = e.options as Record<string, unknown>
  if (typeof opts.to !== "string") return null
  return {
    to: opts.to,
    replace: typeof opts.replace === "boolean" ? opts.replace : undefined,
  }
}

function makeRouterContext(
  status: AuthState["status"],
  onboardingCompleted: boolean | null = true
): RouterContext {
  return {
    authState: {
      ...initialAuthState,
      status,
      accessToken: status === "authenticated" ? "tok_123" : null,
      userId: status === "authenticated" ? "usr_1" : null,
      onboardingCompleted,
    },
  }
}

function renderIndexWithAuth(
  status: AuthState["status"],
  onboardingCompleted: boolean | null = true
) {
  const authState: AuthState = {
    ...initialAuthState,
    status,
    accessToken: status === "authenticated" ? "tok_123" : null,
    userId: status === "authenticated" ? "usr_1" : null,
    onboardingCompleted,
  }

  return render(
    <AuthContext.Provider value={{ authState } as any}>
      <IndexRouteComponent />
    </AuthContext.Provider>
  )
}

describe("Root URL (/) — Auto-Redirect Authenticated Users to /home", () => {
  beforeEach(() => {
    navigateMock.mockClear()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("rootBeforeLoad redirects authenticated users directly to /home", async () => {
    let thrown: unknown = null
    try {
      await rootBeforeLoad(makeRouterContext("authenticated", true))
    } catch (err) {
      thrown = err
    }

    const opts = getRedirectOptions(thrown)
    expect(opts).not.toBeNull()
    expect(opts?.to).toBe("/home")
    expect(opts?.replace).toBe(true)
  })

  it("rootBeforeLoad redirects authenticated users with incomplete onboarding to /onboarding", async () => {
    let thrown: unknown = null
    try {
      await rootBeforeLoad(makeRouterContext("authenticated", false))
    } catch (err) {
      thrown = err
    }

    const opts = getRedirectOptions(thrown)
    expect(opts).not.toBeNull()
    expect(opts?.to).toBe("/onboarding")
    expect(opts?.replace).toBe(true)
  })

  it("rootBeforeLoad allows unauthenticated visitors to view the Landing Page at /", async () => {
    await expect(
      rootBeforeLoad(makeRouterContext("unauthenticated", null))
    ).resolves.toBeUndefined()
  })

  it("IndexRouteComponent renders LandingPage for unauthenticated guests without redirecting", () => {
    renderIndexWithAuth("unauthenticated", null)

    expect(screen.getByTestId("mock-landing-page")).toBeDefined()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("IndexRouteComponent redirects authenticated users away from / to /home without rendering LandingPage", async () => {
    renderIndexWithAuth("authenticated", true)

    expect(screen.queryByTestId("mock-landing-page")).toBeNull()
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: "/home", replace: true })
    })
  })

  it("IndexRouteComponent redirects authenticated users with incomplete onboarding to /onboarding", async () => {
    renderIndexWithAuth("authenticated", false)

    expect(screen.queryByTestId("mock-landing-page")).toBeNull()
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: "/onboarding",
        replace: true,
      })
    })
  })
})

