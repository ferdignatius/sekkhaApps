// Route: /forgot-password
// Handles password recovery requests for users.

import { createFileRoute } from "@tanstack/react-router"
import { ForgotPasswordPage } from "@/modules/auth"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})
