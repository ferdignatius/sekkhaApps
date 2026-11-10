import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import {
  UserIcon,
  QrCodeIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { DigitalMemberCard } from "@/components/common/DigitalMemberCard"
import {
  Button,
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/base"
import { Skeleton } from "@/components/ui/skeleton"
import { peopleApi } from "../api/peopleApi"
import type {
  MemberDetailDto,
  PeopleRole,
  ResetTemporaryPasswordResponse,
} from "../api/peopleApi"
import { MemberIdentityCard } from "./detail/MemberIdentityCard"
import { MemberGovernanceCard } from "./detail/MemberGovernanceCard"
import { MemberProfileTab } from "./detail/MemberProfileTab"
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
  const [activeTab, setActiveTab] = useState<"profile" | "card" | "attendance">(
    "profile"
  )

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
    setActiveTab("profile")
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
      await peopleApi.deleteMember(member.id)
      showToast("Member deleted successfully!")
      setTimeout(() => {
        navigate({ to: "/people" })
      }, 1000)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete member"
      showToast(msg, "error")
      setDeleting(false)
    }
  }

  return (
    <main className="min-h-screen bg-canvas text-left font-sans">
      <PageBreadcrumb
        items={[
          { label: "People", href: "/people" },
          { label: member?.name || "Member Details" },
        ]}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 right-6 z-50 animate-in duration-200 fade-in slide-in-from-top-4"
        >
          <div
            className={`flex items-center gap-2.5 rounded-md border px-4 py-3 shadow-xl ${
              toast.type === "success"
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

      <div className="px-3.5 py-4 pb-36 sm:px-6 sm:py-6 sm:pb-24 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div
              aria-busy="true"
              aria-label="Loading member profile"
              className="grid grid-cols-1 gap-6 lg:grid-cols-12"
            >
              <div className="space-y-4 lg:col-span-4">
                <div className="space-y-4 rounded-xl border border-hairline bg-surface-soft p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-20 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-40 rounded-sm" />
                      <Skeleton className="h-4 w-28 rounded-xs" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full rounded-md" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <Skeleton className="h-16 rounded-md" />
                    <Skeleton className="h-16 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-36 w-full rounded-xl" />
              </div>
              <div className="space-y-4 lg:col-span-8">
                <Skeleton className="h-12 w-full rounded-full" />
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-xl" />
              </div>
            </div>
          ) : loadError ? (
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
          ) : !member ? (
            <Card
              variant="soft"
              className="mx-auto max-w-lg space-y-3 rounded-xl border border-dashed border-hairline bg-surface-soft p-10 text-center"
            >
              <UserIcon
                className="mx-auto size-10 text-text-muted/50"
                aria-hidden="true"
              />
              <h1 className="text-base font-bold text-ink">Member Not Found</h1>
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
          ) : (
            <>
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                {/* ── LEFT COLUMN: IDENTITY & QUICK GOVERNANCE (Sticky Desktop / Top Mobile) ── */}
                <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-4">
                  <MemberIdentityCard
                    member={member}
                    isSelf={isSelf}
                    isPrivilegedTargetForOrganizer={
                      isPrivilegedTargetForOrganizer
                    }
                    copiedId={copiedId}
                    onCopyMemberId={handleCopyMemberId}
                  />

                  {isOrganizerOrAdmin && (
                    <MemberGovernanceCard
                      member={member}
                      isAdmin={isAdmin}
                      isSelf={isSelf}
                      isPrivilegedTargetForOrganizer={
                        isPrivilegedTargetForOrganizer
                      }
                      resettingPassword={resettingPassword}
                      onResetPassword={() => void handleResetPassword()}
                      onOpenRoleModal={() => setShowRoleModal(true)}
                      onOpenDeleteModal={() => setShowDeleteModal(true)}
                    />
                  )}
                </div>

                {/* ── RIGHT COLUMN: SEGMENTED DETAILS (PROFILE / ID CARD / ATTENDANCE) ── */}
                <div className="lg:col-span-8">
                  <Tabs
                    value={activeTab}
                    onValueChange={(val) =>
                      setActiveTab(val as "profile" | "card" | "attendance")
                    }
                    variant="pill"
                    className="space-y-4"
                  >
                    <TabsList className="grid w-full grid-cols-3 p-1">
                      <TabsTrigger
                        value="profile"
                        className="min-h-[44px] w-full"
                      >
                        <UserIcon
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="hidden sm:inline">
                          Profile Information
                        </span>
                        <span className="sm:hidden">Profile</span>
                      </TabsTrigger>

                      <TabsTrigger value="card" className="min-h-[44px] w-full">
                        <QrCodeIcon
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="hidden sm:inline">
                          Digital ID & QR Card
                        </span>
                        <span className="sm:hidden">ID Card</span>
                      </TabsTrigger>

                      <TabsTrigger
                        value="attendance"
                        className="min-h-[44px] w-full"
                      >
                        <ClockIcon
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="hidden sm:inline">
                          Attendance (
                          {member.total_attendances ??
                            member.attendances?.length ??
                            0}
                          )
                        </span>
                        <span className="sm:hidden">
                          History (
                          {member.total_attendances ??
                            member.attendances?.length ??
                            0}
                          )
                        </span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="profile"
                      className="animate-in duration-150 fade-in"
                    >
                      <MemberProfileTab
                        member={member}
                        onCopyValue={handleCopyValue}
                      />
                    </TabsContent>

                    <TabsContent
                      value="card"
                      className="animate-in duration-150 fade-in"
                    >
                      <DigitalMemberCard
                        name={member.name}
                        userNumber={member.user_number}
                        role={member.role}
                        school={member.school}
                        joinedAt={member.created_at}
                        username={member.username}
                        points={member.points}
                        isClaimed={member.is_claimed}
                        onCopyMemberId={() =>
                          showToast("Member ID copied to clipboard!")
                        }
                      />
                    </TabsContent>

                    <TabsContent
                      value="attendance"
                      className="animate-in duration-150 fade-in"
                    >
                      <MemberAttendanceTab
                        attendances={member.attendances}
                        totalAttendances={member.total_attendances}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <MemberDetailModals
                member={member}
                isAdmin={isAdmin}
                isSelf={isSelf}
                showRoleModal={showRoleModal}
                onRoleModalChange={setShowRoleModal}
                newRole={newRole}
                onNewRoleChange={setNewRole}
                savingRole={savingRole}
                onSubmitRole={(e) => void handleUpdateRole(e)}
                showDeleteModal={showDeleteModal}
                onDeleteModalChange={setShowDeleteModal}
                deleting={deleting}
                onConfirmDelete={() => void handleDeleteMember()}
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
