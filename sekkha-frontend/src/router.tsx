// Feature: auth-flow
// Router configuration — injects authState into router context for route guards.
// Requirements: 5.1, 5.3

import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import type { AuthState } from "@/modules/auth"

// ─── RouterContext ─────────────────────────────────────────────────────────────
// Defines the shape available to `beforeLoad` via `context` on all routes.
// The actual authState value is injected at runtime by RouterAuthSync (see __root.tsx).

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
      authState: { status: "loading", accessToken: null, userId: null, role: null, name: null, email: null },
    } satisfies RouterContext,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
