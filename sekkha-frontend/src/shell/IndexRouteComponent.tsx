import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/modules/auth"
import { LandingPage } from "@/modules/landing-page"

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

