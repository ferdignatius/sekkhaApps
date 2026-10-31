import { useAuth } from "@/modules/auth"
import { safeStorage } from "@/lib/storage"

type AuthState = "loading" | "authenticated" | "unauthenticated"

interface UseAuthStateReturn {
  authState: AuthState
}

/**
 * Hook to manage auth state on the Landing Page.
 * Immediately checks token in localStorage to prevent lazy load skeleton flicker on buttons.
 */
export function useAuthState(): UseAuthStateReturn {
  let status: AuthState | null = null
  try {
    const { authState } = useAuth()
    status = authState.status
  } catch {
    status = null
  }

  // If there's no stored token in browser, it is immediately unauthenticated (0ms latency)
  if (!safeStorage.getItem("sekkha_access_token")) {
    return { authState: "unauthenticated" }
  }

  if (!status) {
    return { authState: "unauthenticated" }
  }

  return { authState: status }
}
