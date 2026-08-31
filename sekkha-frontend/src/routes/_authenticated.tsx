// _authenticated.tsx — Pathless layout route for all pages that require auth.
// Named with _ prefix so TanStack Router treats it as a pathless layout wrapper
// (no URL segment added). All routes under _authenticated/ share this guard +
// shell. The URLs stay clean: /home, /home/profile, /events, etc.
//
// To add more protected pages, create files under src/routes/_authenticated/.

import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router"
import type { RouterContext } from "@/modules/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileDock } from "@/components/common/MobileDock"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_REDIRECT_LENGTH = 2048

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function isValidRedirectTo(value: string | undefined): value is string {
  if (!value) return false
  if (value.length > MAX_REDIRECT_LENGTH) return false
  if (!value.startsWith("/")) return false
  if (value.includes("http://") || value.includes("https://")) return false
  return true
}

async function waitForAuthResolution(
  context: RouterContext,
  timeoutMs: number,
): Promise<void> {
  if (context.authState.status !== "loading") return

  return new Promise<void>((resolve) => {
    const start = Date.now()
    function poll() {
      if (context.authState.status !== "loading") { resolve(); return }
      if (Date.now() - start >= timeoutMs) { resolve(); return }
      setTimeout(poll, 50)
    }
    poll()
  })
}

export async function routeGuardBeforeLoad(
  context: RouterContext,
  locationHref: string,
): Promise<void> {
  if (context.authState.status === "loading") {
    await waitForAuthResolution(context, 3000)
  }
  const token = typeof window !== "undefined" ? localStorage.getItem("sekkha_access_token") : null
  const isAuthenticated =
    context.authState.status === "authenticated" || (token !== null && token !== "")

  if (!isAuthenticated) {
    throw redirect({ to: "/login", search: { redirectTo: locationHref } })
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat dashboard..."
      className="flex min-h-screen animate-pulse bg-sekkha-surface"
    >
      <div className="hidden w-64 shrink-0 border-r border-sekkha-hairline-soft bg-sekkha-canvas md:block" />
      <div className="flex-1 p-6 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-sekkha-hairline-strong" />
        <div className="h-32 rounded-xl bg-sekkha-canvas border border-sekkha-hairline-soft" />
        <div className="h-32 rounded-xl bg-sekkha-canvas border border-sekkha-hairline-soft" />
      </div>
    </div>
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    await routeGuardBeforeLoad(context as RouterContext, location.href)
  },
  pendingComponent: DashboardSkeleton,
  component: DashboardLayout,
})

function DashboardLayout() {
  const { location } = useRouterState()
  const isScanPage = location.pathname.includes("/scan")

  if (isScanPage) {
    return <Outlet />
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar className="hidden md:flex" />
        <SidebarInset className="min-h-screen bg-[#fffaf0]">
          <Outlet />
        </SidebarInset>
        <MobileDock />
      </SidebarProvider>
    </TooltipProvider>
  )
}
