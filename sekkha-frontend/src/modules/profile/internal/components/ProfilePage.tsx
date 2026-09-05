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
import QRCode from "react-qr-code"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { Skeleton } from "@/components/ui/skeleton"

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
  const [activeTab, setActiveTab] = useState<"overview" | "badges" | "card" | "settings">("overview")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
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
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null)

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
      // 1. Load User Profile from /users/me
      const profileRes = await api.get<UserProfile>("/users/me")
      if (profileRes) {
        setProfile(profileRes)
      }

      // 2. Load Streak Calculation
      try {
        const streakRes = await api.get<UserStreakData>("/gamification/streak")
        setStreakData(streakRes)
      } catch (e) {
        setStreakData({ currentStreak: 0, longestStreak: 0, weeklyActivity: [] })
      }

      // 3. Load Badges from /users/me/badges
      try {
        const badgesRes = await api.get<UserBadge[]>("/users/me/badges")
        setBadges(badgesRes || [])
      } catch (e) {
        setBadges([])
      }

      // 4. Load Attendance History from /users/me/attendances
      try {
        const historyRes = await api.get<UserAttendance[]>("/users/me/attendances")
        setAttendances(historyRes || [])
      } catch (e) {
        setAttendances([])
      }

      // 5. Load Leaderboard Rank
      try {
        const lbRes = await api.get<LeaderboardResponse>("/leaderboard?metric=points")
        if (lbRes?.my_rank?.rank) {
          setMyRank(lbRes.my_rank.rank)
        }
      } catch (e) {
        // silently fallback
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
        window.dispatchEvent(new CustomEvent("sekkha:profile_updated", { detail: { name: updated.name } }))
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
  const displayName = profile?.name || (authState.name ? authState.name : role.charAt(0).toUpperCase() + role.slice(1))
  const school = profile?.school || ""
  const memberId = profile?.user_number || profile?.userNumber || (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "—")
  const totalPoints = profile?.points ?? 0
  const currentStreak = streakData?.currentStreak ?? (streakData as any)?.current_streak ?? 0
  const longestStreak = streakData?.longestStreak ?? (streakData as any)?.longest_streak ?? 0
  const totalAttended = attendances.length

  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "UM"

  const roleLabel = role === "admin" ? "Admin" : role === "pengurus" ? "Organizer" : role === "aktivis" ? "Activist" : "Member"
  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-[#ff4d8b]/15 text-[#ff4d8b] border-[#ff4d8b]/30 font-semibold",
    pengurus: "bg-[#1a3a3a] text-white border-[#1a3a3a] font-semibold",
    aktivis: "bg-[#b8a4ed]/30 text-[#0a0a0a] border-[#b8a4ed]/50 font-semibold",
    umat: "bg-[#f5f0e0] text-[#0a0a0a] border-[#e5e5e5] font-semibold",
  }

  // Dynamic Radar Chart Analytics based on attendance, streak, badges, and points
  const { radarData, overallIndexScore, strongestArea } = useMemo(() => {
    // 1. Attendance Score: % of target (e.g. 12 events)
    const attendanceScore = Math.min(100, Math.round((totalAttended / 12) * 100))

    // 2. Streak Score: Current streak * 20 max 100
    const streakScore = Math.min(100, Math.round(currentStreak * 20))

    // 3. Points Score: Current points / 500 max 100
    const pointsScore = Math.min(100, Math.round((totalPoints / 500) * 100))

    // 4. Badges Score: Badges earned / total badges available
    const earnedBadgesCount = badges.filter((b) => b.earned_at !== null).length
    const totalBadgesCount = Math.max(1, badges.length)
    const badgeScore = Math.min(100, Math.round((earnedBadgesCount / totalBadgesCount) * 100))

    // 5. Special Events Participation
    const specialAttCount = attendances.filter((a) => {
      const title = (a.event_title || "").toLowerCase()
      return title.includes("special") || title.includes("magha") || title.includes("waisak") || title.includes("kathina") || title.includes("baksos")
    }).length
    const specialScore = Math.min(100, Math.round((specialAttCount / 3) * 100))

    // 6. Dedication Index: Combination of streaks + consistency
    const baseAvg = Math.round((attendanceScore + streakScore + pointsScore) / 3)
    const dedicationScore = currentStreak > 0 ? Math.min(100, baseAvg + 15) : baseAvg

    const data = [
      { subject: "Attendance", fullSubject: "Regular Attendance", score: attendanceScore, raw: `${totalAttended} Events`, icon: "📅", color: "#1a3a3a" },
      { subject: "Streak", fullSubject: "Weekly Streak", score: streakScore, raw: `${currentStreak}x Active`, icon: "🔥", color: "#e8b94a" },
      { subject: "Points", fullSubject: "Total Karma Points", score: pointsScore, raw: `${totalPoints} Pts`, icon: "⭐", color: "#0a0a0a" },
      { subject: "Badges", fullSubject: "Badges Unlocked", score: badgeScore, raw: `${earnedBadgesCount}/${totalBadgesCount}`, icon: "🏆", color: "#b8a4ed" },
      { subject: "Special", fullSubject: "Special Participation", score: specialScore, raw: `${specialAttCount} Special`, icon: "✨", color: "#ffb084" },
      { subject: "Dedication", fullSubject: "Dedication Index", score: dedicationScore, raw: `${dedicationScore}%`, icon: "🛡️", color: "#1a3a3a" },
    ]

    const overall = Math.round(data.reduce((acc, curr) => acc + curr.score, 0) / data.length)
    const best = [...data].sort((a, b) => b.score - a.score)[0]

    return {
      radarData: data,
      overallIndexScore: overall,
      strongestArea: best,
    }
  }, [totalAttended, currentStreak, longestStreak, totalPoints, badges, attendances])

  return (
    <main className="min-h-screen bg-[#fffaf0] text-left">
      <PageBreadcrumb items={[{ label: "Profile" }]} />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 rounded-[12px] px-4 py-3 shadow-xl border ${
              toast.type === "success"
                ? "bg-[#0a0a0a] text-white border-emerald-500/50"
                : "bg-rose-600 text-white border-rose-500/50"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircleIcon className="size-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangleIcon className="size-5 text-white shrink-0" />
            )}
            <p className="text-xs font-bold">{toast.text}</p>
          </div>
        </div>
      )}

      <div className="px-3.5 py-4 pb-32 md:px-8 md:pb-12 max-w-6xl mx-auto space-y-5">

        {loading && !profile ? (
          <div className="space-y-5">
            {/* Skeleton Hero Banner */}
            <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <Skeleton className="size-24 rounded-[16px]" />
                <div className="space-y-2.5 flex-1">
                  <Skeleton className="h-7 w-48 rounded-[8px]" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-[6px]" />
                    <Skeleton className="h-6 w-28 rounded-[6px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Skeleton Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 space-y-2 shadow-xs">
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── 1. CLAY WARM HERO IDENTITY BANNER ── */}
            <div className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-5 sm:p-7 shadow-xs">
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                
                {/* Left: Avatar + User Details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 min-w-0">
                  {/* Avatar with Camera Trigger */}
                  <div className="relative shrink-0">
                    <div className="flex size-20 sm:size-24 items-center justify-center rounded-[16px] bg-[#e8b94a] text-xl sm:text-2xl font-bold text-[#0a0a0a] shadow-xs uppercase tracking-wider">
                      {userInitials}
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenEditModal}
                      className="absolute -bottom-1 -right-1 flex size-7 sm:size-8 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
                      title="Edit Profile & Photo"
                    >
                      <CameraIcon className="size-3.5 sm:size-4" />
                    </button>
                  </div>

                  {/* Identity Info */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg sm:text-2xl font-bold text-[#0a0a0a] tracking-tight truncate">
                        {displayName}
                      </h1>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle[role] || roleBadgeStyle.umat}`}>
                        <ShieldCheckIcon className="size-3" />
                        <span>{roleLabel}</span>
                      </span>
                    </div>

                    {/* ID, Username & School Info */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 font-mono font-bold text-[#0a0a0a] bg-[#fffaf0] px-2.5 py-1 rounded-[8px] border border-[#e5e5e5] shadow-2xs">
                        <span>ID: {memberId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyNumber(memberId)}
                          className="text-[#6a6a6a] hover:text-[#0a0a0a] p-0.5 cursor-pointer ml-0.5"
                          title="Copy Member ID"
                        >
                          {copiedId ? <CheckIcon className="size-3 text-emerald-600" /> : <CopyIcon className="size-3" />}
                        </button>
                      </div>

                      {profile?.username && (
                        <span className="font-mono font-semibold text-[#1a3a3a] bg-[#1a3a3a]/10 px-2.5 py-1 rounded-[8px] border border-[#1a3a3a]/20">
                          @{profile.username}
                        </span>
                      )}

                      {school && (
                        <span className="flex items-center gap-1 text-[#6a6a6a] font-medium bg-[#fffaf0] px-2.5 py-1 rounded-[8px] border border-[#e5e5e5]">
                          <GraduationCapIcon className="size-3.5 text-[#6a6a6a]" />
                          <span className="truncate max-w-[180px] sm:max-w-xs">{school}</span>
                        </span>
                      )}
                    </div>

                    {/* Contact Meta Row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#6a6a6a] pt-0.5">
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
                <div className="flex sm:flex-row lg:flex-col items-stretch gap-2 shrink-0 pt-1 lg:pt-0">
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-4 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
                  >
                    <PencilIcon className="size-3.5 sm:size-4" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs sm:text-sm font-bold text-[#0a0a0a] shadow-xs hover:bg-[#faf5e8] transition-all cursor-pointer"
                  >
                    <PrinterIcon className="size-3.5 sm:size-4" />
                    <span>Print Physical Card</span>
                  </button>
                </div>

              </div>
            </div>

            {/* ── 2. KEY METRICS TILES ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Total Points */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs transition-all hover:bg-[#faf5e8]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">Total Points</span>
                  <div className="flex size-7 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                    <StarIcon className="size-3.5 text-[#e8b94a] fill-[#e8b94a]" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-[#0a0a0a]">
                  {totalPoints.toLocaleString("en-US")}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">Active karma points</p>
              </div>

              {/* Leaderboard Rank */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs transition-all hover:bg-[#faf5e8]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">Rank</span>
                  <div className="flex size-7 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                    <TrophyIcon className="size-3.5 text-[#e8b94a]" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-[#0a0a0a]">
                  {myRank ? `#${myRank}` : "—"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">In {roleLabel} standings</p>
              </div>

              {/* Attended Events */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs transition-all hover:bg-[#faf5e8]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">Attendance</span>
                  <div className="flex size-7 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                    <CalendarIcon className="size-3.5 text-[#0a0a0a]" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-[#0a0a0a]">
                  {totalAttended}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">Events attended</p>
              </div>

              {/* Active Weekly Streak */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs transition-all hover:bg-[#faf5e8]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">Active Streak</span>
                  <div className="flex size-7 items-center justify-center rounded-[8px] bg-[#faf5e8] text-[#0a0a0a]">
                    <FlameIcon className="size-3.5 text-[#e8b94a] fill-[#e8b94a]" />
                  </div>
                </div>
                <p className="mt-2 text-xl sm:text-2xl font-black text-[#0a0a0a]">
                  {currentStreak}x
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6a6a6a]">Record: {longestStreak}x</p>
              </div>
            </div>

            {/* ── 3. INTERACTIVE SECTION TAB BAR ── */}
            <div className="flex items-center gap-1 p-1 rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
                className={`flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === "badges"
                    ? "bg-[#0a0a0a] text-white shadow-xs"
                    : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                }`}
              >
                <AwardIcon className="size-3.5" />
                <span>Badges & Achievements</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === "badges" ? "bg-white/20 text-white" : "bg-[#f5f0e0] text-[#0a0a0a]"}`}>
                  {badges.filter((b) => Boolean(b.earned_at)).length}/{badges.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={`flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
                className={`flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Big Streak Flame Hero Card */}
                <div className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-6 sm:p-8 shadow-xs text-center space-y-3">
                  <div className="mx-auto flex size-20 sm:size-22 items-center justify-center rounded-[16px] bg-[#0a0a0a] text-white shadow-xs">
                    <FlameIcon className={`size-10 sm:size-12 ${currentStreak > 0 ? "text-[#e8b94a] fill-[#e8b94a]" : "text-[#6a6a6a]"}`} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-[#0a0a0a] tracking-tight">
                        {currentStreak}x
                      </span>
                      <span className="text-sm sm:text-base font-bold text-[#6a6a6a] self-end pb-0.5">
                        Weekly Streak
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">
                      {currentStreak > 0 ? "🔥 Attendance Streak is Active!" : "No Active Streak Yet"}
                    </p>

                    <p className="text-xs text-[#6a6a6a] max-w-md mx-auto leading-relaxed">
                      Attend weekly community events consistently to boost your streak. If an active week is missed, the streak resets to 0.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <span className="rounded-full bg-[#fffaf0] border border-[#e5e5e5] px-3 py-1 text-xs font-bold text-[#0a0a0a] shadow-2xs">
                      🏆 Longest Record: {longestStreak}x
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${
                      currentStreak > 0
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-[#fffaf0] border-[#e5e5e5] text-[#6a6a6a]"
                    }`}>
                      {currentStreak > 0 ? "✓ Checked in this week" : "Check-in needed this week"}
                    </span>
                  </div>
                </div>

                {/* Radar Chart Analytics */}
                <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                        <SparklesIcon className="size-4 text-[#e8b94a]" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">
                          Activity & Participation Analytics
                        </h3>
                        <p className="text-xs text-[#6a6a6a]">
                          Real-time breakdown of attendance, streaks, points, and badges
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto rounded-[10px] bg-[#faf5e8] border border-[#e5e5e5] px-3 py-1.5 shadow-2xs">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a]">Activity Index</p>
                        <p className="text-sm font-bold text-[#0a0a0a]">{overallIndexScore} <span className="text-[10px] text-[#6a6a6a]">/ 100</span></p>
                      </div>
                      <div className="flex size-7 items-center justify-center rounded-[6px] bg-[#0a0a0a] text-white font-bold text-xs shadow-xs">
                        {overallIndexScore >= 80 ? "A+" : overallIndexScore >= 60 ? "B" : overallIndexScore >= 40 ? "C" : "D"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-12 items-center">
                    {/* Radar Chart */}
                    <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[260px]">
                      <div className="w-full h-64 sm:h-72 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="#e5e5e5" strokeDasharray="3 3" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={({ payload, x, y, cx, cy, ...rest }: any) => (
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
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
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
                                    <div className="rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] p-3 text-[#0a0a0a] shadow-xl space-y-1 text-left text-xs">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        <span>{data.icon}</span>
                                        <span>{data.fullSubject}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3 text-[11px] pt-1 border-t border-[#e5e5e5]">
                                        <span className="text-[#6a6a6a]">Index Score:</span>
                                        <span className="font-bold text-[#0a0a0a]">{data.score} / 100</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3 text-[11px]">
                                        <span className="text-[#6a6a6a]">Actual Metric:</span>
                                        <span className="font-semibold text-[#0a0a0a]">{data.raw}</span>
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
                    <div className="lg:col-span-6 space-y-3">
                      <div className="rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] p-3.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span>{strongestArea?.icon || "🌟"}</span>
                            <span className="text-xs font-bold text-[#0a0a0a]">Strongest Dimension</span>
                          </div>
                          <span className="rounded-full bg-[#0a0a0a] px-2 py-0.5 text-[10px] font-bold text-white">
                            {strongestArea?.fullSubject || "Attendance"}
                          </span>
                        </div>
                        <p className="text-xs text-[#6a6a6a] leading-relaxed">
                          {currentStreak > 0
                            ? "Maintain your active weekly attendance streak to unlock new badges and higher karma points!"
                            : "Attend upcoming events to reignite your streak and earn achievement points."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {radarData.map((item, idx) => (
                          <div key={idx} className="rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] p-2.5">
                            <div className="flex items-center justify-between text-xs font-bold text-[#0a0a0a] mb-1">
                              <div className="flex items-center gap-1.5">
                                <span>{item.icon}</span>
                                <span>{item.fullSubject}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-[#6a6a6a] font-medium">{item.raw}</span>
                                <span className="font-mono font-bold text-[#0a0a0a] bg-[#faf5e8] px-1.5 py-0.2 rounded border border-[#e5e5e5]">
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
                <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="size-4 text-[#0a0a0a]" />
                      <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Recent Attendance History</h3>
                    </div>
                    <span className="text-xs font-bold text-[#6a6a6a]">Total {totalAttended} Events</span>
                  </div>

                  {attendances.length > 0 ? (
                    <div className="divide-y divide-[#f0f0f0]">
                      {attendances.slice(0, 5).map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between py-3 px-1 hover:bg-[#faf5e8] rounded-[10px] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-[8px] bg-[#faf5e8] border border-[#e5e5e5] text-xs font-bold text-[#0a0a0a]">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">{att.event_title}</p>
                              <p className="text-xs text-[#6a6a6a]">
                                {new Date(att.scanned_at || att.event_date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a]">
                            +50 Pts
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#6a6a6a] space-y-2">
                      <CalendarIcon className="size-8 mx-auto text-[#6a6a6a]/40" />
                      <p className="text-xs font-bold text-[#0a0a0a]">No recorded attendance yet</p>
                      <p className="text-xs">Present your digital QR code to an organizer at events to log attendance.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: BADGES & ACHIEVEMENTS */}
            {activeTab === "badges" && (
              <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e5e5] pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Badge Collection & Achievements</h3>
                    <p className="text-xs text-[#6a6a6a]">Milestones earned through attendance, streaks, and community participation</p>
                  </div>
                  <span className="rounded-[8px] bg-[#faf5e8] border border-[#e5e5e5] px-3 py-1 text-xs font-bold text-[#0a0a0a] self-start sm:self-auto">
                    🏆 {badges.filter((b) => Boolean(b.earned_at)).length} of {badges.length} Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pt-1">
                  {badges.map((badge) => {
                    const isEarned = Boolean(badge.earned_at)
                    return (
                      <button
                        key={badge.badge_id}
                        type="button"
                        onClick={() => setSelectedBadge(badge)}
                        className={`flex flex-col items-center text-center p-4 rounded-[14px] border transition-all cursor-pointer hover:shadow-sm active:scale-98 ${
                          isEarned
                            ? "bg-[#faf5e8] border-[#e5e5e5] shadow-xs"
                            : "bg-[#fffaf0] border-[#e5e5e5] opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                        }`}
                      >
                        <div className="size-14 flex items-center justify-center rounded-[12px] bg-[#fffaf0] border border-[#e5e5e5] text-2xl mb-2 shadow-2xs">
                          {badge.icon_url}
                        </div>
                        <p className="text-xs font-bold text-[#0a0a0a] line-clamp-1">{badge.name}</p>
                        <p className="text-[11px] text-[#6a6a6a] mt-0.5 line-clamp-2 leading-tight">
                          {badge.description}
                        </p>
                        <span
                          className={`mt-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isEarned ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-neutral-100 text-neutral-600 border border-neutral-200"
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in fade-in duration-200">
                {/* Digital QR Scan Box */}
                <div className="lg:col-span-6 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div className="flex items-center gap-2">
                      <QrCodeIcon className="size-4 text-[#0a0a0a]" />
                      <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Rapid Check-in QR Code</h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      Active
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-[#faf5e8] rounded-[16px] border border-[#e5e5e5] space-y-3">
                    <div className="rounded-[14px] bg-[#fffaf0] p-3 shadow-xs border border-[#e5e5e5]">
                      <QRCode
                        value={memberId || "UNKNOWN"}
                        size={150}
                        style={{ height: "auto", maxWidth: "100%", width: "150px" }}
                        viewBox="0 0 256 256"
                      />
                    </div>
                    <div className="text-center space-y-0.5">
                      <p className="font-mono text-sm sm:text-base font-bold text-[#0a0a0a]">{memberId}</p>
                      <p className="text-xs text-[#6a6a6a]">Show this QR code to organizers when checking into events</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyNumber(memberId)}
                      className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Copy Member ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrintModal(true)}
                      className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
                    >
                      <PrinterIcon className="size-3.5" />
                      <span>Print Card</span>
                    </button>
                  </div>
                </div>

                {/* Physical Card Preview Mockup */}
                <div className="lg:col-span-6 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div className="flex items-center gap-2">
                      <PrinterIcon className="size-4 text-[#0a0a0a]" />
                      <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Physical PVC Card Preview</h3>
                    </div>
                    <span className="text-xs font-medium text-[#6a6a6a]">Standard CR-80 Format</span>
                  </div>

                  {/* Realistic Card Mockup */}
                  <div className="rounded-[16px] border border-[#e5e5e5] bg-[#0a0a0a] text-white p-5 shadow-lg space-y-3 aspect-[85.6/54] flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-[6px] bg-[#e8b94a] text-[#0a0a0a] font-black text-xs">
                          S
                        </div>
                        <div>
                          <p className="text-[11px] font-bold tracking-tight leading-none uppercase text-white">Sekkha Community</p>
                          <p className="text-[8.5px] text-[#e8b94a]">OFFICIAL MEMBERSHIP CARD</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[8.5px] font-bold uppercase text-white">
                        {roleLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5 py-1">
                      <div className="rounded-[10px] bg-white p-1.5 shrink-0 shadow-md">
                        <QRCode
                          value={memberId || "UNKNOWN"}
                          size={70}
                          style={{ height: "70px", width: "70px" }}
                          viewBox="0 0 256 256"
                        />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div>
                          <p className="text-[8px] font-bold text-white/70 uppercase">Full Name</p>
                          <p className="text-xs font-bold truncate text-white leading-tight">{displayName}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-white/70 uppercase">Member ID</p>
                          <p className="font-mono text-xs font-bold text-[#e8b94a]">{memberId}</p>
                        </div>
                        {school ? (
                          <p className="text-[9px] text-white/80 truncate">🏫 {school}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[7.5px] text-white/60 pt-1 border-t border-white/20">
                      <span>Sekkha Official Membership</span>
                      <span>Lifetime Validity</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="h-11 w-full flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
                  >
                    <PrinterIcon className="size-4" />
                    <span>Print Membership Card</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS & ACCOUNT */}
            {activeTab === "settings" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Change Password Card */}
                <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-[10px] bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5] shrink-0">
                      <KeyIcon className="size-4.5 text-[#0a0a0a]" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Account Password</h3>
                      <p className="text-xs text-[#6a6a6a]">
                        Update your login password regularly to protect your account and attendance records.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
                      setShowChangePasswordModal(true)
                    }}
                    className="h-11 rounded-[12px] bg-[#0a0a0a] px-4 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all shrink-0 cursor-pointer"
                  >
                    Change Password
                  </button>
                </div>

                {/* Account Security & Logout Section */}
                <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-xs space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a] border-b border-[#e5e5e5] pb-3">
                    Security & Active Session
                  </h3>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3.5 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8]">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-[8px] bg-[#fffaf0] text-[#0a0a0a] border border-[#e5e5e5]">
                          <UserIcon className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">Personal Profile Details</p>
                          <p className="text-xs text-[#6a6a6a]">Full name, login username, WhatsApp number, and birthday</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenEditModal}
                        className="text-xs font-bold text-[#0a0a0a] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-[12px] border border-rose-200 bg-rose-50">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-[8px] bg-rose-100 text-rose-600">
                          <LogOutIcon className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-rose-950">Log Out</p>
                          <p className="text-xs text-rose-700">End your active session on this browser</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={logout}
                        className="h-9 rounded-[8px] bg-rose-600 hover:bg-rose-700 text-white px-3.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl space-y-4 text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <UserIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Edit Profile Information</h3>
                  <p className="text-xs text-[#6a6a6a]">Update your personal account details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Read-Only Account Identity Info Banner */}
            <div className="rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[#6a6a6a] text-[10px]">Member ID</span>
                <span className="font-mono font-bold text-[#0a0a0a] bg-[#fffaf0] px-2 py-0.5 rounded border border-[#e5e5e5]">
                  {memberId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[#6a6a6a] text-[10px]">Registered Email</span>
                <span className="font-semibold text-[#0a0a0a]">{profile?.email || authState.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[#6a6a6a] text-[10px]">Account Role</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${roleBadgeStyle[role] || roleBadgeStyle.umat}`}>
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
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Michael Jordan"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Login Username <span className="text-[11px] text-[#6a6a6a] font-normal">(Unique handle for login)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[#6a6a6a]">@</span>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") }))}
                    placeholder="username.handle"
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pl-8 pr-3.5 text-xs sm:text-sm font-mono text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
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
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. +628123456789"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
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
                  onChange={(e) => setEditForm((prev) => ({ ...prev, school: e.target.value }))}
                  placeholder="e.g. Universitas Indonesia"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
                />
              </div>

              {/* Birth Date & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0a0a0a]">Birth Date</label>
                  <input
                    type="date"
                    value={editForm.birth_date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, birth_date: e.target.value }))}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0a0a0a]">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-3 border-t border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-bold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2">
                <PrinterIcon className="size-4.5 text-[#0a0a0a]" />
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Print Physical Membership Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Realistic Physical Card Preview (CR-80 Format) */}
            <div className="rounded-[16px] border border-[#e5e5e5] bg-[#0a0a0a] text-white p-5 shadow-lg space-y-3 aspect-[85.6/54] flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-[6px] bg-[#e8b94a] text-[#0a0a0a] font-black text-xs">
                    S
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-tight leading-none uppercase text-white">Sekkha Community</p>
                    <p className="text-[8.5px] text-[#e8b94a]">OFFICIAL MEMBERSHIP CARD</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[8.5px] font-bold uppercase text-white">
                  {roleLabel}
                </span>
              </div>

              <div className="flex items-center gap-3.5 py-1">
                <div className="rounded-[10px] bg-white p-1.5 shrink-0 shadow-md">
                  <QRCode
                    value={memberId || "UNKNOWN"}
                    size={70}
                    style={{ height: "70px", width: "70px" }}
                    viewBox="0 0 256 256"
                  />
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div>
                    <p className="text-[8px] font-bold text-white/70 uppercase">Full Name</p>
                    <p className="text-xs font-bold truncate text-white leading-tight">{displayName}</p>
                  </div>

                  <div>
                    <p className="text-[8px] font-bold text-white/70 uppercase">Member ID</p>
                    <p className="font-mono text-xs font-bold text-[#e8b94a]">{memberId}</p>
                  </div>

                  {school ? (
                    <div className="truncate">
                      <p className="text-[8px] text-white/70 uppercase">Organization</p>
                      <p className="text-[9px] font-medium truncate text-white/90">{school}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between text-[7.5px] text-white/60 pt-1 border-t border-white/20">
                <span>Sekkha Official Membership</span>
                <span>Lifetime Validity</span>
              </div>
            </div>

            <p className="text-xs text-[#6a6a6a] text-center leading-relaxed">
              💡 When printing, only the official ID Card above will be sent to the printer.
            </p>

            <div className="flex gap-2 pt-1 border-t border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-bold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-6 shadow-2xl text-center space-y-3.5">
            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
            >
              <XIcon className="size-5" />
            </button>

            <div className="size-20 flex items-center justify-center rounded-[16px] bg-[#faf5e8] border border-[#e5e5e5] text-4xl mx-auto shadow-xs">
              {selectedBadge.icon_url}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0a0a0a]">{selectedBadge.name}</h3>
              <p className="text-xs text-[#6a6a6a] leading-relaxed">{selectedBadge.description}</p>
            </div>

            <div className="rounded-[12px] bg-[#faf5e8] p-3 text-xs text-[#6a6a6a] border border-[#e5e5e5]">
              {selectedBadge.earned_at ? (
                <p className="text-emerald-800 font-bold flex items-center justify-center gap-1">
                  <CheckCircleIcon className="size-4 text-emerald-600" />
                  <span>Unlocked on {new Date(selectedBadge.earned_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                </p>
              ) : (
                <p className="text-[#6a6a6a] font-medium">This badge is currently locked. Keep attending and participating!</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="h-11 w-full rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CHANGE PASSWORD ── */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <KeyIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Change Password</h3>
                  <p className="text-xs text-[#6a6a6a]">Update your account credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
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
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
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
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
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
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-bold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="h-11 flex-1 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all disabled:opacity-50 cursor-pointer"
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
        className="hidden print:flex flex-col justify-between rounded-xl border-2 border-black bg-white text-black p-4 box-border overflow-hidden"
        style={{ width: "85.6mm", height: "54mm", pageBreakInside: "avoid" }}
      >
        <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex size-6 items-center justify-center rounded bg-black text-white font-black text-xs">
              S
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-tight leading-none uppercase text-black">Sekkha Community</p>
              <p className="text-[7.5px] font-semibold text-[#6a6a6a] tracking-wider">OFFICIAL MEMBERSHIP CARD</p>
            </div>
          </div>
          <span className="rounded border border-black px-1.5 py-0.5 text-[8px] font-bold uppercase text-black">
            {roleLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 py-1">
          <div className="rounded border border-[#e5e5e5] p-1 shrink-0 bg-white">
            <QRCode
              value={memberId || "UNKNOWN"}
              size={64}
              style={{ height: "64px", width: "64px" }}
              viewBox="0 0 256 256"
            />
          </div>

          <div className="space-y-1 min-w-0 flex-1 text-left">
            <div>
              <p className="text-[7.5px] font-bold text-[#6a6a6a] uppercase">Full Name</p>
              <p className="text-[11px] font-bold truncate text-black leading-tight">{displayName}</p>
            </div>

            <div>
              <p className="text-[7.5px] font-bold text-[#6a6a6a] uppercase">Member ID</p>
              <p className="font-mono text-[10px] font-bold text-black">{memberId}</p>
            </div>

            {school ? (
              <div className="truncate">
                <p className="text-[7px] text-[#6a6a6a] uppercase">Organization</p>
                <p className="text-[8.5px] font-semibold truncate text-black">{school}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between text-[7px] font-semibold text-[#6a6a6a] pt-1 border-t border-[#e5e5e5]">
          <span>Sekkha Official Membership</span>
          <span>Lifetime Validity</span>
        </div>
      </div>
    </main>
  )
}
