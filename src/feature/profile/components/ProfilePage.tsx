// feature/profile/components/ProfilePage
// User profile page: profile card + settings section.

import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/feature/auth"
import { ProfileCard } from "./ProfileCard"
import { SettingsSection } from "./SettingsSection"

export function ProfilePage() {
  const { authState, logout } = useAuth()
  const navigate = useNavigate()

  // Derive display name
  const isAdmin =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
  const displayName = isAdmin ? "Admin Sekkha" : "Pengguna"
  const school = isAdmin ? "SMA Negeri 1 Sekkha" : "—"

  function handleLogout() {
    logout()
    void navigate({ to: "/login" })
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-heading-5 text-sekkha-ink">Profil</h1>

      {/* Profile card */}
      <ProfileCard name={displayName} school={school} />

      {/* Settings */}
      <SettingsSection onLogout={handleLogout} />
    </main>
  )
}
