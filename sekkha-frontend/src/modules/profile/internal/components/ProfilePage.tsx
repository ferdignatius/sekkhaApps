// feature/profile/components/ProfilePage
// Fully connected to backend data (Zero mock/fake fallbacks).
// Strictly aligned with Clay Design System (DESIGN.md) & English localization.

import { useState, useEffect, useMemo } from "react"
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  CheckIcon,
  PrinterIcon,
  CopyIcon,
  FlameIcon,
  TrophyIcon,
  StarIcon,
  AwardIcon,
  QrCodeIcon,
  SettingsIcon,
  LogOutIcon,
  MailIcon,
  CameraIcon,
  PencilIcon,
  KeyIcon,
} from "lucide-react"
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
} from "recharts"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { z } from "zod"
import QRCode from "react-qr-code"

import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { SettingsSection } from "@/modules/profile/internal/components/SettingsSection"

const UserProfileResponseSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
  })
  .passthrough()

const StreakResponseSchema = z
  .object({
    current_streak: z.number().optional(),
    longest_streak: z.number().optional(),
  })
  .passthrough()

interface UserProfile {
  id: string
  name: string
  username?: string | null
  email: string
  school?: string | null
  phone?: string | null
  birthDate?: string | null
  birth_date?: string | null
  gender?: string | null
  role: string
  user_number?: string | null
  userNumber?: string | null
  points?: number
  avatarUrl?: string | null
  createdAt?: string
}

interface UserStreakData {
  currentStreak: number
  longestStreak: number
  weeklyActivity: boolean[]
}

interface UserBadge {
  badge_id: string
  name: string
  icon_url: string
  description: string
  earned_at: string | null
}

interface UserAttendance {
  event_id: string
  event_title: string
  event_date: string
  method: string
  scanned_at: string
}

interface LeaderboardResponse {
  my_rank?: {
    rank: number
    value: number
    name?: string
  }
}

export function ProfilePage() {
  const { authState, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [streakData, setStreakData] = useState<UserStreakData | null>(null)
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [attendances, setAttendances] = useState<UserAttendance[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Tabs & Modals
  const [activeTab, setActiveTab] = useState<
    "overview" | "badges" | "card" | "settings"
  >("overview")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Form states
  const [editForm, setEditForm] = useState({
    name: "",
    username: "",
    school: "",
    phone: "",
    birth_date: "",
    gender: "Laki-laki",
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [savingPassword, setSavingPassword] = useState(false)

  // Toast notification state
  const [toast, setToast] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadProfileData()
  }, [])

  async function loadProfileData() {
    setLoading(true)
    try {
      const [profileRes, streakRes, badgesRes, attendancesRes, lbRes] =
        await Promise.allSettled([
          api.get<UserProfile>("/users/me", {
            schema: UserProfileResponseSchema,
          }),
          api.get<{ current_streak: number; longest_streak: number }>(
            "/users/me/streak",
            { schema: StreakResponseSchema }
          ),
          api.get<UserBadge[]>("/users/me/badges"),
          api.get<UserAttendance[]>("/users/me/attendances"),
          api.get<LeaderboardResponse>("/leaderboard?metric=points"),
        ])

      if (profileRes.status === "fulfilled" && profileRes.value) {
        setProfile(profileRes.value)
      }

      if (streakRes.status === "fulfilled" && streakRes.value) {
        setStreakData({
          currentStreak: streakRes.value.current_streak ?? 0,
          longestStreak: streakRes.value.longest_streak ?? 0,
          weeklyActivity: [],
        })
      } else {
        setStreakData({
          currentStreak: 0,
          longestStreak: 0,
          weeklyActivity: [],
        })
      }

      if (badgesRes.status === "fulfilled" && badgesRes.value) {
        setBadges(badgesRes.value || [])
      } else {
        setBadges([])
      }

      if (attendancesRes.status === "fulfilled" && attendancesRes.value) {
        setAttendances(attendancesRes.value || [])
      } else {
        setAttendances([])
      }

      if (lbRes.status === "fulfilled" && lbRes.value?.my_rank?.rank) {
        setMyRank(lbRes.value.my_rank.rank)
      }
    } catch (err: any) {
      console.error("Failed to load profile data:", err)
      showToast("Failed to load profile information", "error")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenEditModal() {
    if (!profile) return
    const rawBirthDate = profile.birth_date || profile.birthDate || ""
    const formattedBirthDate = rawBirthDate ? rawBirthDate.split("T")[0] : ""

    setEditForm({
      name: profile.name || authState.name || "",
      username: profile.username || "",
      school: profile.school || "",
      phone: profile.phone || "",
      birth_date: formattedBirthDate,
      gender: profile.gender === "P" ? "Female" : "Male",
    })
    setShowEditModal(true)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const payload: any = {
        name: editForm.name.trim(),
        username: editForm.username.trim() || undefined,
        school: editForm.school.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        gender: editForm.gender === "Female" ? "P" : "L",
      }

      if (editForm.birth_date) {
        payload.birth_date = editForm.birth_date
      }

      const updated = await api.patch<UserProfile>("/users/me", payload)
      setProfile((prev) => ({ ...prev, ...updated }))
      if (updated.name) {
        window.dispatchEvent(
          new CustomEvent("sekkha:profile_updated", {
            detail: { name: updated.name },
          })
        )
      }
      setShowEditModal(false)
      showToast("Profile updated successfully!")
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast("New passwords do not match", "error")
      return
    }
    if (passwordForm.new_password.length < 6) {
      showToast("New password must be at least 6 characters", "error")
      return
    }

    setSavingPassword(true)
    try {
      await api.post("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setShowChangePasswordModal(false)
      showToast("Password changed successfully!")
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      })
    } catch (err: any) {
      showToast(err.message || "Failed to change password", "error")
    } finally {
      setSavingPassword(false)
    }
  }

  function handleCopyNumber(num: string) {
    if (!num) return
    navigator.clipboard.writeText(num)
    setCopiedId(true)
    showToast("Member ID copied to clipboard!")
    setTimeout(() => setCopiedId(false), 2000)
  }

  function handleTriggerPrint() {
    window.print()
  }

  // 100% Real Calculated Values
  const role = profile?.role || authState.role || "umat"
  // Render blank when no real name is available — avoid flashing a default
  // (e.g. capitalized role like "Umat") before hydration completes.
  const displayName = profile?.name || authState.name || ""
  const school = profile?.school || ""
  // Render blank when no real member number is available — avoid flashing a
  // derived placeholder (e.g. "SKH-1234") before the backend responds.
  const memberId = profile?.user_number || profile?.userNumber || ""
  const totalPoints = profile?.points ?? 0
  const currentStreak =
    streakData?.currentStreak ?? (streakData as any)?.current_streak ?? 0
  const longestStreak =
    streakData?.longestStreak ?? (streakData as any)?.longest_streak ?? 0
  const totalAttended = attendances.length

  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "UM"

  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "pengurus"
        ? "Organizer"
        : role === "aktivis"
          ? "Activist"
          : "Member"
  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-[#ff4d8b]/15 text-[#ff4d8b] border-[#ff4d8b]/30 font-semibold",
    pengurus: "bg-[#1a3a3a] text-white border-[#1a3a3a] font-semibold",
    aktivis: "bg-[#b8a4ed]/30 text-[#0a0a0a] border-[#b8a4ed]/50 font-semibold",
    umat: "bg-[#f5f0e0] text-[#0a0a0a] border-[#e5e5e5] font-semibold",
  }

  // Dynamic Radar Chart Analytics based on attendance, streak, badges, and points
  const { radarData, overallIndexScore, strongestArea } = useMemo(() => {
    // 1. Attendance Score: % of target (e.g. 12 events)
    const attendanceScore = Math.min(
      100,
      Math.round((totalAttended / 12) * 100)
    )

    // 2. Streak Score: Current streak * 20 max 100
    const streakScore = Math.min(100, Math.round(currentStreak * 20))

    // 3. Points Score: Current points / 500 max 100
    const pointsScore = Math.min(100, Math.round((totalPoints / 500) * 100))

    // 4. Badges Score: Badges earned / total badges available
    const earnedBadgesCount = badges.filter((b) => b.earned_at !== null).length
    const totalBadgesCount = Math.max(1, badges.length)
    const badgeScore = Math.min(
      100,
      Math.round((earnedBadgesCount / totalBadgesCount) * 100)
    )

    // 5. Special Events Participation
    const specialAttCount = attendances.filter((a) => {
      const title = (a.event_title || "").toLowerCase()
      return (
        title.includes("special") ||
        title.includes("magha") ||
        title.includes("waisak") ||
        title.includes("kathina") ||
        title.includes("baksos")
      )
    }).length
    const specialScore = Math.min(100, Math.round((specialAttCount / 3) * 100))

    // 6. Dedication Index: Combination of streaks + consistency
    const baseAvg = Math.round(
      (attendanceScore + streakScore + pointsScore) / 3
    )
    const dedicationScore =
      currentStreak > 0 ? Math.min(100, baseAvg + 15) : baseAvg

    const data = [
      {
        subject: "Attendance",
        fullSubject: "Regular Attendance",
        score: attendanceScore,
        raw: `${totalAttended} Events`,
        icon: "📅",
        color: "#1a3a3a",
      },
      {
        subject: "Streak",
        fullSubject: "Weekly Streak",
        score: streakScore,
        raw: `${currentStreak}x Active`,
        icon: "🔥",
        color: "#e8b94a",
      },
      {
        subject: "Points",
        fullSubject: "Total Karma Points",
        score: pointsScore,
        raw: `${totalPoints} Pts`,
        icon: "⭐",
        color: "#0a0a0a",
      },
      {
        subject: "Badges",
        fullSubject: "Badges Unlocked",
        score: badgeScore,
        raw: `${earnedBadgesCount}/${totalBadgesCount}`,
        icon: "🏆",
        color: "#b8a4ed",
      },
      {
        subject: "Special",
        fullSubject: "Special Participation",
        score: specialScore,
        raw: `${specialAttCount} Special`,
        icon: "✨",
        color: "#ffb084",
      },
      {
        subject: "Dedication",
        fullSubject: "Dedication Index",
        score: dedicationScore,
        raw: `${dedicationScore}%`,
        icon: "🛡️",
        color: "#1a3a3a",
      },
    ]

    const overall = Math.round(
      data.reduce((acc, curr) => acc + curr.score, 0) / data.length
    )
    const best = [...data].sort((a, b) => b.score - a.score)[0]

    return {
      radarData: data,
      overallIndexScore: overall,
      strongestArea: best,
    }
  }, [
    totalAttended,
    currentStreak,
    longestStreak,
    totalPoints,
    badges,
    attendances,
  ])

  return (
    <main className="min-h-screen bg-[#fffaf0] text-left">
      <PageBreadcrumb items={[{ label: "Profile" }]} />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in duration-200 fade-in slide-in-from-top-4">
          <div
            className={`flex items-center gap-2.5 rounded-[12px] border px-4 py-3 shadow-xl ${
              toast.type === "success"
                ? "border-emerald-500/50 bg-[#0a0a0a] text-white"
                : "border-rose-500/50 bg-rose-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircleIcon className="size-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangleIcon className="size-5 shrink-0 text-white" />
            )}
            <p className="text-xs font-bold">{toast.text}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-5 px-3.5 py-4 pb-32 md:px-8 md:pb-12">
        {loading && !profile ? (
          <div className="space-y-5">
            {/* Skeleton Hero Banner */}
            <div className="space-y-4 rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-6 shadow-xs">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <Skeleton className="size-24 rounded-[16px]" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-7 w-48 rounded-[8px]" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-[6px]" />
                    <Skeleton className="h-6 w-28 rounded-[6px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Skeleton Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs"
                >
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── 1. CLAY WARM HERO IDENTITY BANNER ── */}
            <div className="relative overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-5 shadow-xs sm:rounded-[24px] sm:p-7">
              <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                {/* Left: Avatar + User Details */}
                <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
                  {/* Avatar with Camera Trigger */}
                  <div className="relative shrink-0">
                    <div className="flex size-20 items-center justify-center rounded-[16px] bg-[#e8b94a] text-xl font-bold tracking-wider text-[#0a0a0a] uppercase shadow-xs sm:size-24 sm:text-2xl">
                      {userInitials}
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenEditModal}
                      className="absolute -right-1 -bottom-1 flex size-7 cursor-pointer items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:size-8"
                      title="Edit Profile & Photo"
                    >
                      <CameraIcon className="size-3.5 sm:size-4" />
                    </button>
                  </div>

                  {/* Identity Info */}
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-lg font-bold tracking-tight text-[#0a0a0a] sm:text-2xl">
                        {displayName}
                      </h1>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle[role] || roleBadgeStyle.umat}`}
                      >
                        <ShieldCheckIcon className="size-3" />
                        <span>{roleLabel}</span>
                      </span>
                    </div>

                    {/* ID, Username & School Info */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1 font-mono font-bold text-[#0a0a0a] shadow-2xs">
                        <span>ID: {memberId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyNumber(memberId)}
                          className="ml-0.5 cursor-pointer p-0.5 text-[#6a6a6a] hover:text-[#0a0a0a]"
                          title="Copy Member ID"
                        >
                          {copiedId ? (
                            <CheckIcon className="size-3 text-emerald-600" />
                          ) : (
                            <CopyIcon className="size-3" />
                          )}
                        </button>
                      </div>

                      {profile?.username && (
                        <span className="rounded-[8px] border border-[#1a3a3a]/20 bg-[#1a3a3a]/10 px-2.5 py-1 font-mono font-semibold text-[#1a3a3a]">
                          @{profile.username}
                        </span>
                      )}

                      {school && (
                        <span className="flex items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1 font-medium text-[#6a6a6a]">
                          <GraduationCapIcon className="size-3.5 text-[#6a6a6a]" />
                          <span className="max-w-[180px] truncate sm:max-w-xs">
                            {school}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Contact Meta Row */}
                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-[#6a6a6a]">
                      {profile?.phone && (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="size-3 text-[#6a6a6a]" />
                          <span>{profile.phone}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MailIcon className="size-3 text-[#6a6a6a]" />
                        <span>{profile?.email || authState.email || "—"}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex shrink-0 items-stretch gap-2 pt-1 sm:flex-row lg:flex-col lg:pt-0">
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:text-sm"
                  >
                    <PencilIcon className="size-3.5 sm:size-4" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] sm:text-sm"
                  >
                    <PrinterIcon className="size-3.5 sm:size-4" />
                    <span>Print Physical Card</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── 2. KEY METRICS TILES ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {/* Total Points */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs transition-all hover:bg-[#faf5e8] sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                    Total Points
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                    <StarIcon className="size-3.5 fill-[#e8b94a] text-[#e8b94a]" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-black text-[#0a0a0a] sm:text-2xl">
                  {totalPoints.toLocaleString("en-US")}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">
                  Active karma points
                </p>
              </div>

              {/* Leaderboard Rank */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs transition-all hover:bg-[#faf5e8] sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                    Rank
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                    <TrophyIcon className="size-3.5 text-[#e8b94a]" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-black text-[#0a0a0a] sm:text-2xl">
                  {myRank ? `#${myRank}` : "—"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">
                  In {roleLabel} standings
                </p>
              </div>

              {/* Attended Events */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs transition-all hover:bg-[#faf5e8] sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                    Attendance
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                    <CalendarIcon className="size-3.5 text-[#0a0a0a]" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-black text-[#0a0a0a] sm:text-2xl">
                  {totalAttended}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">
                  Events attended
                </p>
              </div>

              {/* Active Weekly Streak */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs transition-all hover:bg-[#faf5e8] sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                    Active Streak
                  </span>
                  <div className="flex size-7 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                    <FlameIcon className="size-3.5 fill-[#e8b94a] text-[#e8b94a]" />
                  </div>
                </div>
                <p className="mt-2 text-xl font-black text-[#0a0a0a] sm:text-2xl">
                  {currentStreak}x
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">
                  Record: {longestStreak}x
                </p>
              </div>
            </div>

            {/* ── 3. INTERACTIVE SECTION TAB BAR ── */}
            <div className="flex scrollbar-none items-center gap-1 overflow-x-auto rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "overview"
                    ? "bg-[#0a0a0a] text-white shadow-xs"
                    : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                }`}
              >
                <SparklesIcon className="size-3.5" />
                <span>Overview & Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("badges")}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "badges"
                    ? "bg-[#0a0a0a] text-white shadow-xs"
                    : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                }`}
              >
                <AwardIcon className="size-3.5" />
                <span>Badges & Achievements</span>
                <span
                  className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${activeTab === "badges" ? "bg-white/20 text-white" : "bg-[#f5f0e0] text-[#0a0a0a]"}`}
                >
                  {badges.filter((b) => Boolean(b.earned_at)).length}/
                  {badges.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "card"
                    ? "bg-[#0a0a0a] text-white shadow-xs"
                    : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                }`}
              >
                <QrCodeIcon className="size-3.5" />
                <span>Digital Member ID</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === "settings"
                    ? "bg-[#0a0a0a] text-white shadow-xs"
                    : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                }`}
              >
                <SettingsIcon className="size-3.5" />
                <span>Settings & Account</span>
              </button>
            </div>

            {/* ── 4. TAB CONTENTS ── */}

            {/* TAB 1: OVERVIEW & ANALYTICS */}
            {activeTab === "overview" && (
              <div className="animate-in space-y-5 duration-200 fade-in">
                {/* Big Streak Flame Hero Card */}
                <div className="space-y-3 rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-6 text-center shadow-xs sm:p-8">
                  <div className="mx-auto flex size-20 items-center justify-center rounded-[16px] bg-[#0a0a0a] text-white shadow-xs sm:size-22">
                    <FlameIcon
                      className={`size-10 sm:size-12 ${currentStreak > 0 ? "fill-[#e8b94a] text-[#e8b94a]" : "text-[#6a6a6a]"}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-3xl font-black tracking-tight text-[#0a0a0a] sm:text-4xl">
                        {currentStreak}x
                      </span>
                      <span className="self-end pb-0.5 text-sm font-bold text-[#6a6a6a] sm:text-base">
                        Weekly Streak
                      </span>
                    </div>

                    <p className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
                      {currentStreak > 0
                        ? "🔥 Attendance Streak is Active!"
                        : "No Active Streak Yet"}
                    </p>

                    <p className="mx-auto max-w-md text-xs leading-relaxed text-[#6a6a6a]">
                      Attend weekly community events consistently to boost your
                      streak. If an active week is missed, the streak resets to
                      0.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <span className="rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-3 py-1 text-xs font-bold text-[#0a0a0a] shadow-2xs">
                      🏆 Longest Record: {longestStreak}x
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold shadow-2xs ${
                        currentStreak > 0
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-[#e5e5e5] bg-[#fffaf0] text-[#6a6a6a]"
                      }`}
                    >
                      {currentStreak > 0
                        ? "✓ Checked in this week"
                        : "Check-in needed this week"}
                    </span>
                  </div>
                </div>

                {/* Radar Chart Analytics */}
                <div className="space-y-5 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
                  <div className="flex flex-col justify-between gap-3 border-b border-[#e5e5e5] pb-3.5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                        <SparklesIcon className="size-4 text-[#e8b94a]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                          Activity & Participation Analytics
                        </h3>
                        <p className="text-xs text-[#6a6a6a]">
                          Real-time breakdown of attendance, streaks, points,
                          and badges
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-1.5 shadow-2xs sm:self-auto">
                      <div className="text-right">
                        <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                          Activity Index
                        </p>
                        <p className="text-sm font-bold text-[#0a0a0a]">
                          {overallIndexScore}{" "}
                          <span className="text-[10px] text-[#6a6a6a]">
                            / 100
                          </span>
                        </p>
                      </div>
                      <div className="flex size-7 items-center justify-center rounded-[6px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs">
                        {overallIndexScore >= 80
                          ? "A+"
                          : overallIndexScore >= 60
                            ? "B"
                            : overallIndexScore >= 40
                              ? "C"
                              : "D"}
                      </div>
                    </div>
                  </div>

                  <div className="grid items-center gap-6 lg:grid-cols-12">
                    {/* Radar Chart */}
                    <div className="relative flex min-h-[260px] flex-col items-center justify-center lg:col-span-6">
                      <div className="relative h-64 w-full sm:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius="75%"
                            data={radarData}
                          >
                            <PolarGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={({
                                payload,
                                x,
                                y,
                                cx,
                                cy,
                                ...rest
                              }: any) => (
                                <text
                                  x={x}
                                  y={y}
                                  cx={cx}
                                  cy={cy}
                                  {...rest}
                                  className="fill-[#6a6a6a] text-[11px] font-bold"
                                  textAnchor="middle"
                                >
                                  {payload.value}
                                </text>
                              )}
                            />
                            <PolarRadiusAxis
                              angle={30}
                              domain={[0, 100]}
                              tick={false}
                              axisLine={false}
                            />
                            <Radar
                              name="Score"
                              dataKey="score"
                              stroke="#0a0a0a"
                              strokeWidth={2}
                              fill="#e8b94a"
                              fillOpacity={0.4}
                              dot={{ r: 3, fill: "#0a0a0a" }}
                            />
                            <RechartsTooltip
                              content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload
                                  return (
                                    <div className="space-y-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] p-3 text-left text-xs text-[#0a0a0a] shadow-xl">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        <span>{data.icon}</span>
                                        <span>{data.fullSubject}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3 border-t border-[#e5e5e5] pt-1 text-[11px]">
                                        <span className="text-[#6a6a6a]">
                                          Index Score:
                                        </span>
                                        <span className="font-bold text-[#0a0a0a]">
                                          {data.score} / 100
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3 text-[11px]">
                                        <span className="text-[#6a6a6a]">
                                          Actual Metric:
                                        </span>
                                        <span className="font-semibold text-[#0a0a0a]">
                                          {data.raw}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Highlights & Breakdown */}
                    <div className="space-y-3 lg:col-span-6">
                      <div className="space-y-1 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span>{strongestArea?.icon || "🌟"}</span>
                            <span className="text-xs font-bold text-[#0a0a0a]">
                              Strongest Dimension
                            </span>
                          </div>
                          <span className="rounded-full bg-[#0a0a0a] px-2 py-0.5 text-[10px] font-bold text-white">
                            {strongestArea?.fullSubject || "Attendance"}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#6a6a6a]">
                          {currentStreak > 0
                            ? "Maintain your active weekly attendance streak to unlock new badges and higher karma points!"
                            : "Attend upcoming events to reignite your streak and earn achievement points."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {radarData.map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] p-2.5"
                          >
                            <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#0a0a0a]">
                              <div className="flex items-center gap-1.5">
                                <span>{item.icon}</span>
                                <span>{item.fullSubject}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono font-medium text-[#6a6a6a]">
                                  {item.raw}
                                </span>
                                <span className="py-0.2 rounded border border-[#e5e5e5] bg-[#faf5e8] px-1.5 font-mono font-bold text-[#0a0a0a]">
                                  {item.score}%
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f5f0e0]">
                              <div
                                className="h-full rounded-full bg-[#0a0a0a] transition-all duration-500"
                                style={{ width: `${Math.max(4, item.score)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Attendance History */}
                <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="size-4 text-[#0a0a0a]" />
                      <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                        Recent Attendance History
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-[#6a6a6a]">
                      Total {totalAttended} Events
                    </span>
                  </div>

                  {attendances.length > 0 ? (
                    <div className="divide-y divide-[#f0f0f0]">
                      {attendances.slice(0, 5).map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-[10px] px-1 py-3 transition-colors hover:bg-[#faf5e8]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#faf5e8] text-xs font-bold text-[#0a0a0a]">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
                                {att.event_title}
                              </p>
                              <p className="text-xs text-[#6a6a6a]">
                                {new Date(
                                  att.scanned_at || att.event_date
                                ).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a]">
                            +50 Pts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 py-8 text-center text-[#6a6a6a]">
                      <CalendarIcon className="mx-auto size-8 text-[#6a6a6a]/40" />
                      <p className="text-xs font-bold text-[#0a0a0a]">
                        No recorded attendance yet
                      </p>
                      <p className="text-xs">
                        Present your digital QR code to an organizer at events
                        to log attendance.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: BADGES & ACHIEVEMENTS */}
            {activeTab === "badges" && (
              <div className="animate-in space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs duration-200 fade-in sm:p-6">
                <div className="flex flex-col justify-between gap-2 border-b border-[#e5e5e5] pb-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                      Badge Collection & Achievements
                    </h3>
                    <p className="text-xs text-[#6a6a6a]">
                      Milestones earned through attendance, streaks, and
                      community participation
                    </p>
                  </div>
                  <span className="self-start rounded-[8px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-1 text-xs font-bold text-[#0a0a0a] sm:self-auto">
                    🏆 {badges.filter((b) => Boolean(b.earned_at)).length} of{" "}
                    {badges.length} Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
                  {badges.map((badge) => {
                    const isEarned = Boolean(badge.earned_at)
                    return (
                      <button
                        key={badge.badge_id}
                        type="button"
                        onClick={() => setSelectedBadge(badge)}
                        className={`flex cursor-pointer flex-col items-center rounded-[14px] border p-4 text-center transition-all hover:shadow-sm active:scale-98 ${
                          isEarned
                            ? "border-[#e5e5e5] bg-[#faf5e8] shadow-xs"
                            : "border-[#e5e5e5] bg-[#fffaf0] opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
                        }`}
                      >
                        <div className="mb-2 flex size-14 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-2xl shadow-2xs">
                          {badge.icon_url}
                        </div>
                        <p className="line-clamp-1 text-xs font-bold text-[#0a0a0a]">
                          {badge.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-[#6a6a6a]">
                          {badge.description}
                        </p>
                        <span
                          className={`mt-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isEarned
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border border-neutral-200 bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {isEarned ? "Unlocked" : "Locked"}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: DIGITAL & PHYSICAL MEMBER ID */}
            {activeTab === "card" && (
              <div className="grid animate-in grid-cols-1 items-start gap-5 duration-200 fade-in lg:grid-cols-12">
                {/* Digital QR Scan Box */}
                <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6 lg:col-span-6">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div className="flex items-center gap-2">
                      <QrCodeIcon className="size-4 text-[#0a0a0a]" />
                      <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                        Rapid Check-in QR Code
                      </h3>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-6">
                    <div className="rounded-[14px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-xs">
                      {memberId ? (
                        <QRCode
                          value={memberId}
                          size={150}
                          style={{
                            height: "auto",
                            maxWidth: "100%",
                            width: "150px",
                          }}
                          viewBox="0 0 256 256"
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center text-[10px] font-semibold text-[#9a9a9a]"
                          style={{ height: "150px", width: "150px" }}
                        >
                          QR unavailable
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 text-center">
                      <p className="font-mono text-sm font-bold text-[#0a0a0a] sm:text-base">
                        {memberId}
                      </p>
                      <p className="text-xs text-[#6a6a6a]">
                        Show this QR code to organizers when checking into
                        events
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyNumber(memberId)}
                      className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] sm:text-sm"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Copy Member ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrintModal(true)}
                      className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:text-sm"
                    >
                      <PrinterIcon className="size-3.5" />
                      <span>Print Card</span>
                    </button>
                  </div>
                </div>

                {/* Physical Card Preview Mockup */}
                <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6 lg:col-span-6">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div className="flex items-center gap-2">
                      <PrinterIcon className="size-4 text-[#0a0a0a]" />
                      <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                        Physical PVC Card Preview
                      </h3>
                    </div>
                    <span className="text-xs font-medium text-[#6a6a6a]">
                      Standard CR-80 Format
                    </span>
                  </div>

                  {/* Realistic Card Mockup */}
                  <div className="relative flex aspect-[85.6/54] flex-col justify-between space-y-3 overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#0a0a0a] p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-[6px] bg-[#e8b94a] text-xs font-black text-[#0a0a0a]">
                          S
                        </div>
                        <div>
                          <p className="text-[11px] leading-none font-bold tracking-tight text-white uppercase">
                            Sekkha Community
                          </p>
                          <p className="text-[8.5px] text-[#e8b94a]">
                            OFFICIAL MEMBERSHIP CARD
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[8.5px] font-bold text-white uppercase">
                        {roleLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5 py-1">
                      <div className="shrink-0 rounded-[10px] bg-white p-1.5 shadow-md">
                        {memberId ? (
                          <QRCode
                            value={memberId}
                            size={70}
                            style={{ height: "70px", width: "70px" }}
                            viewBox="0 0 256 256"
                          />
                        ) : (
                          <div
                            className="flex items-center justify-center text-[8px] font-semibold text-[#9a9a9a]"
                            style={{ height: "70px", width: "70px" }}
                          >
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div>
                          <p className="text-[8px] font-bold text-white/70 uppercase">
                            Full Name
                          </p>
                          <p className="truncate text-xs leading-tight font-bold text-white">
                            {displayName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-white/70 uppercase">
                            Member ID
                          </p>
                          <p className="font-mono text-xs font-bold text-[#e8b94a]">
                            {memberId}
                          </p>
                        </div>
                        {school ? (
                          <p className="truncate text-[9px] text-white/80">
                            🏫 {school}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/20 pt-1 text-[7.5px] text-white/60">
                      <span>Sekkha Official Membership</span>
                      <span>Lifetime Validity</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:text-sm"
                  >
                    <PrinterIcon className="size-4" />
                    <span>Print Membership Card</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS & ACCOUNT */}
            {activeTab === "settings" && (
              <div className="animate-in space-y-4 duration-200 fade-in">
                {/* Change Password Card */}
                <div className="flex flex-col items-start justify-between gap-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a]">
                      <KeyIcon className="size-4.5 text-[#0a0a0a]" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                        Account Password
                      </h3>
                      <p className="text-xs text-[#6a6a6a]">
                        Update your login password regularly to protect your
                        account and attendance records.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm({
                        current_password: "",
                        new_password: "",
                        confirm_password: "",
                      })
                      setShowChangePasswordModal(true)
                    }}
                    className="h-11 shrink-0 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:text-sm"
                  >
                    Change Password
                  </button>
                </div>

                {/* Account Security & Logout Section */}
                <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
                  <h3 className="border-b border-[#e5e5e5] pb-3 text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Security & Active Session
                  </h3>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a]">
                          <UserIcon className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
                            Personal Profile Details
                          </p>
                          <p className="text-xs text-[#6a6a6a]">
                            Full name, login username, WhatsApp number, and
                            birthday
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenEditModal}
                        className="cursor-pointer text-xs font-bold text-[#0a0a0a] hover:underline"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-[12px] border border-rose-200 bg-rose-50 p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-[8px] bg-rose-100 text-rose-600">
                          <LogOutIcon className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-rose-950 sm:text-sm">
                            Log Out
                          </p>
                          <p className="text-xs text-rose-700">
                            End your active session on this browser
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={logout}
                        className="h-9 cursor-pointer rounded-[8px] bg-rose-600 px-3.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700"
                      >
                        Log Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL 1: EDIT PROFILE ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 text-left shadow-2xl sm:p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <UserIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Edit Profile Information
                  </h3>
                  <p className="text-xs text-[#6a6a6a]">
                    Update your personal account details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Read-Only Account Identity Info Banner */}
            <div className="space-y-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  Member ID
                </span>
                <span className="rounded border border-[#e5e5e5] bg-[#fffaf0] px-2 py-0.5 font-mono font-bold text-[#0a0a0a]">
                  {memberId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  Registered Email
                </span>
                <span className="font-semibold text-[#0a0a0a]">
                  {profile?.email || authState.email || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  Account Role
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${roleBadgeStyle[role] || roleBadgeStyle.umat}`}
                >
                  {role}
                </span>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Michael Jordan"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Login Username{" "}
                  <span className="text-[11px] font-normal text-[#6a6a6a]">
                    (Unique handle for login)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-xs font-bold text-[#6a6a6a]">
                    @
                  </span>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_.]/g, ""),
                      }))
                    }
                    placeholder="username.handle"
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-3.5 pl-8 font-mono text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                  />
                </div>
              </div>

              {/* Phone / WhatsApp */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="e.g. +628123456789"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                />
              </div>

              {/* School / College */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  School / College / Organization
                </label>
                <input
                  type="text"
                  value={editForm.school}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, school: e.target.value }))
                  }
                  placeholder="e.g. Universitas Indonesia"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                />
              </div>

              {/* Birth Date & Gender */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0a0a0a]">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={editForm.birth_date}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        birth_date: e.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0a0a0a]">
                    Gender
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        gender: e.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 border-t border-[#e5e5e5] pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50 sm:text-sm"
                >
                  {savingProfile ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckIcon className="size-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PRINT PHYSICAL CARD PREVIEW ── */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 text-left shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2">
                <PrinterIcon className="size-4.5 text-[#0a0a0a]" />
                <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                  Print Physical Membership Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Realistic Physical Card Preview (CR-80 Format) */}
            <div className="relative flex aspect-[85.6/54] flex-col justify-between space-y-3 overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#0a0a0a] p-5 text-white shadow-lg">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-[6px] bg-[#e8b94a] text-xs font-black text-[#0a0a0a]">
                    S
                  </div>
                  <div>
                    <p className="text-[11px] leading-none font-bold tracking-tight text-white uppercase">
                      Sekkha Community
                    </p>
                    <p className="text-[8.5px] text-[#e8b94a]">
                      OFFICIAL MEMBERSHIP CARD
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[8.5px] font-bold text-white uppercase">
                  {roleLabel}
                </span>
              </div>

              <div className="flex items-center gap-3.5 py-1">
                <div className="shrink-0 rounded-[10px] bg-white p-1.5 shadow-md">
                  {memberId ? (
                    <QRCode
                      value={memberId}
                      size={70}
                      style={{ height: "70px", width: "70px" }}
                      viewBox="0 0 256 256"
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center text-[8px] font-semibold text-[#9a9a9a]"
                      style={{ height: "70px", width: "70px" }}
                    >
                      —
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div>
                    <p className="text-[8px] font-bold text-white/70 uppercase">
                      Full Name
                    </p>
                    <p className="truncate text-xs leading-tight font-bold text-white">
                      {displayName}
                    </p>
                  </div>

                  <div>
                    <p className="text-[8px] font-bold text-white/70 uppercase">
                      Member ID
                    </p>
                    <p className="font-mono text-xs font-bold text-[#e8b94a]">
                      {memberId}
                    </p>
                  </div>

                  {school ? (
                    <div className="truncate">
                      <p className="text-[8px] text-white/70 uppercase">
                        Organization
                      </p>
                      <p className="truncate text-[9px] font-medium text-white/90">
                        {school}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/20 pt-1 text-[7.5px] text-white/60">
                <span>Sekkha Official Membership</span>
                <span>Lifetime Validity</span>
              </div>
            </div>

            <p className="text-center text-xs leading-relaxed text-[#6a6a6a]">
              💡 When printing, only the official ID Card above will be sent to
              the printer.
            </p>

            <div className="flex gap-2 border-t border-[#e5e5e5] pt-1">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] sm:text-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:text-sm"
              >
                <PrinterIcon className="size-4" />
                <span>Print Card Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: BADGE DETAILS ── */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative w-full max-w-sm space-y-3.5 rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
            >
              <XIcon className="size-5" />
            </button>

            <div className="mx-auto flex size-20 items-center justify-center rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] text-4xl shadow-xs">
              {selectedBadge.icon_url}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0a0a0a]">
                {selectedBadge.name}
              </h3>
              <p className="text-xs leading-relaxed text-[#6a6a6a]">
                {selectedBadge.description}
              </p>
            </div>

            <div className="rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-xs text-[#6a6a6a]">
              {selectedBadge.earned_at ? (
                <p className="flex items-center justify-center gap-1 font-bold text-emerald-800">
                  <CheckCircleIcon className="size-4 text-emerald-600" />
                  <span>
                    Unlocked on{" "}
                    {new Date(selectedBadge.earned_at).toLocaleDateString(
                      "en-US",
                      { month: "long", year: "numeric" }
                    )}
                  </span>
                </p>
              ) : (
                <p className="font-medium text-[#6a6a6a]">
                  This badge is currently locked. Keep attending and
                  participating!
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="h-11 w-full cursor-pointer rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CHANGE PASSWORD ── */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative w-full max-w-md space-y-4 rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 text-left shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <KeyIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Change Password
                  </h3>
                  <p className="text-xs text-[#6a6a6a]">
                    Update your account credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      current_password: e.target.value,
                    })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      new_password: e.target.value,
                    })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repeat new password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirm_password: e.target.value,
                    })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                />
              </div>

              <div className="flex gap-2 border-t border-[#e5e5e5] pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50 sm:text-sm"
                >
                  {savingPassword ? "Saving..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. ISOLATED PRINTABLE PHYSICAL ID CARD (Only visible during window.print()) ── */}
      <div
        id="printable-vihara-card"
        className="box-border hidden flex-col justify-between overflow-hidden rounded-xl border-2 border-black bg-white p-4 text-black print:flex"
        style={{ width: "85.6mm", height: "54mm", pageBreakInside: "avoid" }}
      >
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex size-6 items-center justify-center rounded bg-black text-xs font-black text-white">
              S
            </div>
            <div>
              <p className="text-[10px] leading-none font-bold tracking-tight text-black uppercase">
                Sekkha Community
              </p>
              <p className="text-[7.5px] font-semibold tracking-wider text-[#6a6a6a]">
                OFFICIAL MEMBERSHIP CARD
              </p>
            </div>
          </div>
          <span className="rounded border border-black px-1.5 py-0.5 text-[8px] font-bold text-black uppercase">
            {roleLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 py-1">
          <div className="shrink-0 rounded border border-[#e5e5e5] bg-white p-1">
            {memberId ? (
              <QRCode
                value={memberId}
                size={64}
                style={{ height: "64px", width: "64px" }}
                viewBox="0 0 256 256"
              />
            ) : (
              <div
                className="flex items-center justify-center text-[7.5px] font-semibold text-[#9a9a9a]"
                style={{ height: "64px", width: "64px" }}
              >
                —
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1 text-left">
            <div>
              <p className="text-[7.5px] font-bold text-[#6a6a6a] uppercase">
                Full Name
              </p>
              <p className="truncate text-[11px] leading-tight font-bold text-black">
                {displayName}
              </p>
            </div>

            <div>
              <p className="text-[7.5px] font-bold text-[#6a6a6a] uppercase">
                Member ID
              </p>
              <p className="font-mono text-[10px] font-bold text-black">
                {memberId}
              </p>
            </div>

            {school ? (
              <div className="truncate">
                <p className="text-[7px] text-[#6a6a6a] uppercase">
                  Organization
                </p>
                <p className="truncate text-[8.5px] font-semibold text-black">
                  {school}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#e5e5e5] pt-1 text-[7px] font-semibold text-[#6a6a6a]">
          <span>Sekkha Official Membership</span>
          <span>Lifetime Validity</span>
        </div>
      </div>

      {/* ── MOBILE-ONLY QUICK ACTIONS BAR ──
          Surfaces Settings + Logout directly on mobile since the desktop
          sidebar (where these live) is hidden below the `md` breakpoint.
          Sits above the MobileDock and below the dock's safe zone. */}
      <div className="fixed right-3 bottom-[88px] left-3 z-40 mx-auto max-w-md font-sans md:hidden">
        <div className="flex items-center gap-2 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/95 p-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] px-3 py-2 text-[11px] font-bold text-[#0a0a0a] transition-all hover:bg-[#f5f0e0] active:scale-[0.98]"
          >
            <SettingsIcon className="size-3.5" />
            <span>Settings</span>
          </button>
          <div className="h-5 w-px bg-[#e5e5e5]" aria-hidden="true" />
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] px-3 py-2 text-[11px] font-bold text-rose-600 transition-all hover:bg-rose-50 active:scale-[0.98]"
          >
            <LogOutIcon className="size-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Settings modal — reuses the same component the desktop sidebar opens */}
      <ResponsiveFormModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Settings & Goals"
        description="Manage your goals, account preferences, and privacy."
      >
        <SettingsSection
          onLogout={() => {
            setSettingsOpen(false)
            logout()
          }}
          onClose={() => setSettingsOpen(false)}
        />
      </ResponsiveFormModal>
    </main>
  )
}
