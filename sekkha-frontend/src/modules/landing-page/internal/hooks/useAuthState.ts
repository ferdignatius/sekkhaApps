import { useContext } from 'react'
import { AuthContext } from '@/modules/auth/internal/context/AuthContext'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

interface UseAuthStateReturn {
  authState: AuthState
}

/**
 * Hook to manage auth state on the Landing Page.
 * Immediately checks token in localStorage to prevent lazy load skeleton flicker on buttons.
 */
export function useAuthState(): UseAuthStateReturn {
  const ctx = useContext(AuthContext)

  // If there's no stored token in browser, it is immediately unauthenticated (0ms latency)
  if (typeof window !== 'undefined' && !localStorage.getItem('sekkha_access_token')) {
    return { authState: 'unauthenticated' }
  }

  if (!ctx) {
    return { authState: 'unauthenticated' }
  }

  return { authState: ctx.authState.status }
}
