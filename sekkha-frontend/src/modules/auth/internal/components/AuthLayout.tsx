// Feature: auth-flow
// AuthLayout — responsive card-centered layout for auth pages.
// Requirements: 1.9, 2.9, 9.1, 9.2, 9.3, 9.4, 9.6

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Responsive layout wrapper for Sign Up and Login pages.
 *
 * Desktop/Tablet (≥ 768px):
 *   - Full-viewport height, vertically + horizontally centered
 *   - Background: sekkha-surface
 *   - Card: max-w-[480px] w-full, card-base token
 *     (bg-sekkha-canvas, rounded-xl, p-6, border border-sekkha-hairline-soft)
 *
 * Mobile (< 768px):
 *   - No card wrapper, full width
 *   - Horizontal padding: spacing.md (16px)
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    /* Outer wrapper — provides the surface bg and full-viewport centering on md+ */
    <div className="min-h-screen bg-sekkha-surface px-4 py-10 md:flex md:items-center md:justify-center md:px-0">
      {/* Card — only visible on md+ */}
      <div className="w-full max-w-[480px] md:rounded-xl md:border md:border-sekkha-hairline-soft md:bg-sekkha-canvas md:p-6">
        {children}
      </div>
    </div>
  )
}
