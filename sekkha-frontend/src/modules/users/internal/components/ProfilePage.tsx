import { useState, useEffect } from "react"
import {
  IdCardIcon,
  UserIcon,
  ShieldCheckIcon,
  CopyIcon,
  CheckIcon,
  GraduationCapIcon,
  MailIcon,
  PhoneIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/base"

import { userApi } from "../api/userApi"
import type { UserProfileDto } from "../api/userApi"
import { DigitalMemberCard } from "./DigitalMemberCard"
import { PointsLedger } from "./PointsLedger"
import { PersonalProfileSection } from "./PersonalProfileSection"
import { SecuritySettingsSection } from "./SecuritySettingsSection"

export function ProfilePage() {
  const { authState, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"card" | "profile" | "security">("card")
  const [copiedId, setCopiedId] = useState(false)

  // Global Toast state
  const [toast, setToast] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const data = await userApi.getProfile()
      setProfile(data)
    } catch (err: any) {
      console.error("Failed to load profile:", err)
      showToast(err.message || "Failed to load profile information", "error")
    } finally {
      setLoading(false)
    }
  }

  function handleCopyNumber(num?: string | number | null) {
    if (!num) return
    navigator.clipboard
      .writeText(String(num))
      .then(() => {
        setCopiedId(true)
        showToast("Member ID copied to clipboard!")
        setTimeout(() => setCopiedId(false), 2000)
      })
      .catch(() => showToast("Failed to copy Member ID", "error"))
  }

  // Fallback values
  const role = profile?.role || authState.role || "member"
  const displayName = profile?.name || authState.name || "Community Member"
  const school = profile?.school || ""
  const memberId = profile?.user_number ? String(profile.user_number) : ""
  const totalPoints = profile?.stats?.total_points ?? 0

  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "MB"

  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-[#0a0a0a] text-[#e8b94a] border-[#e8b94a]/40 font-bold",
    organizer: "bg-[#1e293b] text-[#93c5fd] border-[#3b82f6]/40 font-bold",
    activist: "bg-[#064e3b] text-[#a7f3d0] border-[#10b981]/40 font-bold",
    member: "bg-[#f5f0e0] text-[#0a0a0a] border-[#e5e5e5] font-semibold",
  }

  const roleDisplayNames: Record<string, string> = {
    member: "Member",
    activist: "Activist",
    organizer: "Organizer",
    admin: "Admin",
  }

  return (
    <div className="min-h-screen bg-[#faf5e8] pb-16 font-sans">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {/* Breadcrumb Navigation */}
        <PageBreadcrumb
          items={[
            { label: "Home", href: "/home" },
            { label: "Profile & Identity" },
          ]}
        />

        {/* ── TOAST NOTIFICATION ── */}
        {toast && (
          <div
            className={`fixed right-4 bottom-4 z-50 flex animate-in items-center gap-2 rounded-[14px] border px-4 py-3 text-xs font-bold shadow-xl duration-200 fade-in sm:text-sm ${
              toast.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <span>{toast.text}</span>
          </div>
        )}

        {/* ── LOADING SKELETON ── */}
        {loading && !profile ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-[24px]" />
            <Skeleton className="h-64 w-full rounded-[24px]" />
          </div>
        ) : (
          <>
            {/* ── PROFILE HERO / IDENTITY HEADER ── */}
            <div className="rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar Initials */}
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-[18px] bg-[#0a0a0a] text-lg font-bold tracking-wider text-[#e8b94a] shadow-xs sm:size-20 sm:text-xl">
                    {userInitials}
                  </div>

                  {/* Member Names & Tags */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-lg font-bold tracking-tight text-[#0a0a0a] sm:text-2xl">
                        {displayName}
                      </h1>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${
                          roleBadgeStyle[role.toLowerCase()] || roleBadgeStyle.member
                        }`}
                      >
                        <ShieldCheckIcon className="size-3" />
                        <span>{roleDisplayNames[role.toLowerCase()] || role}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {memberId && (
                        <div className="flex items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 font-mono font-bold text-[#0a0a0a]">
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
                      )}

                      {profile?.username && (
                        <span className="font-mono text-xs font-semibold text-[#6a6a6a]">
                          @{profile.username}
                        </span>
                      )}

                      {school && (
                        <span className="flex items-center gap-1 text-xs text-[#6a6a6a]">
                          <GraduationCapIcon className="size-3 text-[#6a6a6a]" />
                          <span className="max-w-[180px] truncate sm:max-w-xs">
                            {school}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-[#6a6a6a]">
                      <span className="flex items-center gap-1">
                        <MailIcon className="size-3" />
                        <span>{profile?.email || authState.email || "No email"}</span>
                      </span>
                      {profile?.phone && (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="size-3" />
                          <span>{profile.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Points Pill Counter */}
                <div className="flex items-center gap-2 self-start rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-right shadow-2xs sm:self-center">
                  <div>
                    <span className="block text-[9px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                      Karma Points
                    </span>
                    <span className="font-mono text-base font-black text-[#0a0a0a] sm:text-lg">
                      {totalPoints.toLocaleString("en-US")} Pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3 UNIFIED PROFILE TABS ── */}
            <div className="space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as any)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-1.5 shadow-xs">
                  <TabsTrigger
                    value="card"
                    className="flex items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-xs font-bold transition-all data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-white sm:text-sm"
                  >
                    <IdCardIcon className="size-4" />
                    <span>Member Card & Points</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="profile"
                    className="flex items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-xs font-bold transition-all data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-white sm:text-sm"
                  >
                    <UserIcon className="size-4" />
                    <span>Personal Profile</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="security"
                    className="flex items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-xs font-bold transition-all data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-white sm:text-sm"
                  >
                    <ShieldCheckIcon className="size-4" />
                    <span>Security & Settings</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* ── TAB 1: DIGITAL MEMBER CARD & POINTS HISTORY ── */}
              {activeTab === "card" && (
                <div className="space-y-6 animate-in duration-200 fade-in">
                  {/* Minimalist HIG Digital Member Card */}
                  <DigitalMemberCard
                    name={displayName}
                    userNumber={profile?.user_number}
                    role={role}
                    school={school}
                    joinedAt={profile?.joined_at}
                    username={profile?.username}
                    onToast={showToast}
                  />

                  {/* Points Ledger List */}
                  <PointsLedger totalPoints={totalPoints} />
                </div>
              )}

              {/* ── TAB 2: PERSONAL PROFILE (IN-PAGE INLINE FORM — NO POPUP MODAL) ── */}
              {activeTab === "profile" && profile && (
                <div className="animate-in duration-200 fade-in">
                  <PersonalProfileSection
                    profile={profile}
                    onProfileUpdated={(updated) => {
                      setProfile((prev) => ({ ...prev, ...updated }))
                    }}
                    onToast={showToast}
                  />
                </div>
              )}

              {/* ── TAB 3: SECURITY & SETTINGS ── */}
              {activeTab === "security" && (
                <div className="animate-in duration-200 fade-in">
                  <SecuritySettingsSection
                    currentEmail={profile?.email || authState.email}
                    emailVerified={profile?.email_verified ?? true}
                    onEmailUpdated={(newEmail) => {
                      setProfile((prev) => (prev ? { ...prev, email: newEmail, email_verified: true } : prev))
                    }}
                    onLogout={logout}
                    onToast={showToast}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
