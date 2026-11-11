import { useEffect } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/modules/auth"
import type { RouterContext } from "@/modules/auth"
import { LandingPage } from "@/modules/landing-page"
import { safeStorage } from "@/lib/storage"
import { waitForAuthResolution } from "./_authenticated"

export async function rootBeforeLoad(context: RouterContext): Promise<void> {
  const token = safeStorage.getItem("sekkha_access_token")
  if (token && context.authState?.status === "loading") {
    await waitForAuthResolution(context, 1000)
  }

  if (context.authState?.status === "authenticated") {
    const destination =
      context.authState.onboardingCompleted === false ? "/onboarding" : "/home"
    throw redirect({ to: destination, replace: true })
  }
}

export function IndexRouteComponent() {
  const { authState } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (authState.status !== "authenticated") return
    const destination =
      authState.onboardingCompleted === false ? "/onboarding" : "/home"
    void navigate({ to: destination, replace: true })
  }, [authState.status, authState.onboardingCompleted, navigate])

  if (authState.status === "authenticated") {
    return null
  }

  return <LandingPage />
}

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    await rootBeforeLoad(context as RouterContext)
  },
  component: IndexRouteComponent,
})
