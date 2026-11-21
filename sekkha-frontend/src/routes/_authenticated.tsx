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
      className="flex min-h-screen bg-[#fffaf0] antialiased"
    >
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-[#e6decb]/80 bg-[#faf5e8] p-4 md:flex">
        <div className="h-9 w-36 animate-pulse rounded-xl bg-[#ebe6d6]/70" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 w-full animate-pulse rounded-xl bg-[#ebe6d6]/60"
            />
          ))}
        </div>
      </div>
      <div className="flex-1">
        {/* Transparent top bar matching PageBreadcrumb */}
        <div className="px-4 py-1.5 sm:px-6 md:px-8 md:py-2 lg:px-12">
          <div className="mx-auto flex min-h-[48px] max-w-7xl items-center justify-between gap-3 sm:min-h-[52px]">
            <div className="h-5 w-28 animate-pulse rounded-lg bg-[#ebe6d6]/70" />
            <div className="size-9 animate-pulse rounded-full bg-[#ebe6d6]/70" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-3 sm:px-6 md:px-8 lg:px-12">
          <div className="h-36 animate-pulse rounded-[28px] border border-[#e6decb]/80 bg-[#faf5e8]/80" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-32 animate-pulse rounded-[24px] border border-[#e6decb]/80 bg-[#faf5e8]/70" />
            <div className="h-32 animate-pulse rounded-[24px] border border-[#e6decb]/80 bg-[#faf5e8]/70" />
          </div>
        </div>
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
