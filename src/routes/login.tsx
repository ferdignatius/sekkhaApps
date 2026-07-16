// Feature: auth-flow
// Route: /login
// Requirements: 2.1, 5.2

import { createFileRoute } from "@tanstack/react-router"
import { LoginPage } from "@/modules/auth"

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: typeof search.redirectTo === "string" ? search.redirectTo : undefined,
  }),
})
