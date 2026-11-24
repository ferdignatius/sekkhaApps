import { useState, useEffect, useCallback } from "react"
import {
  IdCardIcon,
  FlameIcon,
  ShieldCheckIcon,
  SparklesIcon,
  LogOutIcon,
  AlertCircleIcon,
  SettingsIcon,
  PencilIcon,
  GraduationCapIcon,
  XIcon,
} from "lucide-react"
import { DigitalMemberCard } from "@/components/common/DigitalMemberCard"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { WeeklyActivityHeatmap } from "@/components/common/WeeklyActivityHeatmap"
import { getInitials } from "@/lib/initials"
import {
  formatRoleLabel,
  getRoleAvatarClass,
  getRoleBadgeVariant,
  normalizeRoleKey,
} from "@/lib/roles"
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  toast,
} from "@/components/base"
import { useAuth } from "@/modules/auth"
import { userApi } from "../api/userApi"
import type { ActivityHeatmapDto, UserProfileDto } from "../api/userApi"
import { PointsLedger } from "./PointsLedger"
import { PersonalProfileSection } from "./PersonalProfileSection"
import { SecuritySettingsSection } from "./SecuritySettingsSection"
import { ProfileSettingsView } from "./ProfileSettingsView"

type ProfileView = "main" | "settings" | "security"

function getViewFromUrl(): ProfileView {
  if (typeof window === "undefined") return "main"
  const param = new URLSearchParams(window.location.search).get("view")
  if (param === "settings" || param === "security") return param
  return "main"
}

export function ProfilePage() {
  const { authState, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [heatmap, setHeatmap] = useState<ActivityHeatmapDto | null>(null)
  const [heatmapLoading, setHeatmapLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ProfileView>(() => getViewFromUrl())
  const [showMemberPassModal, setShowMemberPassModal] = useState(false)
  const [memberPassExpanded, setMemberPassExpanded] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [editProfileExpanded, setEditProfileExpanded] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const navigateView = useCallback((nextView: ProfileView) => {
    setView(nextView)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (nextView === "main") {
        url.searchParams.delete("view")
      } else {
        url.searchParams.set("view", nextView)
      }
      window.history.pushState({ view: nextView }, "", url.toString())
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const onPopState = () => setView(getViewFromUrl())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const showToast = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      if (type === "error") {
        toast.error(text)
      } else {
        toast.success(text)
      }
    },
    []
  )

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await userApi.getProfile()
      setProfile(data)
    } catch (err: any) {
      console.error("Failed to load profile:", err)
      setError(
        err?.message || "Please check your internet connection and try again."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    let active = true
    setHeatmapLoading(true)
    userApi
      .getActivityHeatmap()
      .then((res) => {
        if (active) setHeatmap(res)
      })
      .catch(() => {
        // Non-blocking: keep profile usable even if heatmap fails to load
      })
      .finally(() => {
        if (active) setHeatmapLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleConfirmLogout() {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
      setShowLogoutConfirm(false)
    }
  }

  const role = normalizeRoleKey(profile?.role || authState.role)
  const roleLabel = formatRoleLabel(role)
  const isShieldRole = role === "admin" || role === "organizer"
  const displayName = profile?.name || authState.name || "Community Member"
  const username = profile?.username || authState.username || ""
  const school = profile?.school || ""
  const totalPoints = profile?.stats?.total_points ?? 0
  const currentStreak = profile?.stats?.current_streak ?? 0

  const breadcrumbProps =
    view === "security"
      ? {
        items: [
          { label: "Profile", href: "/profile" },
          { label: "Settings", href: "/profile?view=settings" },
          { label: "Security" },
        ],
        onBack: () => navigateView("settings"),
      }
      : view === "settings"
        ? {
          items: [{ label: "Profile", href: "/profile" }, { label: "Settings" }],
          onBack: () => navigateView("main"),
        }
        : {
          items: [{ label: "Profile" }],
          showBack: false,
          actions: (
            <button
              type="button"
              onClick={() => navigateView("settings")}
              aria-label="Settings"
              title="Settings"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-2xs transition-all hover:bg-[#f5efe0] active:scale-95 sm:size-10"
            >
              <SettingsIcon className="size-4" aria-hidden="true" />
            </button>
          ),
        }

  const isMainProfileReady = !loading && !error && Boolean(profile) && view === "main"

  return (
    <main className="min-h-screen bg-[#fffaf0] font-sans text-ink">
      {isMainProfileReady && profile ? (
        <>
          {/* ── 1. Warm Sekkha Sunrise Hero Backdrop (Same Language as HomePage) ── */}
          <div className="relative overflow-hidden bg-gradient-to-b from-[#f6e8c8] via-[#faf2dd] to-[#f4e7c6] md:bg-none">
            <img
              src="/Serene%20Sky%20Garden%20Pavilion.webp"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right-bottom select-none md:hidden"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#faf2dd]/85 via-[#faf2dd]/45 to-transparent md:hidden"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#faf2dd]/55 to-transparent md:hidden"
            />

            <PageBreadcrumb {...breadcrumbProps} />

            {/* Mobile Banner Spacer for Overlapping Avatar; Desktop Rounded Sunrise Banner */}
            <div className="h-32 sm:h-36 md:hidden" aria-hidden="true" />
            <div className="hidden md:block md:px-6 md:pt-2 lg:px-8 xl:px-12">
              <div className="relative mx-auto h-44 max-w-7xl overflow-hidden rounded-[32px] border border-[#e6decb] bg-gradient-to-b from-[#f6e8c8] via-[#faf2dd] to-[#f4e7c6] shadow-xs lg:h-48">
                <img
                  src="/Serene%20Sky%20Garden%20Pavilion.webp"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right select-none"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#faf2dd]/85 via-[#faf2dd]/45 to-transparent"
                />
              </div>
            </div>
          </div>

          {/* ── 2. Curved Sheet Body (Overlaps Hero Backdrop like Reference + HomePage) ── */}
          <div className="relative z-10 -mt-6 rounded-t-[32px] border-t border-[#e5dec9]/80 bg-[#fffaf0] px-4 pb-28 shadow-[0_-10px_28px_-6px_rgba(10,10,10,0.07)] sm:px-6 md:mt-0 md:rounded-none md:border-t-0 md:bg-transparent md:px-6 md:pb-12 md:shadow-none lg:px-8 xl:px-12">
            <div className="mx-auto max-w-7xl space-y-6">
              {/* Profile Identity Section (Overlapping Avatar + Edit Profile Action + Identity + Stat Pills) */}
              <section
                data-testid="profile-hero-card"
                className="space-y-3.5 md:px-4"
              >
                <div className="flex items-end justify-between gap-3">
                  <div className="relative -mt-10 sm:-mt-12 md:-mt-12">
                    <div
                      className={`flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-[#fffaf0] text-xl font-bold tracking-tight shadow-md sm:size-22 sm:text-2xl ${getRoleAvatarClass(role)}`}
                    >
                      {getInitials(displayName, "M")}
                    </div>
                    <span
                      aria-hidden="true"
                      className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full border-2 border-[#fffaf0] bg-[#0a0a0a] text-[#e8b94a] shadow-xs"
                    >
                      {isShieldRole ? (
                        <ShieldCheckIcon className="size-3" />
                      ) : (
                        <SparklesIcon className="size-3" />
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowMemberPassModal(true)}
                      aria-label="Member Pass"
                      title="Member Pass"
                      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] shadow-2xs transition-all hover:bg-[#f5efe0] active:scale-95"
                    >
                      <IdCardIcon className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditProfileModal(true)}
                      aria-label="Edit Profile"
                      title="Edit Profile"
                      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] shadow-2xs transition-all hover:bg-[#f5efe0] active:scale-95"
                    >
                      <PencilIcon className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                      {displayName}
                    </h1>
                    <Badge
                      variant={getRoleBadgeVariant(role)}
                      size="sm"
                      className="font-bold"
                    >
                      {roleLabel}
                    </Badge>
                  </div>

                  {username && (
                    <p className="truncate font-mono text-xs font-semibold text-text-muted sm:text-sm">
                      @{username}
                    </p>
                  )}

                  {school && (
                    <p className="flex items-center gap-1.5 truncate pt-0.5 text-xs font-medium text-text-muted">
                      <GraduationCapIcon
                        className="size-3.5 shrink-0 text-clay-ochre"
                        aria-hidden="true"
                      />
                      <span className="truncate">{school}</span>
                    </p>
                  )}
                </div>

                {/* Compact Inline Stat Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e5dec9] bg-[#faf5e8] px-3.5 py-1.5 text-xs shadow-2xs">
                    <SparklesIcon className="size-3.5 shrink-0 text-clay-ochre" />
                    <span className="font-mono font-extrabold text-ink tabular-nums">
                      {totalPoints}
                    </span>
                    <span className="text-text-muted">Karma Points</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-3.5 py-1.5 text-xs shadow-2xs">
                    <FlameIcon className="size-3.5 shrink-0 text-amber-600" />
                    <span className="font-extrabold text-amber-950 tabular-nums">
                      {currentStreak}
                    </span>
                    <span className="text-amber-800/80">Weekly Streak</span>
                  </div>
                </div>
              </section>

              {/* Details & Activity Below */}
              <div
                data-testid="profile-layout-grid"
                className="grid grid-cols-1 gap-5 border-t border-hairline/70 pt-5 lg:grid-cols-12 lg:items-start lg:gap-8"
              >
                <div className="lg:col-span-5 xl:col-span-4">
                  <WeeklyActivityHeatmap
                    year={heatmap?.year ?? new Date().getFullYear()}
                    activeMonth={heatmap?.active_month ?? new Date().getMonth()}
                    weeks={heatmap?.weeks ?? []}
                    isLoading={heatmapLoading}
                  />
                </div>

                <div className="lg:col-span-7 xl:col-span-8">
                  <PointsLedger totalPoints={totalPoints} />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <PageBreadcrumb {...breadcrumbProps} />

          <div className="mx-auto max-w-7xl px-3.5 py-3 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
            {loading ? (
              <div
                data-testid="profile-loading-skeleton"
                aria-busy="true"
                aria-label="Loading profile"
                className="grid grid-cols-1 gap-6 lg:grid-cols-12"
              >
                <div className="space-y-6 lg:col-span-5 xl:col-span-4">
                  <div className="space-y-5 rounded-[24px] border border-hairline bg-canvas p-6">
                    <div className="flex items-center gap-4">
                      <div className="size-16 animate-pulse rounded-full bg-surface-soft" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-32 animate-pulse rounded bg-surface-soft" />
                        <div className="h-3.5 w-20 animate-pulse rounded bg-surface-soft" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-4">
                      <div className="h-10 animate-pulse rounded-full bg-surface-soft" />
                      <div className="h-10 animate-pulse rounded-full bg-surface-soft" />
                    </div>
                  </div>
                  <div className="hidden h-28 animate-pulse rounded-[20px] border border-hairline bg-canvas lg:block" />
                </div>

                <div className="space-y-4 lg:col-span-7 xl:col-span-8">
                  <div className="h-56 w-full animate-pulse rounded-[24px] bg-canvas" />
                  <div className="h-44 w-full animate-pulse rounded-[20px] bg-canvas" />
                </div>
              </div>
            ) : error || !profile ? (
              <Card className="mx-auto max-w-md border-rose-200 bg-canvas p-6 text-center shadow-none sm:p-8">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <AlertCircleIcon className="size-6" />
                </div>
                <h1 className="text-base font-bold text-ink">
                  Unable to load profile
                </h1>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {error ||
                    "Your profile data could not be retrieved right now."}
                </p>
                <div className="mt-5">
                  <Button
                    type="button"
                    variant="filled"
                    onClick={() => void loadProfile()}
                    className="h-11 rounded-[12px] px-6 text-xs font-bold"
                  >
                    Try Again
                  </Button>
                </div>
              </Card>
            ) : view === "settings" ? (
              <ProfileSettingsView
                currentEmail={profile.email || authState.email}
                emailVerified={profile.email_verified ?? true}
                onOpenSecurity={() => navigateView("security")}
                onRequestSignOut={() => setShowLogoutConfirm(true)}
                onLogout={logout}
                onToast={showToast}
              />
            ) : (
              <div className="mx-auto w-full max-w-2xl">
                <SecuritySettingsSection
                  currentEmail={profile.email || authState.email}
                  emailVerified={profile.email_verified ?? true}
                  onEmailUpdated={(newEmail) => {
                    setProfile((prev) =>
                      prev
                        ? { ...prev, email: newEmail, email_verified: true }
                        : prev
                    )
                  }}
                  onLogout={logout}
                  onToast={showToast}
                  hideDeleteZone={true}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── DRAWER 1: DIGITAL MEMBER PASS (Standard Full-Width Expandable Drawer) ── */}
      {profile && (
        <Drawer
          open={showMemberPassModal}
          onOpenChange={(nextOpen) => {
            setShowMemberPassModal(nextOpen)
            if (!nextOpen) setMemberPassExpanded(false)
          }}
          repositionInputs={false}
        >
          <DrawerContent
            data-expanded={memberPassExpanded ? "true" : "false"}
            onPointerMove={(e) => {
              if (!memberPassExpanded && e.movementY < -12) {
                setMemberPassExpanded(true)
              }
            }}
            className={`z-[100] flex flex-col overflow-hidden rounded-t-[28px] border-t border-[#e5dec9] bg-[#fffaf0] p-0 text-left font-sans shadow-[0_-10px_28px_-4px_rgba(10,10,10,0.12)] transition-[height,max-height,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${memberPassExpanded
              ? "h-[96dvh] max-h-[96dvh]"
              : "h-[88dvh] max-h-[88dvh]"
              }`}
          >
            <div
              onClick={() => setMemberPassExpanded((prev) => !prev)}
              className="sticky top-0 z-20 flex shrink-0 cursor-pointer items-center justify-center bg-[#fffaf0] py-3"
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${memberPassExpanded
                  ? "w-14 bg-[#6a6a6a]/45"
                  : "w-12 bg-[#6a6a6a]/30"
                  }`}
              />
            </div>
            <div
              onScroll={(e) => {
                if (!memberPassExpanded && e.currentTarget.scrollTop > 0) {
                  setMemberPassExpanded(true)
                }
              }}
              className="scrollbar-none flex-1 overscroll-contain overflow-y-auto px-5 pt-2 pb-10"
            >
              <div className="mx-auto w-full max-w-xl">
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-hairline pb-3">
                  <DrawerHeader className="p-0 text-left">
                    <DrawerTitle className="text-sm font-bold text-ink sm:text-base">
                      Digital Member Pass
                    </DrawerTitle>
                    <DrawerDescription className="mt-0.5 text-xs text-text-muted">
                      Present your QR code at temple events for instant check-in.
                    </DrawerDescription>
                  </DrawerHeader>
                  <button
                    type="button"
                    onClick={() => setShowMemberPassModal(false)}
                    aria-label="Close Member Pass"
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-text-muted transition-colors hover:bg-surface-card hover:text-ink"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
                <DigitalMemberCard
                  name={displayName}
                  userNumber={profile.user_number}
                  role={role}
                  school={school}
                  joinedAt={profile.joined_at}
                  username={profile.username}
                  points={totalPoints}
                  currentStreak={currentStreak}
                  inlineEnlargeQr={true}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* ── DRAWER 2: EDIT PERSONAL PROFILE (Standard Full-Width Expandable Drawer) ── */}
      {profile && (
        <Drawer
          open={showEditProfileModal}
          onOpenChange={(nextOpen) => {
            setShowEditProfileModal(nextOpen)
            if (!nextOpen) setEditProfileExpanded(false)
          }}
          repositionInputs={false}
        >
          <DrawerContent
            data-expanded={editProfileExpanded ? "true" : "false"}
            onPointerMove={(e) => {
              if (!editProfileExpanded && e.movementY < -12) {
                setEditProfileExpanded(true)
              }
            }}
            onPointerDownOutside={(e) => {
              const target = e.target as HTMLElement | null
              if (target?.closest?.('[data-slot="select-content"]')) {
                e.preventDefault()
              }
            }}
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement | null
              if (target?.closest?.('[data-slot="select-content"]')) {
                e.preventDefault()
              }
            }}
            className={`z-[100] flex flex-col overflow-hidden rounded-t-[28px] border-t border-[#e5dec9] bg-[#fffaf0] p-0 text-left font-sans shadow-[0_-10px_28px_-4px_rgba(10,10,10,0.12)] transition-[height,max-height,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${editProfileExpanded
              ? "h-[96dvh] max-h-[96dvh]"
              : "h-[88dvh] max-h-[88dvh]"
              }`}
          >
            <div
              onClick={() => setEditProfileExpanded((prev) => !prev)}
              className="sticky top-0 z-20 flex shrink-0 cursor-pointer items-center justify-center bg-[#fffaf0] py-3"
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${editProfileExpanded
                  ? "w-14 bg-[#6a6a6a]/45"
                  : "w-12 bg-[#6a6a6a]/30"
                  }`}
              />
            </div>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Edit Personal Profile</DrawerTitle>
              <DrawerDescription>
                Update your full name, username, and school affiliation.
              </DrawerDescription>
            </DrawerHeader>
            <div
              onScroll={(e) => {
                if (!editProfileExpanded && e.currentTarget.scrollTop > 0) {
                  setEditProfileExpanded(true)
                }
              }}
              className="scrollbar-none flex-1 overscroll-contain overflow-y-auto px-5 pt-2 pb-10"
            >
              <div className="mx-auto w-full max-w-xl">
                <PersonalProfileSection
                  profile={profile}
                  defaultEditing={true}
                  onClose={() => setShowEditProfileModal(false)}
                  onProfileUpdated={(updated) => {
                    setProfile((prev) => ({ ...prev, ...updated }))
                  }}
                  onToast={showToast}
                  onGoToSecurity={() => navigateView("security")}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Confirm Sign Out"
        description="Are you sure you want to end your current session? You will need your username or member ID to sign back in."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        variant="destructive"
        icon={<LogOutIcon className="size-6" />}
        onConfirm={handleConfirmLogout}
        isLoading={signingOut}
      />
    </main>
  )
}
