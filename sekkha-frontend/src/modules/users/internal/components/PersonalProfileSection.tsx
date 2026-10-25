import { useState, useEffect } from "react"
import {
  UserIcon,
  PencilIcon,
  CheckIcon,
  PhoneIcon,
  GraduationCapIcon,
  CalendarIcon,
  Loader2Icon,
} from "lucide-react"
import { Button } from "@/components/base"
import { userApi } from "../api/userApi"
import type {
  UserProfileDto,
  UpdateProfilePayload,
  VerifiedSchoolDto,
} from "../api/userApi"

interface PersonalProfileSectionProps {
  profile: UserProfileDto
  onProfileUpdated: (updated: UserProfileDto) => void
  onToast: (message: string, type?: "success" | "error") => void
}

export function PersonalProfileSection({
  profile,
  onProfileUpdated,
  onToast,
}: PersonalProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [verifiedSchools, setVerifiedSchools] = useState<VerifiedSchoolDto[]>(
    []
  )

  // Form state
  const [formData, setFormData] = useState<UpdateProfilePayload>({
    name: "",
    phone: "",
    school_id: "",
    school: "",
    date_of_birth: "",
  })

  // Load verified schools for dropdown
  useEffect(() => {
    userApi
      .getVerifiedSchools()
      .then(setVerifiedSchools)
      .catch(() => {})
  }, [])

  // Sync profile data to form state
  useEffect(() => {
    if (profile) {
      const rawDob = profile.date_of_birth || ""
      const formattedDob = rawDob ? rawDob.split("T")[0] : ""

      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        school_id: profile.school_id || "",
        school: profile.school || "",
        date_of_birth: formattedDob,
      })
    }
  }, [profile])

  function handleStartEditing() {
    setIsEditing(true)
  }

  function handleCancelEditing() {
    // Reset to existing profile
    const rawDob = profile.date_of_birth || ""
    const formattedDob = rawDob ? rawDob.split("T")[0] : ""

    setFormData({
      name: profile.name || "",
      phone: profile.phone || "",
      school_id: profile.school_id || "",
      school: profile.school || "",
      date_of_birth: formattedDob,
    })
    setIsEditing(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name?.trim()) {
      onToast("Full name is required", "error")
      return
    }

    setSubmitting(true)
    try {
      const payload: UpdateProfilePayload = {
        name: formData.name.trim(),
        phone: formData.phone?.trim() || null,
        school_id: formData.school_id || null,
        school: formData.school?.trim() || null,
        date_of_birth: formData.date_of_birth || null,
      }

      const updated = await userApi.updateProfile(payload)
      onProfileUpdated(updated)

      // Notify global listeners (e.g. sidebar avatar & greeting)
      if (updated.name) {
        window.dispatchEvent(
          new CustomEvent("sekkha:profile_updated", {
            detail: { name: updated.name },
          })
        )
      }

      onToast("Profile updated successfully!")
      setIsEditing(false)
    } catch (err: any) {
      onToast(err.message || "Failed to update profile", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Format date of birth for view mode
  const rawDob = profile.date_of_birth
  const formattedDisplayDob = rawDob
    ? new Date(rawDob).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Not set"

  return (
    <div className="space-y-5 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
      {/* ── TOP SECTION HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
            <UserIcon className="size-4.5 text-[#e8b94a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              {isEditing ? "Edit Personal Profile" : "Personal Information"}
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              {isEditing
                ? "Modify your personal details below. Changes will be saved directly."
                : "Your community identity and contact records"}
            </p>
          </div>
        </div>

        {!isEditing && (
          <Button
            variant="filled"
            type="button"
            onClick={handleStartEditing}
            className="gap-1.5 rounded-[12px] px-4 text-xs font-bold sm:text-sm"
          >
            <PencilIcon className="size-3.5" />
            <span>Edit Profile</span>
          </Button>
        )}
      </div>

      {/* ── STATE 1: VIEW MODE (IN-PLACE CARD DISPLAY) ── */}
      {!isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-1 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <span className="block text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                Full Name
              </span>
              <p className="text-sm font-bold text-[#0a0a0a]">
                {profile.name || "—"}
              </p>
            </div>

            {/* Username */}
            <div className="space-y-1 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <span className="block text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                Username
              </span>
              <p className="font-mono text-sm font-bold text-[#0a0a0a]">
                {profile.username ? `@${profile.username}` : "—"}
              </p>
            </div>

            {/* WhatsApp / Phone */}
            <div className="space-y-1 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <div className="flex items-center gap-1.5">
                <PhoneIcon className="size-3 text-[#6a6a6a]" />
                <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  WhatsApp / Phone
                </span>
              </div>
              <p className="text-sm font-semibold text-[#0a0a0a]">
                {profile.phone || "Not set"}
              </p>
            </div>

            {/* School / University */}
            <div className="space-y-1 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <div className="flex items-center gap-1.5">
                <GraduationCapIcon className="size-3 text-[#6a6a6a]" />
                <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  School / University
                </span>
              </div>
              <p className="text-sm font-semibold text-[#0a0a0a]">
                {profile.school || "Not set"}
              </p>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="size-3 text-[#6a6a6a]" />
                <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  Date of Birth
                </span>
              </div>
              <p className="text-sm font-semibold text-[#0a0a0a]">
                {formattedDisplayDob}
              </p>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="size-3 text-[#6a6a6a]" />
                <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  Date of Birth
                </span>
              </div>
              <p className="text-sm font-semibold text-[#0a0a0a]">
                {formattedDisplayDob}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ── STATE 2: EDIT MODE (INLINE IN-PAGE FORM — NO POPUP MODAL) ── */
        <form
          onSubmit={handleSubmit}
          className="animate-in space-y-4 duration-200 fade-in"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter your full name"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 text-xs font-semibold text-[#0a0a0a] transition-colors outline-none focus:border-[#0a0a0a] focus:bg-[#fffaf0] sm:text-sm"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                WhatsApp / Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="e.g. 08123456789"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 text-xs font-semibold text-[#0a0a0a] transition-colors outline-none focus:border-[#0a0a0a] focus:bg-[#fffaf0] sm:text-sm"
              />
            </div>

            {/* School Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                School / University
              </label>
              <select
                value={formData.school_id || ""}
                onChange={(e) => {
                  const selectedId = e.target.value
                  const selectedSchool = verifiedSchools.find(
                    (s) => s.id === selectedId
                  )
                  setFormData((prev) => ({
                    ...prev,
                    school_id: selectedId,
                    school: selectedSchool ? selectedSchool.name : "",
                  }))
                }}
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 text-xs font-semibold text-[#0a0a0a] transition-colors outline-none focus:border-[#0a0a0a] focus:bg-[#fffaf0] sm:text-sm"
              >
                <option value="">-- Select verified school --</option>
                {verifiedSchools.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name} {sch.type ? `(${sch.type})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.date_of_birth || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    date_of_birth: e.target.value,
                  }))
                }
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 text-xs font-semibold text-[#0a0a0a] transition-colors outline-none focus:border-[#0a0a0a] focus:bg-[#fffaf0] sm:text-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[#e5e5e5] pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={handleCancelEditing}
              className="h-11 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-5 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] disabled:opacity-50 sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-6 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50 sm:text-sm"
            >
              {submitting ? (
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
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
