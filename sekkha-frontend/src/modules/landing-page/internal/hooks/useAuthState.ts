import { useEffect, useState } from 'react'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

interface UseAuthStateReturn {
  authState: AuthState
}

/**
 * Hook untuk mengelola auth state pada Landing Page.
 *
 * State awal adalah 'loading'. Jika auth service tidak merespons
 * dalam 3000ms, state di-fallback ke 'unauthenticated' secara otomatis.
 *
 * Hook ini dirancang sebagai placeholder yang mudah diganti ketika
 * auth service nyata tersedia.
 *
 * Requirements: 1.4, 1.5
 */
export function useAuthState(): UseAuthStateReturn {
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthState((current) => {
        if (current === 'loading') {
          return 'unauthenticated'
        }
        return current
      })
    }, 3000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return { authState }
}
