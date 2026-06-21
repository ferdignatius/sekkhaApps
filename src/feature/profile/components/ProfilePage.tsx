// feature/profile/components/ProfilePage
// Redesigned: stats-focused profile for gamified community app.
// - Prominent rank/points hero
// - Streak + attendance calendar
// - Settings hidden behind gear button (modal/drawer)

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { SettingsIcon } from "lucide-react"
import { useAuth } from "@/feature/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { ProfileCard } from "./ProfileCard"
import { StatsHero } from "./StatsHero"
import { AttendanceTracker } from "./AttendanceTracker"
import { AchievementsCard, DUMMY_BADGES } from "./AchievementsCard"
import { SettingsSection } from "./SettingsSection"

export function ProfilePage() {
  const { authState, logout } = useAuth()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isAdmin =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
  const displayName = isAdmin ? "Admin Sekkha" : "Pengguna"
  const school = isAdmin ? "SMA Negeri 1 Sekkha" : "—"

  function handleLogout() {
    logout()
    void navigate({ to: "/login" })
  }

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Beranda", href: "/home" }, { label: "Profil" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-4">

          {/* Header row: title + settings gear */}
          <div className="flex items-center justify-between">
            <h1 className="text-heading-5 text-sekkha-ink">Profil</h1>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-sekkha-hairline-strong text-sekkha-slate transition-colors hover:bg-sekkha-surface active:bg-sekkha-hairline-soft"
              aria-label="Pengaturan"
            >
              <SettingsIcon className="size-4" />
            </button>
          </div>

          {/* Profile card */}
          <ProfileCard
            name={displayName}
            school={school}
            joinedAt="2025-07-01"
          />

          {/* Stats hero — rank & points prominent (fix #1) */}
          <StatsHero
            rank={5}
            totalPoints={1240}
            level={3}
            levelLabel="Umat Setia"
            totalEvents={18}
            favoriteEvent="Kebaktian Minggu"
          />

          {/* Attendance tracker — streak + weekly calendar (fix #2) */}
          <AttendanceTracker
            currentStreak={5}
            longestStreak={8}
            weeklyCheckins={[true, true, true, true, true, false, false]}
          />

          {/* Achievements */}
          <AchievementsCard
            badges={DUMMY_BADGES}
            totalPoints={1240}
            rank={5}
          />

          {/* Settings modal/drawer (fix #3) */}
          <ResponsiveFormModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            title="Pengaturan"
          >
            <SettingsSection onLogout={handleLogout} />
          </ResponsiveFormModal>
        </div>
      </div>
    </main>
  )
}
