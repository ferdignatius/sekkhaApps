import { redirect } from "@tanstack/react-router"
import type { RouterContext } from "../context/AuthContext"
import { safeStorage } from "@/lib/storage"

const MAX_REDIRECT_LENGTH = 2048

/**
 * Validates whether a redirectTo value is a safe internal path.
 */
export function isValidRedirectTo(value: string | undefined): value is string {
  if (!value) return false
  if (value.length > MAX_REDIRECT_LENGTH) return false
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return false
  }
  if (value.includes("http://") || value.includes("https://")) return false
  return true
}

export async function waitForAuthResolution(
  context: RouterContext,
  timeoutMs: number
): Promise<void> {
  if (context.authState.status !== "loading") return

  return new Promise<void>((resolve) => {
    const start = Date.now()
    function poll() {
      if (context.authState.status !== "loading") {
        resolve()
        return
      }
      if (Date.now() - start >= timeoutMs) {
        resolve()
        return
      }
      setTimeout(poll, 50)
    }
    poll()
  })
}

export async function routeGuardBeforeLoad(
  context: RouterContext,
  locationHref: string
): Promise<void> {
  const token = safeStorage.getItem("sekkha_access_token")
  if (!token && context.authState?.status === "loading") {
    await waitForAuthResolution(context, 1000)
  }
  const isAuthenticated =
    context.authState?.status === "authenticated" ||
    (token !== null && token !== "")

  if (!isAuthenticated) {
    throw redirect({ to: "/login", search: { redirectTo: locationHref } })
  }
}

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

