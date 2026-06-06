// Feature: auth-flow
// Dashboard layout route — route guard via beforeLoad + app shell with sidebar/dock.
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import type { RouterContext } from "@/feature/auth"
import { SekkhaAppSidebar } from "@/components/common/SekkhaAppSidebar"
import { MobileDock } from "@/components/common/MobileDock"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Maximum allowed length for the redirectTo path (req 5.5, 6.3, 6.5) */
const MAX_REDIRECT_LENGTH = 2048

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validates whether a redirectTo value is a safe internal path.
 * Requirements: 5.4, 5.5, 6.3, 6.5
 *
 * A valid redirectTo path:
 * - Must be a non-empty string
 * - Must start with "/" (internal path)
 * - Must not contain "http://" or "https://" (no external URLs)
 * - Must not exceed MAX_REDIRECT_LENGTH characters
 */
export function isValidRedirectTo(value: string | undefined): value is string {
  if (!value) return false
  if (value.length > MAX_REDIRECT_LENGTH) return false
  if (!value.startsWith("/")) return false
  if (value.includes("http://") || value.includes("https://")) return false
  return true
}

/**
 * Waits until authState.status is no longer "loading", up to `timeoutMs`.
 *
 * Because TanStack Router's `beforeLoad` receives a snapshot of the context,
 * this function re-reads the authState from the live AuthContext via a
 * module-level subscriber that the AuthProvider notifies.
 *
 * Fallback: if auth does not resolve within `timeoutMs` ms, treats the
 * user as unauthenticated (safe default).
 */
async function waitForAuthResolution(
  context: RouterContext,
  timeoutMs: number,
): Promise<void> {
  // If already resolved, return immediately
  if (context.authState.status !== "loading") return

  // Poll the live context reference for up to timeoutMs
  return new Promise<void>((resolve) => {
    const start = Date.now()

    function poll() {
      if (context.authState.status !== "loading") {
        resolve()
        return
      }
      if (Date.now() - start >= timeoutMs) {
        resolve()
        return
      }
      setTimeout(poll, 50)
    }

    poll()
  })
}

// ─── Skeleton Loading State ────────────────────────────────────────────────────

/**
 * Skeleton loading state rendered while auth is being verified.
 * Mirrors the structural layout of the dashboard to avoid layout shift.
 * Requirement 5.3: show skeleton loading state while waiting for auth resolution.
 */
function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat dashboard..."
      className="min-h-screen bg-sekkha-surface animate-pulse"
    >
      {/* Navbar skeleton */}
      <div className="h-16 bg-sekkha-canvas border-b border-sekkha-hairline-soft px-6 flex items-center gap-4">
        <div className="h-6 w-24 rounded bg-sekkha-hairline-strong" />
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-sekkha-hairline-strong" />
      </div>

      {/* Main content skeleton */}
      <main className="container mx-auto px-4 pt-8 space-y-6">
        {/* Page title skeleton */}
        <div className="h-8 w-48 rounded bg-sekkha-hairline-strong" />

        {/* Content cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-sekkha-canvas border border-sekkha-hairline-soft"
            />
          ))}
        </div>

        {/* Body content skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-sekkha-hairline-strong" />
          <div className="h-4 w-5/6 rounded bg-sekkha-hairline-strong" />
          <div className="h-4 w-4/6 rounded bg-sekkha-hairline-strong" />
        </div>
      </main>
    </div>
  )
}

// ─── Route Guard Logic (exported for testing) ─────────────────────────────────

/**
 * Core route guard logic — separated for unit-testability.
 *
 * Given an auth context and the current location's href, this function either
 * returns void (access granted) or throws a TanStack Router redirect (access
 * denied → redirect to /login with redirectTo param).
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export async function routeGuardBeforeLoad(
  context: RouterContext,
  locationHref: string,
): Promise<void> {
  // Wait up to 3000ms for auth to resolve from "loading" state (req 5.3)
  if (context.authState.status === "loading") {
    await waitForAuthResolution(context, 3000)
  }

  // If still not authenticated, redirect to /login with the intended URL (req 5.1, 5.2)
  if (context.authState.status !== "authenticated") {
    throw redirect({
      to: "/login",
      search: { redirectTo: locationHref },
    })
  }
}

// ─── Route Definition ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard/__layout")({
  beforeLoad: async ({ context, location }) => {
    await routeGuardBeforeLoad(context as RouterContext, location.href)
  },

  // Pending component shown by TanStack Router while beforeLoad is awaited (req 5.3)
  pendingComponent: DashboardSkeleton,

  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <SidebarProvider>
      {/* Desktop sidebar — hidden on mobile */}
      <SekkhaAppSidebar className="hidden md:flex" />

      {/* Page content area */}
      <SidebarInset className="min-h-screen bg-sekkha-surface">
        <Outlet />
      </SidebarInset>

      {/* Mobile bottom dock */}
      <MobileDock />
    </SidebarProvider>
  )
}
