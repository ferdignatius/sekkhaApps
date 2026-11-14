import { useState, useEffect, useCallback } from "react"
import {
  IdCardIcon,
  UserIcon,
  LockIcon,
  FlameIcon,
  ShieldCheckIcon,
  SparklesIcon,
  LogOutIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { DigitalMemberCard } from "@/components/common/DigitalMemberCard"
import { InstallAppCard } from "@/components/common/InstallAppPrompt"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/base"
import { useAuth } from "@/modules/auth"
import { userApi } from "../api/userApi"
import type { UserProfileDto } from "../api/userApi"
import { PointsLedger } from "./PointsLedger"
import { PersonalProfileSection } from "./PersonalProfileSection"
import { SecuritySettingsSection } from "./SecuritySettingsSection"

type ProfileTab = "card" | "profile" | "security"

export function ProfilePage() {
  const { authState, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>("card")
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [toast, setToast] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)

  const showToast = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      setToast({ text, type })
      setTimeout(() => setToast(null), 3500)
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

  return (
    <main className="min-h-screen bg-surface-soft font-sans text-ink">
      <PageBreadcrumb items={[{ label: "Profile" }]} showBack={false} />

      {toast && (
        <div
          role="status"
          className={`fixed top-16 right-4 left-4 z-50 mx-auto flex max-w-sm items-center gap-2 rounded-[14px] border px-4 py-3 text-xs font-bold shadow-lg sm:right-6 sm:left-auto ${
            toast.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircleIcon className="size-4 shrink-0" />
          ) : (
            <CheckCircle2Icon className="size-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-3.5 py-4 pb-36 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
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
                  <div className="size-16 animate-pulse rounded-[18px] bg-surface-soft" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded bg-surface-soft" />
                    <div className="h-3.5 w-20 animate-pulse rounded bg-surface-soft" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-4">
                  <div className="h-16 animate-pulse rounded-[14px] bg-surface-soft" />
                  <div className="h-16 animate-pulse rounded-[14px] bg-surface-soft" />
                </div>
              </div>
              <div className="hidden h-28 animate-pulse rounded-[20px] border border-hairline bg-canvas lg:block" />
            </div>

            <div className="space-y-4 lg:col-span-7 xl:col-span-8">
              <div className="h-12 w-full animate-pulse rounded-[16px] bg-canvas" />
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
              {error || "Your profile data could not be retrieved right now."}
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
        ) : (
          <div
            data-testid="profile-layout-grid"
            className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:items-start"
          >
            {/* ── 1. HERO IDENTITY CARD (Mobile: Top | Desktop: Left Rail Row 1) ── */}
            <aside className="lg:col-span-5 lg:col-start-1 lg:row-start-1 xl:col-span-4">
              <Card
                data-testid="profile-hero-card"
                className="space-y-5 border-hairline bg-canvas p-5 shadow-none sm:p-6"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex size-16 shrink-0 items-center justify-center rounded-[18px] border text-xl font-bold tracking-tight shadow-xs ${getRoleAvatarClass(role)}`}
                  >
                    {getInitials(displayName, "M")}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
                      {displayName}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={getRoleBadgeVariant(role)}
                        size="sm"
                        icon={
                          isShieldRole ? (
                            <ShieldCheckIcon className="size-3" />
                          ) : (
                            <SparklesIcon className="size-3" />
                          )
                        }
                        className="font-bold"
                      >
                        {roleLabel}
                      </Badge>

                      {username && (
                        <p className="truncate font-mono text-xs font-semibold text-text-muted">
                          @{username}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-4">
                  <div className="flex flex-col justify-between rounded-[16px] border border-hairline bg-surface-soft px-3.5 py-3">
                    <p className="text-[10px] font-bold tracking-wider whitespace-nowrap text-text-muted uppercase">
                      Karma Points
                    </p>
                    <p className="mt-1.5 font-mono text-base font-extrabold whitespace-nowrap text-ink tabular-nums sm:text-lg">
                      {totalPoints} Pts
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-[16px] border border-amber-200/80 bg-amber-50/70 px-3.5 py-3">
                    <p className="text-[10px] font-bold tracking-wider whitespace-nowrap text-amber-800 uppercase">
                      Weekly Streak
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <FlameIcon className="size-4 shrink-0 text-amber-600" />
                      <span className="text-base font-extrabold whitespace-nowrap text-amber-950 tabular-nums sm:text-lg">
                        {currentStreak}{" "}
                        {currentStreak === 1 ? "Week" : "Weeks"}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </aside>

            {/* ── 2. SEGMENTED TABS & ACTIVE VIEW (Mobile: Middle | Desktop: Right Column Span) ── */}
            <div className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 xl:col-span-8 xl:col-start-5">
              <Tabs
                variant="pill"
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as ProfileTab)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 rounded-[16px] border border-hairline bg-canvas p-1.5 shadow-none">
                  <TabsTrigger
                    value="card"
                    className="min-h-[44px] w-full rounded-[12px] px-2 text-xs font-bold sm:px-3 sm:text-sm"
                  >
                    <IdCardIcon className="size-4 shrink-0" />
                    <span className="sm:hidden">Pass</span>
                    <span className="hidden sm:inline">Member Pass</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="profile"
                    className="min-h-[44px] w-full rounded-[12px] px-2 text-xs font-bold sm:px-3 sm:text-sm"
                  >
                    <UserIcon className="size-4 shrink-0" />
                    <span className="sm:hidden">Profile</span>
                    <span className="hidden sm:inline">Personal Profile</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="security"
                    className="min-h-[44px] w-full rounded-[12px] px-2 text-xs font-bold sm:px-3 sm:text-sm"
                  >
                    <LockIcon className="size-4 shrink-0" />
                    <span className="sm:hidden">Security</span>
                    <span className="hidden sm:inline">
                      Security &amp; Settings
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="card" className="mt-4 space-y-6">
                  <DigitalMemberCard
                    name={displayName}
                    userNumber={profile.user_number}
                    role={role}
                    school={school}
                    joinedAt={profile.joined_at}
                    username={profile.username}
                    points={totalPoints}
                    currentStreak={currentStreak}
                  />

                  <PointsLedger totalPoints={totalPoints} />
                </TabsContent>

                <TabsContent value="profile" className="mt-4">
                  <PersonalProfileSection
                    profile={profile}
                    onProfileUpdated={(updated) => {
                      setProfile((prev) => ({ ...prev, ...updated }))
                    }}
                    onToast={showToast}
                    onGoToSecurity={() => setActiveTab("security")}
                  />
                </TabsContent>

                <TabsContent value="security" className="mt-4">
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
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* ── 3. INSTALL APP & ACCESSIBLE SIGN OUT CARD (Mobile: Very Bottom | Desktop: Left Rail Row 2 directly under Hero) ── */}
            <section
              data-testid="profile-signout-section"
              className="space-y-4 lg:col-span-5 lg:col-start-1 lg:row-start-2 xl:col-span-4"
            >
              <InstallAppCard />

              <div className="rounded-[20px] border border-hairline bg-canvas p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      Session &amp; Sign Out
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                      Sign out of your active session on this device. You can sign
                      back in any time.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="h-11 shrink-0 gap-2 rounded-[12px] border-rose-200 bg-rose-50/70 px-5 text-xs font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 lg:w-full lg:justify-center"
                  >
                    <LogOutIcon className="size-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

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
