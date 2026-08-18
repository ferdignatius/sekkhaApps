// Feature: auth-flow
// Route: /sign-up
// Requirements: 1.1

import { createFileRoute } from "@tanstack/react-router"
import { SignUpPage } from "@/modules/auth"

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
})
