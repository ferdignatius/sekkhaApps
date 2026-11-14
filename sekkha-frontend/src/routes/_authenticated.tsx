// _authenticated.tsx — Pathless layout route for all pages that require auth.
// Named with _ prefix so TanStack Router treats it as a pathless layout wrapper
// (no URL segment added). All routes under _authenticated/ share this guard +
// shell. The URLs stay clean: /home, /home/profile, /events, etc.
//
// To add more protected pages, create files under src/routes/_authenticated/.

import { useEffect } from "react"
import {
  createFileRoute,
  Outlet,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router"
import { routeGuardBeforeLoad, useAuth } from "@/modules/auth"
import type { RouterContext } from "@/modules/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileDock } from "@/components/common/MobileDock"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AuthenticatedSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading..."
      className="flex min-h-screen animate-pulse bg-sekkha-surface"
    >
      <div className="hidden w-64 shrink-0 border-r border-sekkha-hairline-soft bg-sekkha-canvas md:block" />
      <div className="flex-1 space-y-4 p-6">
        <div className="h-8 w-48 rounded-lg bg-sekkha-hairline-strong" />
        <div className="h-32 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas" />
        <div className="h-32 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas" />
      </div>
    </div>
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    await routeGuardBeforeLoad(context as RouterContext, location.href)
  },
  pendingComponent: AuthenticatedSkeleton,
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { authState } = useAuth()
  const navigate = useNavigate()
  const { location } = useRouterState()

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      navigate({
        to: "/login",
        search: { redirectTo: location.href },
      })
      return
    }

    if (
      location.pathname === "/configure" ||
      location.pathname === "/configure/"
    ) {
      navigate({ to: "/configure/master/event-type" })
      return
    }

    // Onboarding guard: redirect incomplete user to /onboarding (PRD AC-08)
    if (
      authState.status === "authenticated" &&
      authState.onboardingCompleted === false &&
      !location.pathname.startsWith("/onboarding")
    ) {
      navigate({ to: "/onboarding" })
      return
    }

    // Redirect already-completed user away from /onboarding
    if (
      authState.status === "authenticated" &&
      authState.onboardingCompleted === true &&
      location.pathname.startsWith("/onboarding")
    ) {
      navigate({ to: "/home" })
      return
    }

    if (authState.status === "authenticated" && authState.role) {
      const role = authState.role as string
      const isOrganizerOrAdmin =
        role === "organizer" || role === "pengurus" || role === "admin"
      const isOrganizerRoute =
        location.pathname.startsWith("/people") ||
        location.pathname.startsWith("/insight") ||
        location.pathname.startsWith("/configure")
      if (isOrganizerRoute && !isOrganizerOrAdmin) {
        navigate({ to: "/home" })
      }
    }
  }, [authState.status, authState.onboardingCompleted, authState.role, navigate, location.href, location.pathname])

  if (authState.status === "loading") {
    return <AuthenticatedSkeleton />
  }

  const isImmersivePage =
    location.pathname.includes("/scan") ||
    location.pathname.startsWith("/onboarding")

  if (isImmersivePage) {
    return <Outlet />
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar className="hidden md:flex" />
        <SidebarInset className="min-h-screen bg-canvas">
          <Outlet />
        </SidebarInset>
        <MobileDock />
      </SidebarProvider>
    </TooltipProvider>
  )
}
