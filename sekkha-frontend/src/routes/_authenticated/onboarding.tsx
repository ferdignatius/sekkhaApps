import { createFileRoute } from "@tanstack/react-router"
import { OnboardingPage } from "@/modules/auth"

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
})
