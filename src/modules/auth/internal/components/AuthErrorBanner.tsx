// Feature: auth-flow
// AuthErrorBanner — displays server-side errors above the form with role="alert".
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 10.7

interface AuthErrorBannerProps {
  message: string | null
}

/**
 * Renders a visually distinct error banner above the auth form.
 * When `message` is null, renders nothing.
 *
 * The `role="alert"` attribute causes screen readers to announce the message
 * immediately when it appears, without requiring focus to be moved (req 10.7).
 */
export function AuthErrorBanner({ message }: AuthErrorBannerProps) {
  if (message === null) return null

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-md border border-sekkha-brand-red-dark bg-sekkha-brand-red/10 px-4 py-3"
    >
      {/* Error icon */}
      <svg
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-4 w-4 shrink-0 text-sekkha-brand-red-dark"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>

      <p className="text-[13px] leading-[1.4] text-sekkha-brand-red-dark">
        {message}
      </p>
    </div>
  )
}
