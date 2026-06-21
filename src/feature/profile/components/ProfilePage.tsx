// feature/profile/components/ProfilePage
// User profile page: profile card + achievements + settings.

import { useNavigate } from "@tanstack/react-router"
import { useAuth } from "@/feature/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ProfileCard } from "./ProfileCard"
import { AchievementsCard, DUMMY_BADGES } from "./AchievementsCard"
import { SettingsSection } from "./SettingsSection"

export function ProfilePage() {
  const { authState, logout } = useAuth()
  const navigate = useNavigate()

  const isAdmin =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
  const displayName = isAdmin ? "Admin Sekkha" : "Pengguna"
  const school = isAdmin ? "SMA Negeri 1 Sekkha" : "—"

  function handleLogout() {
    logout()
    void navigate({ to: "/login" })
  }

  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-8xl space-y-4">
        <PageBreadcrumb items={[{ label: "Beranda", href: "/dashboard" }, { label: "Profil" }]} />
        <h1 className="text-heading-5 text-sekkha-ink">Profil</h1>

        {/* Profile card */}
        <ProfileCard
          name={displayName}
          school={school}
          joinedAt="2025-07-01"
        />

        {/* Achievements */}
        <AchievementsCard
          badges={DUMMY_BADGES}
          totalPoints={1240}
          rank={5}
        />

        {/* Settings */}
        <SettingsSection onLogout={handleLogout} />
      </div>
    </main>
  )
}
