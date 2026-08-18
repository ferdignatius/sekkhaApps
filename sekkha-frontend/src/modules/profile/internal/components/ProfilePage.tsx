// feature/profile/components/ProfilePage
// Redesigned: stats-focused profile for gamified community app.
// - Prominent rank/points hero
// - Streak + attendance calendar
// - Settings hidden behind gear button (modal/drawer)

import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ProfileCard } from "./ProfileCard"
import { MemberQrCard } from "./MemberQrCard"
import { StatsHero } from "./StatsHero"
import { AttendanceTracker } from "./AttendanceTracker"
import { AchievementsCard, DUMMY_BADGES } from "./AchievementsCard"

export function ProfilePage() {
  const { authState } = useAuth()

  const isAdmin =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
  const displayName = isAdmin ? "Admin Sekkha" : "Pengguna"
  const school = isAdmin ? "SMA Negeri 1 Sekkha" : "—"

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
            joinedAt="2025-07-01"
          />

          {/* Member QR Card (Digital & Printable Physical Vihara Card) */}
          <MemberQrCard
            memberName={displayName}
            memberId={isAdmin ? "SKH-0001" : "SKH-8821"}
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
