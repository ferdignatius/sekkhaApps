// Feature: privacy-policy
// Route: /privacy
// Public legal route for Sekkha Apps Privacy Policy

import { createFileRoute } from "@tanstack/react-router"
import { PrivacyPolicyPage } from "@/modules/landing-page"

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicyPage,
})
