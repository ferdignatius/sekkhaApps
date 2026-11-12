import { useState, useEffect } from "react"
import {
  UserIcon,
  GraduationCapIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
  AtSignIcon,
  MailIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
} from "lucide-react"
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
} from "@/components/base"
import { usePaginatedDropdown } from "@/hooks/usePaginatedDropdown"
import { DROPDOWN_PAGE_SIZE } from "@/lib/pagination"
import { userApi } from "../api/userApi"
import type { UserProfileDto, VerifiedSchoolDto } from "../api/userApi"

interface PersonalProfileSectionProps {
  profile: UserProfileDto
  onProfileUpdated: (updated: UserProfileDto) => void
  onToast: (message: string, type?: "success" | "error") => void
  onGoToSecurity?: () => void
}

const NO_SCHOOL_VALUE = "__none__"
const OTHER_SCHOOL_VALUE = "__other__"

export function PersonalProfileSection({
  profile,
  onProfileUpdated,
  onToast,
  onGoToSecurity,
}: PersonalProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [username, setUsername] = useState(profile.username || "")
  const [name, setName] = useState(profile.name || "")
  const [selectedSchoolId, setSelectedSchoolId] = useState(
    profile.school_id || (profile.school ? OTHER_SCHOOL_VALUE : NO_SCHOOL_VALUE)
  )
  const [customSchool, setCustomSchool] = useState(
    !profile.school_id && profile.school ? profile.school : ""
  )

  // Reset draft values whenever server profile updates while not editing
  useEffect(() => {
    if (isEditing) return
    setUsername(profile.username || "")
    setName(profile.name || "")
    setSelectedSchoolId(
      profile.school_id ||
        (profile.school ? OTHER_SCHOOL_VALUE : NO_SCHOOL_VALUE)
    )
    setCustomSchool(!profile.school_id && profile.school ? profile.school : "")
  }, [profile, isEditing])

  const {
    items: verifiedSchools,
    hasMore: hasMoreSchools,
    loading: schoolsLoading,
    loadingMore: loadingMoreSchools,
    total: totalSchools,
    loadMore: loadMoreSchools,
  } = usePaginatedDropdown<VerifiedSchoolDto>({
    fetcher: (params) => userApi.getVerifiedSchools(params),
    getKey: (s) => s.id,
    pageSize: DROPDOWN_PAGE_SIZE,
    enabled: isEditing,
  })

  function handleCancel() {
    setError(null)
    setIsEditing(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanUsername = username.trim().toLowerCase()
    const cleanName = name.trim()

    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters.")
      return
    }
    if (!/^[a-z0-9._-]+$/i.test(cleanUsername)) {
      setError(
        "Username may only contain letters, numbers, dots, underscores, or hyphens."
      )
      return
    }
    if (cleanName.length < 2) {
      setError("Full name must be at least 2 characters.")
      return
    }
    if (selectedSchoolId === OTHER_SCHOOL_VALUE && !customSchool.trim()) {
      setError("Please enter your school name or pick one from the list.")
      return
    }

    setSaving(true)
    try {
      let schoolIdPayload: string | null = null
      let schoolNamePayload: string | null = null

      if (selectedSchoolId === OTHER_SCHOOL_VALUE) {
        schoolIdPayload = null
        schoolNamePayload = customSchool.trim() || null
      } else if (selectedSchoolId !== NO_SCHOOL_VALUE) {
        schoolIdPayload = selectedSchoolId
        const matched = verifiedSchools.find((s) => s.id === selectedSchoolId)
        schoolNamePayload = matched?.name ?? profile.school ?? null
      }

      const updated = await userApi.updateProfile({
        username: cleanUsername,
        name: cleanName,
        school_id: schoolIdPayload,
        school: schoolNamePayload,
      })

      onProfileUpdated(updated)
      onToast("Personal profile updated successfully", "success")
      setIsEditing(false)
    } catch (err: any) {
      console.error("Failed to update profile:", err)
      const msg =
        err?.message || "Failed to update profile information. Please try again."
      setError(msg)
      onToast(msg, "error")
    } finally {
      setSaving(false)
    }
  }

  const schoolOptions = [
    { value: NO_SCHOOL_VALUE, label: "Not linked to a school" },
    ...verifiedSchools.map((s) => ({
      value: s.id,
      label: s.status === "pending" ? `${s.name} (Pending review)` : s.name,
    })),
    ...(profile.school_id &&
    !verifiedSchools.some((s) => s.id === profile.school_id)
      ? [
          {
            value: profile.school_id,
            label: profile.school || "Current School",
          },
        ]
      : []),
    { value: OTHER_SCHOOL_VALUE, label: "Other / Enter school manually..." },
  ]

  return (
    <Card className="space-y-5 border-hairline bg-canvas p-5 shadow-none sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <h3 className="text-base font-bold text-ink">Personal Information</h3>
          <p className="text-xs text-text-muted">
            Manage your member identity, contact details, and school affiliation.
          </p>
        </div>

        {!isEditing && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setError(null)
              setIsEditing(true)
            }}
            className="h-11 gap-1.5 rounded-[12px] px-4 text-xs font-bold"
          >
            <PencilIcon className="size-3.5" />
            <span>Edit Profile</span>
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="rounded-[16px] border border-hairline bg-surface-soft/55 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-text-muted uppercase">
              <UserIcon className="size-3.5" />
              <span>Full Name</span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-ink">
              {profile.name || "Not set"}
            </p>
          </div>

          <div className="rounded-[16px] border border-hairline bg-surface-soft/55 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-text-muted uppercase">
              <AtSignIcon className="size-3.5" />
              <span>Username</span>
            </div>
            <p className="mt-1.5 font-mono text-sm font-bold text-ink">
              @{profile.username}
            </p>
          </div>

          <div className="rounded-[16px] border border-hairline bg-surface-soft/55 p-3.5 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-text-muted uppercase">
                <MailIcon className="size-3.5" />
                <span>Email Address</span>
              </div>
              {profile.email_verified ? (
                <Badge variant="mint" className="gap-1 text-[10px]">
                  <ShieldCheckIcon className="size-3" />
                  <span>Verified</span>
                </Badge>
              ) : (
                <Badge variant="ochre" className="gap-1 text-[10px]">
                  <AlertCircleIcon className="size-3" />
                  <span>Unverified</span>
                </Badge>
              )}
            </div>
            <p className="mt-1.5 truncate text-sm font-bold text-ink">
              {profile.email || "Not set"}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Read-only here. Update your verified email in{" "}
              {onGoToSecurity ? (
                <button
                  type="button"
                  onClick={onGoToSecurity}
                  className="cursor-pointer font-bold text-ink underline underline-offset-2 hover:opacity-80"
                >
                  Security &amp; Settings
                </button>
              ) : (
                <span className="font-bold text-ink">Security &amp; Settings</span>
              )}
              .
            </p>
          </div>

          <div className="rounded-[16px] border border-hairline bg-surface-soft/55 p-3.5 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-text-muted uppercase">
                <GraduationCapIcon className="size-3.5" />
                <span>School / University</span>
              </div>
              {profile.school_status === "pending" && (
                <Badge variant="ochre" className="text-[10px]">
                  Pending review
                </Badge>
              )}
            </div>
            <p className="mt-1.5 text-sm font-bold text-ink">
              {profile.school || "Not set"}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="text-xs">
              {error}
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              startIcon={<UserIcon className="size-4" />}
              required
            />

            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              startIcon={<AtSignIcon className="size-4" />}
              required
            />

            <div className="sm:col-span-2">
              <Select
                label={
                  schoolsLoading
                    ? "School / University (Loading...)"
                    : "School / University"
                }
                value={selectedSchoolId}
                onValueChange={(val) => setSelectedSchoolId(val)}
                options={schoolOptions}
                disabled={schoolsLoading}
                hasMore={hasMoreSchools}
                isLoadingMore={loadingMoreSchools}
                totalCount={totalSchools}
                onLoadMore={loadMoreSchools}
              />
            </div>

            {selectedSchoolId === OTHER_SCHOOL_VALUE && (
              <div className="sm:col-span-2">
                <Input
                  label="Custom School / Institution Name"
                  value={customSchool}
                  onChange={(e) => setCustomSchool(e.target.value)}
                  placeholder="Enter full school or university name"
                  startIcon={<GraduationCapIcon className="size-4" />}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-hairline pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={handleCancel}
              className="h-11 gap-1.5 rounded-[12px] px-4 text-xs font-bold"
            >
              <XIcon className="size-4" />
              <span>Cancel</span>
            </Button>

            <Button
              type="submit"
              variant="filled"
              disabled={saving}
              className="h-11 gap-1.5 rounded-[12px] px-5 text-xs font-bold"
            >
              {saving ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="size-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
