import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  FlameIcon,
  GraduationCapIcon,
  IdCardIcon,
  KeyRoundIcon,
  Maximize2Icon,
  Minimize2Icon,
  MoreVerticalIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Bolt,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { DigitalMemberCard } from "@/components/common/DigitalMemberCard"
import { WeeklyActivityHeatmap } from "@/components/common/WeeklyActivityHeatmap"
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  FloatingActionButton,
} from "@/components/base"
import { Skeleton } from "@/components/ui/skeleton"
import { safeStorage } from "@/lib/storage"
import { peopleApi } from "../api/peopleApi"
import type {
  MemberDetailDto,
  PeopleRole,
  ResetTemporaryPasswordResponse,
} from "../api/peopleApi"
import {
  formatMemberDate,
  formatMemberInitials,
  formatRoleLabel,
  getRoleAvatarClass,
  getRoleBadgeVariant,
} from "../utils/memberFormatters"
import { MemberAttendanceTab } from "./detail/MemberAttendanceTab"
import { MemberDetailModals } from "./detail/MemberDetailModals"

export function MemberDetailPage({
  memberId: propMemberId,
}: {
  memberId?: string
}) {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const memberId = propMemberId || (params as { memberId?: string })?.memberId

  const { authState } = useAuth()
  const isOrganizerOrAdmin =
    authState.status === "authenticated" &&
    (authState.role === "organizer" ||
      (authState.role as string) === "pengurus" ||
      authState.role === "admin")
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [member, setMember] = useState<MemberDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Drawers
  const [showPassDrawer, setShowPassDrawer] = useState(false)
  const [isPassDrawerExpanded, setIsPassDrawerExpanded] = useState(false)
  const [showActionsDrawer, setShowActionsDrawer] = useState(false)

  // Modals & Reset Credentials
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState<PeopleRole>("member")
  const [savingRole, setSavingRole] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [resetCredentials, setResetCredentials] =
    useState<ResetTemporaryPasswordResponse | null>(null)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  const [toast, setToast] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)

  const showToast = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      setToast({ text, type })
      setTimeout(() => setToast(null), 3000)
    },
    []
  )

  const isSelf =
    authState.status === "authenticated" &&
    Boolean(authState.userId && member?.id === authState.userId)
  const isPrivilegedTargetForOrganizer =
    !isAdmin &&
    Boolean(member && (member.role === "admin" || member.role === "organizer"))

  // Defense-in-depth: Redirect non-organizer/non-admin users to home
  useEffect(() => {
    if (
      authState.status === "authenticated" &&
      authState.role !== null &&
      !isOrganizerOrAdmin
    ) {
      navigate({ to: "/home" })
    }
  }, [authState.status, authState.role, isOrganizerOrAdmin, navigate])

  const loadMember = useCallback(async () => {
    if (!memberId) return
    // Clear stale detail state immediately so clicking another member never flashes previous user data
    setMember(null)
    setShowPassDrawer(false)
    setIsPassDrawerExpanded(false)
    setShowActionsDrawer(false)
    setLoading(true)
    setLoadError(null)
    try {
      const res = await peopleApi.getMember(memberId)
      setMember(res)
      if (res?.role) {
        setNewRole(res.role)
      }
    } catch (err: unknown) {
      console.error("Failed to load member detail:", err)
      const msg =
        err instanceof Error ? err.message : "Failed to load member details"
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    if (memberId && isOrganizerOrAdmin) {
      void loadMember()
    }
  }, [memberId, isOrganizerOrAdmin, loadMember])

  function handleCopyMemberId(id?: string | number | null) {
    if (!id) return
    navigator.clipboard
      .writeText(String(id))
      .then(() => {
        setCopiedId(true)
        showToast("Member ID copied to clipboard!")
        setTimeout(() => setCopiedId(false), 2000)
      })
      .catch(() => showToast("Clipboard access denied.", "error"))
  }

  function handleCopyValue(value: string, label = "Value") {
    if (!value) return
    navigator.clipboard
      .writeText(value)
      .then(() => showToast(`${label} copied to clipboard!`))
      .catch(() => showToast("Clipboard access denied.", "error"))
  }

  async function handleResetPassword() {
    if (!member || !isOrganizerOrAdmin) return
    if (isSelf) {
      showToast(
        "You cannot reset your own temporary password through People management.",
        "error"
      )
      return
    }
    if (isPrivilegedTargetForOrganizer) {
      showToast(
        "Only Admins can reset credentials for Organizer or Admin accounts.",
        "error"
      )
      return
    }
    if (member.is_claimed) {
      showToast(
        "Account already claimed. Member must use Forgot Password.",
        "error"
      )
      return
    }

    try {
      setResettingPassword(true)
      const res = await peopleApi.resetMemberPassword(member.id)
      setResetCredentials(res)
      showToast("Temporary password regenerated successfully!")
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to reset temporary password"
      showToast(msg, "error")
    } finally {
      setResettingPassword(false)
    }
  }

  function handleCopyWhatsAppInvitation(message?: string) {
    if (!message) return
    navigator.clipboard
      .writeText(message)
      .then(() => {
        setCopiedInvite(true)
        showToast("Invitation message copied for WhatsApp!")
        setTimeout(() => setCopiedInvite(false), 2500)
      })
      .catch(() => showToast("Clipboard access denied.", "error"))
  }

  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault()
    if (!member || !isAdmin || isSelf) {
      if (isSelf) {
        showToast("You cannot change your own role or account data.", "error")
      }
      return
    }
    setSavingRole(true)
    try {
      await peopleApi.updateMember(member.id, { role: newRole })
      setMember((prev) => (prev ? { ...prev, role: newRole } : null))
      setShowRoleModal(false)
      showToast("Member role updated!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update role"
      showToast(msg, "error")
    } finally {
      setSavingRole(false)
    }
  }

  async function handleDeleteMember() {
    if (!member || !isAdmin || isSelf) {
      if (isSelf) {
        showToast("You cannot delete your own account.", "error")
      }
      return
    }
    setDeleting(true)
    try {
      const res = await peopleApi.deleteMember(member.id)
      const toastText =
        res?.message || `Member "${member.name}" successfully deleted`
      safeStorage.setItem("people_toast", toastText)
      showToast(toastText)
      navigate({ to: "/people" })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete member"
      showToast(msg, "error")
      setDeleting(false)
    }
  }

  const memberNumberStr = member?.user_number ? String(member.user_number) : ""
  const initials = formatMemberInitials(member?.name)
  const isResetDisabled = Boolean(
    isSelf ||
    member?.is_claimed ||
    isPrivilegedTargetForOrganizer ||
    resettingPassword
  )

  const resetDisabledReason = isSelf
    ? "Self-management is disabled for governance safety."
    : isPrivilegedTargetForOrganizer
      ? "Only Admins can reset Organizer or Admin credentials."
      : member?.is_claimed
        ? "Account already claimed. Member must use Forgot Password."
        : "Generate a fresh temporary password & WhatsApp invite for this unclaimed member."

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-36 text-left font-sans sm:pb-24 md:pb-14">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 right-6 z-50 animate-in duration-200 fade-in slide-in-from-top-4"
        >
          <div
            className={`flex items-center gap-2.5 rounded-md border px-4 py-3 shadow-xl ${toast.type === "success"
              ? "border-emerald-500/40 bg-ink text-white"
              : "border-rose-400/50 bg-rose-600 text-white"
              }`}
          >
            {toast.type === "success" ? (
              <CheckCircleIcon
                className="size-5 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangleIcon
                className="size-5 shrink-0 text-white"
                aria-hidden="true"
              />
            )}
            <p className="text-xs font-bold">{toast.text}</p>
          </div>
        </div>
      )}

      {/* ── HERO BACKDROP (Matches Profile & Home Warm Sunrise + Pavilion Art) ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FFE0C2] via-[#FAF0DF] to-[#F3E2CA] pb-16">
        <img
          src="/Serene%20Sky%20Garden%20Pavilion.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-55 mix-blend-multiply select-none"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,250,240,0.65)_0%,_transparent_65%)]"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <PageBreadcrumb
            items={[
              { label: "People", href: "/people" },
              { label: member?.name || "Member Details" },
            ]}
            onBack={() => navigate({ to: "/people" })}
          />
        </div>

        <div className="relative z-10 h-14 sm:h-20 md:h-24" />
      </div>

      {/* ── CURVED WARM SHEET BODY ── */}
      <div className="relative z-20 -mt-6 rounded-t-[32px] border-t border-[#e5dec9]/80 bg-[#fffaf0] px-4 pt-0 pb-8 sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div
              aria-busy="true"
              aria-label="Loading member profile"
              className="space-y-6 pt-2"
            >
              <div className="flex items-end justify-between gap-4">
                <Skeleton className="-mt-10 size-20 rounded-full border-4 border-[#fffaf0] sm:-mt-12 sm:size-24" />
                <Skeleton className="mt-3 size-10 rounded-full" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-7 w-52 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-sm" />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 border-t border-hairline/70 pt-6 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-5">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-56 w-full rounded-xl" />
                </div>
                <div className="space-y-4 lg:col-span-7">
                  <Skeleton className="h-72 w-full rounded-xl" />
                </div>
              </div>
            </div>
          ) : loadError ? (
            <div className="pt-8">
              <Card
                variant="soft"
                className="mx-auto max-w-lg space-y-4 rounded-xl border-hairline bg-surface-soft p-8 text-center"
              >
                <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600">
                  <AlertTriangleIcon className="size-6" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-base font-bold text-ink sm:text-lg">
                    Failed to Load Member Profile
                  </h1>
                  <p className="text-xs leading-relaxed text-text-muted sm:text-sm">
                    {loadError}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <Button variant="outlined" asChild className="rounded-md">
                    <Link to="/people" className="gap-1.5">
                      <ArrowLeftIcon className="size-4" aria-hidden="true" />
                      <span>Back to People</span>
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="filled"
                    onClick={() => void loadMember()}
                    className="gap-1.5 rounded-md"
                  >
                    <RefreshCwIcon className="size-4" aria-hidden="true" />
                    <span>Try Again</span>
                  </Button>
                </div>
              </Card>
            </div>
          ) : !member ? (
            <div className="pt-8">
              <Card
                variant="soft"
                className="mx-auto max-w-lg space-y-3 rounded-xl border border-dashed border-hairline bg-surface-soft p-10 text-center"
              >
                <UserIcon
                  className="mx-auto size-10 text-text-muted/50"
                  aria-hidden="true"
                />
                <h1 className="text-base font-bold text-ink">
                  Member Not Found
                </h1>
                <p className="text-xs text-text-muted">
                  This member profile could not be found or has been deleted.
                </p>
                <div className="pt-2">
                  <Button variant="outlined" asChild className="rounded-md">
                    <Link to="/people" className="gap-1.5">
                      <ArrowLeftIcon className="size-4" aria-hidden="true" />
                      <span>Back to People</span>
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <>
              {/* ── AVATAR + TOP-RIGHT MEMBER PASS BUTTON ── */}
              <div className="flex items-end justify-between gap-4">
                <div className="relative -mt-10 shrink-0 sm:-mt-12">
                  <div
                    className={`flex size-20 items-center justify-center rounded-full border-4 border-[#fffaf0] text-xl font-bold tracking-wider uppercase shadow-md sm:size-24 sm:text-2xl ${getRoleAvatarClass(member.role)}`}
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <span
                    className={`absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full border-2 border-[#fffaf0] text-white shadow-xs ${member.is_claimed ? "bg-emerald-600" : "bg-amber-500"
                      }`}
                    title={member.is_claimed ? "Claimed Account" : "Unclaimed Account"}
                    aria-label={member.is_claimed ? "Claimed Account" : "Unclaimed Account"}
                  >
                    {member.is_claimed ? (
                      <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
                    ) : (
                      <ClockIcon className="size-3.5" aria-hidden="true" />
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPassDrawer(true)}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-hairline bg-surface-soft text-ink shadow-2xs transition-colors hover:bg-surface-card active:scale-95"
                    title="Member Pass & QR Code"
                    aria-label="Member Pass"
                  >
                    <IdCardIcon className="size-4.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* ── IDENTITY CLUSTER & COMPACT STAT PILLS (Matches ProfilePage) ── */}
              <div className="mt-3 space-y-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-extrabold tracking-tight break-words text-ink sm:text-2xl">
                      {member.name}
                    </h1>
                    <Badge
                      variant={getRoleBadgeVariant(member.role)}
                      size="sm"
                      className="font-bold"
                    >
                      {formatRoleLabel(member.role)}
                    </Badge>
                    {isSelf && (
                      <Badge variant="primary" size="sm">
                        You
                      </Badge>
                    )}
                  </div>

                  {member.username && (
                    <p className="truncate font-mono text-xs font-semibold text-text-muted sm:text-sm">
                      @{member.username}
                    </p>
                  )}

                  {member.school && (
                    <p className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-text-muted">
                      <GraduationCapIcon
                        className="size-3.5 shrink-0 text-clay-ochre"
                        aria-hidden="true"
                      />
                      <span className="truncate">{member.school}</span>
                    </p>
                  )}
                </div>

                {/* Compact Inline Stat Pills (Matches ProfilePage) */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e5dec9] bg-[#faf5e8] px-3.5 py-1.5 text-xs shadow-2xs">
                    <Bolt
                      className="size-3.5 shrink-0 text-clay-ochre"
                      aria-hidden="true"
                    />
                    <span className="font-mono font-extrabold text-ink tabular-nums">
                      {(member.points ?? 0).toLocaleString("en-US")}
                    </span>
                    <span className="text-text-muted">Karma Points</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-3.5 py-1.5 text-xs shadow-2xs">
                    <FlameIcon
                      className="size-3.5 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <span className="font-extrabold text-amber-950 tabular-nums">
                      {member.current_streak ?? 0}
                    </span>
                    <span className="text-amber-800/80">Weekly Streak</span>
                  </div>
                </div>

                {/* Structured Account Details Strip (Email, Member ID, Joined) */}
                {(member.email || memberNumberStr || member.created_at) && (
                  <div className="grid grid-cols-1 gap-2 rounded-2xl border border-[#e5dec9]/80 bg-surface-soft/75 p-3 text-xs sm:grid-cols-3">
                    {member.email && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyValue(member.email!, "Email address")
                        }
                        aria-label={`Copy email ${member.email}`}
                        className="flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl px-2 py-1 text-left transition-colors hover:bg-canvas/70"
                      >
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
                            Email
                          </span>
                          <span className="block truncate font-medium text-ink">
                            {member.email}
                          </span>
                        </div>
                        <CopyIcon
                          className="size-3.5 shrink-0 text-text-muted"
                          aria-hidden="true"
                        />
                      </button>
                    )}

                    {memberNumberStr && (
                      <button
                        type="button"
                        onClick={() => handleCopyMemberId(memberNumberStr)}
                        aria-label={`Copy Member ID ${memberNumberStr}`}
                        className="flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl px-2 py-1 text-left transition-colors hover:bg-canvas/70"
                      >
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
                            Member ID
                          </span>
                          <span className="block truncate font-mono font-semibold text-ink">
                            #{memberNumberStr}
                          </span>
                        </div>
                        {copiedId ? (
                          <CheckIcon
                            className="size-3.5 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                        ) : (
                          <CopyIcon
                            className="size-3.5 shrink-0 text-text-muted"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    )}

                    {member.created_at && (
                      <div className="flex min-w-0 items-center gap-2 px-2 py-1">
                        <CalendarIcon
                          className="size-3.5 shrink-0 text-text-muted"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
                            Joined
                          </span>
                          <span className="block truncate font-medium text-ink">
                            {formatMemberDate(member.created_at)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contextual Self-Protection or Staff Read-Only Notice */}
                {isSelf && (
                  <div className="pt-2">
                    <Alert
                      variant="info"
                      title="Viewing Your Own Account"
                      description={
                        <div className="space-y-1.5">
                          <p>
                            Editing personal details, changing roles, resetting
                            temporary passwords, and self-deletion are disabled
                            here for governance.
                          </p>
                          <Link
                            to="/profile"
                            className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-4 hover:opacity-80"
                          >
                            <span>Open Profile Settings</span>
                            <ArrowRightIcon
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      }
                    />
                  </div>
                )}

                {!isSelf && isPrivilegedTargetForOrganizer && (
                  <div className="pt-2">
                    <Alert
                      variant="warning"
                      title="Read-Only Staff Profile"
                      description="Organizers have read-only access to Organizer and Admin accounts. Contact an Admin to adjust staff roles or credentials."
                    />
                  </div>
                )}
              </div>

              {/* ── TABLESS CONTENT GRID (Heatmap & Recent Attendance) ── */}
              <div className="mt-6 grid grid-cols-1 items-start gap-6 border-t border-hairline/70 pt-6 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <WeeklyActivityHeatmap
                    year={member.heatmap?.year ?? new Date().getFullYear()}
                    activeMonth={member.heatmap?.active_month}
                    weeks={member.heatmap?.weeks ?? []}
                  />
                </div>

                <div className="lg:col-span-7">
                  <MemberAttendanceTab
                    attendances={member.attendances}
                    totalAttendances={member.total_attendances}
                  />
                </div>
              </div>

              {/* ── DIGITAL MEMBER PASS BOTTOM DRAWER ── */}
              <Drawer
                open={showPassDrawer}
                onOpenChange={(open) => {
                  setShowPassDrawer(open)
                  if (!open) setIsPassDrawerExpanded(false)
                }}
              >
                <DrawerContent
                  className={`flex flex-col transition-[height,max-height] duration-300 ${isPassDrawerExpanded
                    ? "h-[96dvh] max-h-[96dvh]"
                    : "h-[88dvh] max-h-[88dvh]"
                    }`}
                >
                  <DrawerHeader className="flex shrink-0 flex-row items-start justify-between gap-3 border-b border-hairline px-4 pt-2 pb-3 text-left sm:px-6">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <DrawerTitle className="text-base font-bold text-ink">
                        Digital Member Pass
                      </DrawerTitle>
                      <DrawerDescription className="text-xs text-text-muted">
                        Present this QR code at temple events for instant
                        check-in.
                      </DrawerDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setIsPassDrawerExpanded((prev) => !prev)
                        }
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-hairline bg-surface-soft text-ink transition-colors hover:bg-surface-card"
                        aria-label={
                          isPassDrawerExpanded
                            ? "Restore drawer height"
                            : "Expand drawer to full screen"
                        }
                        title={
                          isPassDrawerExpanded
                            ? "Restore drawer height"
                            : "Expand drawer to full screen"
                        }
                      >
                        {isPassDrawerExpanded ? (
                          <Minimize2Icon className="size-4" aria-hidden="true" />
                        ) : (
                          <Maximize2Icon className="size-4" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassDrawer(false)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-hairline bg-surface-soft text-ink transition-colors hover:bg-surface-card"
                        aria-label="Close Digital Member Pass"
                      >
                        <XIcon className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </DrawerHeader>

                  <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 sm:px-6">
                    <div className="mx-auto max-w-md">
                      <DigitalMemberCard
                        name={member.name}
                        userNumber={member.user_number}
                        role={member.role}
                        school={member.school}
                        joinedAt={member.created_at}
                        username={member.username}
                        points={member.points ?? 0}
                        currentStreak={member.current_streak ?? 0}
                        isClaimed={member.is_claimed}
                        inlineEnlargeQr={true}
                        onCopyMemberId={handleCopyMemberId}
                      />
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>

              {/* ── 3-DOT ADMINISTRATIVE ACTIONS FAB + DRAWER (Organizer & Admin) ── */}
              {isOrganizerOrAdmin && (
                <>
                  <FloatingActionButton
                    variant="primary"
                    size="default"
                    onClick={() => setShowActionsDrawer(true)}
                    className="fixed right-4 bottom-24 z-40 rounded-full md:right-8 md:bottom-8"
                    aria-label="Administrative actions"
                    title="Administrative actions"
                    icon={
                      <MoreVerticalIcon className="size-5" aria-hidden="true" />
                    }
                  />

                  <Drawer
                    open={showActionsDrawer}
                    onOpenChange={setShowActionsDrawer}
                  >
                    <DrawerContent className="h-auto max-h-[82dvh] flex-col">
                      <DrawerHeader className="flex flex-row items-start justify-between gap-3 border-b border-hairline px-4 pt-2 pb-3 text-left sm:px-6">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <DrawerTitle className="flex items-center gap-2 text-base font-bold text-ink">
                            <ShieldAlertIcon
                              className="size-4.5 text-clay-teal"
                              aria-hidden="true"
                            />
                            <span>Administrative Actions</span>
                          </DrawerTitle>
                          <DrawerDescription className="text-xs text-text-muted">
                            {isSelf
                              ? "Self-management is disabled for governance safety."
                              : isPrivilegedTargetForOrganizer
                                ? "Read-only for Organizers on Organizer/Admin accounts."
                                : `Manage credentials and governance access for ${member.name}.`}
                          </DrawerDescription>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowActionsDrawer(false)}
                          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-hairline bg-surface-soft text-ink transition-colors hover:bg-surface-card"
                          aria-label="Close Administrative Actions"
                        >
                          <XIcon className="size-4" aria-hidden="true" />
                        </button>
                      </DrawerHeader>

                      <div className="space-y-3 overflow-y-auto px-4 py-4 pb-8 sm:px-6">
                        <div className="space-y-1.5">
                          <Button
                            type="button"
                            variant="outlined"
                            disabled={isResetDisabled}
                            onClick={() => {
                              setShowActionsDrawer(false)
                              void handleResetPassword()
                            }}
                            title={resetDisabledReason}
                            className="min-h-[48px] w-full justify-start gap-2.5 rounded-xl bg-canvas px-4 text-left"
                          >
                            <KeyRoundIcon
                              className="size-4 shrink-0 text-clay-teal"
                              aria-hidden="true"
                            />
                            <span className="font-semibold">
                              {resettingPassword
                                ? "Generating Temporary Password..."
                                : "Reset Password"}
                            </span>
                          </Button>
                          <p className="px-1 text-[11px] leading-snug text-text-muted">
                            {resetDisabledReason}
                          </p>
                        </div>

                        {isAdmin && (
                          <div className="grid grid-cols-1 gap-3 border-t border-hairline pt-3 sm:grid-cols-2">
                            <Button
                              type="button"
                              variant="outlined"
                              disabled={isSelf}
                              onClick={() => {
                                setShowActionsDrawer(false)
                                setShowRoleModal(true)
                              }}
                              title={
                                isSelf
                                  ? "Self-role changes are blocked here."
                                  : "Change member role"
                              }
                              className="min-h-[48px] w-full justify-start gap-2.5 rounded-xl bg-canvas px-4"
                            >
                              <ShieldCheckIcon
                                className="size-4 shrink-0 text-clay-teal"
                                aria-hidden="true"
                              />
                              <span className="font-semibold">Change Role</span>
                            </Button>

                            <Button
                              type="button"
                              variant="danger"
                              disabled={isSelf}
                              onClick={() => {
                                setShowActionsDrawer(false)
                                setShowDeleteModal(true)
                              }}
                              title={
                                isSelf
                                  ? "Self-deletion is blocked here."
                                  : "Delete member account"
                              }
                              className="min-h-[48px] w-full justify-start gap-2.5 rounded-xl px-4"
                            >
                              <Trash2Icon
                                className="size-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span className="font-semibold">
                                Delete Account
                              </span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </DrawerContent>
                  </Drawer>
                </>
              )}

              {/* ── MODALS: CHANGE ROLE, DELETE CONFIRMATION, RESET CREDENTIALS ── */}
              <MemberDetailModals
                member={member}
                isAdmin={isAdmin}
                isSelf={isSelf}
                showRoleModal={showRoleModal}
                onRoleModalChange={setShowRoleModal}
                newRole={newRole}
                onNewRoleChange={setNewRole}
                savingRole={savingRole}
                onSubmitRole={handleUpdateRole}
                showDeleteModal={showDeleteModal}
                onDeleteModalChange={setShowDeleteModal}
                deleting={deleting}
                onConfirmDelete={handleDeleteMember}
                resetCredentials={resetCredentials}
                onCloseResetCredentials={() => setResetCredentials(null)}
                copiedInvite={copiedInvite}
                onCopyText={handleCopyValue}
                onCopyWhatsAppInvitation={handleCopyWhatsAppInvitation}
              />
            </>
          )}
        </div>
      </div>
    </main>
  )
}
