// Feature: auth-flow
// AuthErrorBanner — displays server-side errors above the form using base Alert component.

import { Alert } from "@/components/base/Alert"

interface AuthErrorBannerProps {
  message: string | null
}

export function AuthErrorBanner({ message }: AuthErrorBannerProps) {
  if (message === null) return null

  return (
    <Alert
      variant="destructive"
      description={message}
    />
  )
}
