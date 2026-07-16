// Feature: auth-flow
// Router configuration — injects authState into router context for route guards.
// Requirements: 5.1, 5.3

import { useEffect } from "react"
import { createRouter as createTanStackRouter, useRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { useAuth } from "@/modules/auth"
import type { AuthState } from "@/modules/auth"

// ─── RouterContext ─────────────────────────────────────────────────────────────
// Defines the shape available to `beforeLoad` via `context` on all routes.
// The actual authState value is injected at runtime by RouterAuthSync (see below).

export interface RouterContext {
  authState: AuthState
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Default context — overridden at runtime once AuthProvider has initialized.
    // Starting with "loading" means the route guard will wait for resolution.
    context: {
      authState: { status: "loading", accessToken: null, userId: null },
    } satisfies RouterContext,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

// ─── RouterAuthSync ────────────────────────────────────────────────────────────
// Bridge component that keeps router.options.context.authState in sync with the
// live AuthState from AuthContext.
//
// Must be rendered inside both <AuthProvider> and the TanStack Start router tree
// so it can call useAuth() and useRouter() together. Place it anywhere in
// RootDocument (see src/routes/__root.tsx).
//
// Every time authState changes, router.update() is called so that the next
// navigation cycle picks up the latest value in beforeLoad via context.authState.

export function RouterAuthSync() {
  const router = useRouter()
  const { authState } = useAuth()

  useEffect(() => {
    router.update({
      context: { authState } satisfies RouterContext,
    })
  }, [router, authState])

  return null
}
