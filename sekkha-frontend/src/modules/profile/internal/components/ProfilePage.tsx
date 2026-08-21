// feature/profile/components/ProfilePage
// Redesigned: stats-focused profile for gamified community app.
// - Prominent rank/points hero
// - Streak + attendance calendar
// - Settings hidden behind gear button (modal/drawer)

import { useState, useEffect } from "react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ProfileCard } from "./ProfileCard"
import { MemberQrCard } from "./MemberQrCard"
import { StatsHero } from "./StatsHero"
import { AttendanceTracker } from "./AttendanceTracker"
import { AchievementsCard, DUMMY_BADGES } from "./AchievementsCard"

interface UserProfile {
  id: string
  name: string
  email: string
  school?: string | null
  role: string
  user_number?: string | null
  userNumber?: string | null
  avatarUrl?: string | null
  createdAt?: string
}

export function ProfilePage() {
  const { authState } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (authState.status === "authenticated") {
      api.get<UserProfile>("/users/me")
        .then((data) => setProfile(data))
        .catch(() => {})
    }
  }, [authState.status])

  const displayName = profile?.name || (authState.role ? authState.role.charAt(0).toUpperCase() + authState.role.slice(1) : "Pengguna Sekkha")
  const school = profile?.school || "—"
  const memberId = profile?.user_number || profile?.userNumber || profile?.id || (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "SKH-8821")
  const joinedAt = profile?.createdAt || "2025-07-01"

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Profil" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-4">

          {/* Header row: title */}
          <div className="flex items-center justify-between">
            <h1 className="text-heading-5 font-extrabold text-sekkha-ink">Profil Saya</h1>
          </div>

          {/* Profile card */}
          <ProfileCard
            name={displayName}
            school={school}
            joinedAt={joinedAt}
            avatarUrl={profile?.avatarUrl || undefined}
          />

          {/* Member QR Card (Digital & Printable Physical Vihara Card) */}
          <MemberQrCard
            memberName={displayName}
            memberId={memberId}
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

          {/* Attendance tracker — streak + monthly calendar (fix #2) */}
          <AttendanceTracker
            currentStreak={5}
            longestStreak={8}
            monthlyCheckins={[true, true, true, false]}
            monthLabel="Juli 2025"
          />

          {/* Achievements */}
          <AchievementsCard
            badges={DUMMY_BADGES}
            totalPoints={1240}
            rank={5}
          />
        </div>
      </div>
    </main>
  )
}
