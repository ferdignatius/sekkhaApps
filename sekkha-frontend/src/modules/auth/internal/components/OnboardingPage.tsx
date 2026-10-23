import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  CheckIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  UserIcon,
  GraduationCapIcon,
  PhoneIcon,
  CalendarIcon,
  AtSignIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
  PlusIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/modules/auth"
import { SchoolCombobox } from "@/components/ui/SchoolCombobox"
import type { SchoolOption } from "@/components/ui/SchoolCombobox"

type OnboardingStep = "profile" | "details" | "school"

interface SimilarUsersStats {
  school: string
  class_grade: string
  totalInSchool: number
  totalInClass: number
}

const SCHOOL_TYPES = [
  { label: "Junior High (SMP)", value: "SMP" },
  { label: "Senior High (SMA)", value: "SMA" },
  { label: "Vocational High (SMK)", value: "SMK" },
  { label: "University", value: "Universitas" },
  { label: "General / Other", value: "Umum" },
] as const

type SchoolTypeValue = (typeof SCHOOL_TYPES)[number]["value"]

const SMP_GRADE_OPTIONS = [
  { label: "Grade 7 (Junior High)", value: "Kelas 7" },
  { label: "Grade 8 (Junior High)", value: "Kelas 8" },
  { label: "Grade 9 (Junior High)", value: "Kelas 9" },
]

const SMA_SMK_GRADE_OPTIONS = [
  { label: "Grade 10 (Senior High / Vocational)", value: "Kelas 10" },
  { label: "Grade 11 (Senior High / Vocational)", value: "Kelas 11" },
  { label: "Grade 12 (Senior High / Vocational)", value: "Kelas 12" },
]

export function OnboardingPage() {
  const { updateUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<OnboardingStep>("profile")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Profile Form State:
  // Step 1: username & name (MANDATORY)
  // Step 2: phone, birth_date, gender (OPTIONAL - CAN SKIP)
  // Step 3: school, school_id, class_grade (OPTIONAL - CAN SKIP)
  const [profileForm, setProfileForm] = useState({
    username: "",
    name: "",
    phone: "",
    birth_date: "",
    gender: "L",
    school: "",
    school_id: "",
    class_grade: "",
  })

  // Selected school metadata
  const [selectedSchoolType, setSelectedSchoolType] = useState<string | null>(
    null
  )

  // School Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestName, setRequestName] = useState("")
  const [requestType, setRequestType] = useState<SchoolTypeValue>("SMA")
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  // Stats for matching/similar users
  const [stats, setStats] = useState<SimilarUsersStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Grade levels only applicable to SMP, SMA, and SMK
  const hasGradeLevel =
    selectedSchoolType === "SMP" ||
    selectedSchoolType === "SMA" ||
    selectedSchoolType === "SMK"

  const availableGradeOptions =
    selectedSchoolType === "SMP"
      ? SMP_GRADE_OPTIONS
      : selectedSchoolType === "SMA" || selectedSchoolType === "SMK"
        ? SMA_SMK_GRADE_OPTIONS
        : []

  // Prefill profile data on mount
  useEffect(() => {
    api
      .get<{
        username?: string
        name?: string
        email?: string
        phone?: string
        school?: string
        school_id?: string
        class_grade?: string
        birth_date?: string
        gender?: string
      }>("/users/me")
      .then(async (u) => {
        const autoUsername =
          u.username ||
          (u.email
            ? u.email
                .split("@")[0]
                .toLowerCase()
                .replace(/[^a-z0-9_.]/g, "")
            : "")

        setProfileForm((prev) => ({
          ...prev,
          username: autoUsername || prev.username,
          name: u.name || prev.name,
          phone: u.phone || prev.phone,
          school: u.school || prev.school,
          school_id: u.school_id || prev.school_id,
          class_grade: u.class_grade || prev.class_grade,
          gender: u.gender || prev.gender,
          birth_date: u.birth_date
            ? u.birth_date.split("T")[0]
            : prev.birth_date,
        }))

        if (u.school) {
          try {
            const res: any = await api.get(
              `/configure/schools?limit=200&search=${encodeURIComponent(u.school)}`
            )
            const list: SchoolOption[] = Array.isArray(res)
              ? res
              : res?.schools || res?.data || []
            const matched = list.find(
              (s) => s.name.toLowerCase() === u.school?.toLowerCase()
            )
            if (matched) {
              setSelectedSchoolType(matched.type)
            }
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  // Fetch similar users stats when school or class_grade changes
  useEffect(() => {
    if (!profileForm.school) {
      setStats(null)
      return
    }

    let isCurrent = true
    setLoadingStats(true)

    const params = new URLSearchParams()
    params.set("school", profileForm.school)
    if (hasGradeLevel && profileForm.class_grade) {
      params.set("class_grade", profileForm.class_grade)
    }

    api
      .get<SimilarUsersStats>(`/schools/stats?${params.toString()}`)
      .then((res) => {
        if (isCurrent) setStats(res)
      })
      .catch(() => {
        if (isCurrent) setStats(null)
      })
      .finally(() => {
        if (isCurrent) setLoadingStats(false)
      })

    return () => {
      isCurrent = false
    }
  }, [profileForm.school, profileForm.class_grade, hasGradeLevel])

  // ── Step 1 Handler: Username & Full Name (MANDATORY) ─────────────────────────
  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    const cleanUsername = profileForm.username.trim().toLowerCase()
    if (!cleanUsername) {
      setErrorMsg("Username is required.")
      return
    }
    if (cleanUsername.length < 3) {
      setErrorMsg("Username must be at least 3 characters.")
      return
    }
    if (cleanUsername.length > 30) {
      setErrorMsg("Username cannot exceed 30 characters.")
      return
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setErrorMsg(
        "Username may only contain letters, numbers, periods (.), and underscores (_)."
      )
      return
    }

    const cleanName = profileForm.name.trim()
    if (!cleanName) {
      setErrorMsg("Full Name is required.")
      return
    }
    if (cleanName.length < 2) {
      setErrorMsg("Full Name must be at least 2 characters.")
      return
    }

    try {
      setSubmitting(true)
      await api.patch("/users/me", {
        username: cleanUsername,
        name: cleanName,
      })
      updateUser({ name: cleanName })
      setStep("details")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      setErrorMsg(
        err.message || "Failed to save profile identity. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step 2 Handlers: Additional Details (OPTIONAL - CAN SKIP) ────────────────
  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    try {
      setSubmitting(true)
      await api.patch("/users/me", {
        phone: profileForm.phone.trim() || null,
        birth_date: profileForm.birth_date || null,
        gender: profileForm.gender || "L",
      })
      setStep("school")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      setErrorMsg(
        err.message || "Failed to save additional details. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleStep2Skip() {
    setErrorMsg(null)
    setStep("school")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ── Step 3 Handlers: School & Class (OPTIONAL - CAN SKIP) ────────────────────
  function handleSchoolChange(schoolName: string, schoolObj?: SchoolOption) {
    const nextType = schoolObj?.type || null
    setSelectedSchoolType(nextType)

    const nextHasGrade =
      nextType === "SMP" || nextType === "SMA" || nextType === "SMK"

    setProfileForm((prev) => ({
      ...prev,
      school: schoolName,
      school_id: schoolObj?.id || "",
      class_grade: nextHasGrade ? prev.class_grade : "",
    }))
  }

  function handleOpenRequestModal(searchTerm: string) {
    setRequestName(searchTerm.trim())
    setRequestType("SMA")
    setRequestError(null)
    setIsRequestModalOpen(true)
  }

  async function handleSubmitSchoolRequest(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = requestName.trim()
    if (!trimmed || trimmed.length < 2) {
      setRequestError("School name must be at least 2 characters.")
      return
    }

    try {
      setRequestSubmitting(true)
      setRequestError(null)
      await api.post("/configure/school-requests", {
        name: trimmed,
        type: requestType,
      })
      setIsRequestModalOpen(false)
      setSuccessToast(
        `Registration request for "${trimmed}" has been submitted and is pending administrator verification.`
      )
      setTimeout(() => setSuccessToast(null), 6000)
    } catch (err: any) {
      setRequestError(err.message || "Failed to submit school request.")
    } finally {
      setRequestSubmitting(false)
    }
  }

  async function handleFinishOnboarding(skipped: boolean = false) {
    setErrorMsg(null)
    try {
      setSubmitting(true)

      // If user selected a school, save it to profile first
      if (!skipped && profileForm.school_id) {
        await api.patch("/users/me", {
          school_id: profileForm.school_id,
          class_grade:
            hasGradeLevel && profileForm.class_grade
              ? profileForm.class_grade.trim()
              : null,
        })
      }

      // Mark onboarding as completed
      await api.patch("/users/me/onboarding", {
        onboarding_completed: true,
        skipped,
      })

      window.dispatchEvent(
        new CustomEvent("sekkha:profile_updated", {
          detail: { name: profileForm.name },
        })
      )

      // Proceed directly to /home (NO PRODUCT TOUR)
      await navigate({ to: "/home" })
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete onboarding.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf0] p-4 py-10 font-sans selection:bg-[#f5f0e0] selection:text-[#0a0a0a]">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-14 items-center justify-center">
            <img
              src="/sekkha_logo.svg"
              alt="Sekkha Logo"
              className="size-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] sm:text-3xl">
            Welcome to Sekkha
          </h1>
          <p className="mx-auto max-w-md text-xs font-medium text-[#6a6a6a] sm:text-sm">
            {step === "profile" &&
              "Step 1: Confirm your basic identity to set up your official account"}
            {step === "details" &&
              "Step 2: Complete contact & personal details (optional • can skip)"}
            {step === "school" &&
              "Step 3: Select your school or campus (optional • can skip)"}
          </p>
        </div>

        {/* 3-Step Progress Indicator */}
        <div className="rounded-[16px] border border-[#e5e5e5] bg-[#ffffff] p-3 shadow-xs">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Step 1 Indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all sm:px-3 sm:py-1.5 ${
                step === "profile"
                  ? "bg-[#0a0a0a] text-white"
                  : "border border-[#22c55e]/30 bg-[#22c55e]/15 text-[#22c55e]"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold sm:size-5 sm:text-[11px]">
                {step !== "profile" ? <CheckIcon className="size-3" /> : "1"}
              </span>
              <span className="text-[11px] sm:text-xs">Profile Basics</span>
            </div>

            {/* Line 1 */}
            <div className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-[#e5e5e5]">
              <div
                className={`h-full bg-[#0a0a0a] transition-all duration-300 ${
                  step === "profile" ? "w-0" : "w-full"
                }`}
              />
            </div>

            {/* Step 2 Indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all sm:px-3 sm:py-1.5 ${
                step === "details"
                  ? "bg-[#0a0a0a] text-white"
                  : step === "school"
                    ? "border border-[#22c55e]/30 bg-[#22c55e]/15 text-[#22c55e]"
                    : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold sm:size-5 sm:text-[11px]">
                {step === "school" ? <CheckIcon className="size-3" /> : "2"}
              </span>
              <span className="text-[11px] sm:text-xs">Additional Details</span>
            </div>

            {/* Line 2 */}
            <div className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-[#e5e5e5]">
              <div
                className={`h-full bg-[#0a0a0a] transition-all duration-300 ${
                  step === "school" ? "w-full" : "w-0"
                }`}
              />
            </div>

            {/* Step 3 Indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all sm:px-3 sm:py-1.5 ${
                step === "school"
                  ? "bg-[#0a0a0a] text-white"
                  : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold sm:size-5 sm:text-[11px]">
                3
              </span>
              <span className="text-[11px] sm:text-xs">School / Campus</span>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="space-y-6 rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] p-6 shadow-xl shadow-[#0a0a0a]/5 sm:p-8">
          {/* Error Alert */}
          {errorMsg && (
            <div className="flex animate-in items-center gap-2 rounded-[12px] border border-[#ef4444]/20 bg-[#ef4444]/10 p-3.5 text-xs font-medium text-[#ef4444] fade-in">
              <AlertTriangleIcon className="size-4 shrink-0 text-[#ef4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Toast */}
          {successToast && (
            <div className="flex animate-in items-center gap-2 rounded-[12px] border border-[#22c55e]/20 bg-[#22c55e]/10 p-3.5 text-xs font-medium text-[#22c55e] fade-in">
              <CheckCircle2Icon className="size-4 shrink-0 text-[#22c55e]" />
              <span>{successToast}</span>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 1: USERNAME & FULL NAME (MANDATORY)                            */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "profile" && (
            <form
              onSubmit={handleStep1Submit}
              className="animate-in space-y-4 fade-in"
            >
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4 text-[#0a0a0a]" />
                  <span className="text-xs font-bold tracking-wider text-[#0a0a0a] uppercase">
                    Personal Identity
                  </span>
                </div>
                <span className="rounded-full border border-[#0a0a0a] bg-[#0a0a0a] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                  Required
                </span>
              </div>

              {/* Username (Mandatory, Editable) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="username-input"
                    className="flex items-center gap-1 text-xs font-bold text-[#0a0a0a]"
                  >
                    <AtSignIcon className="size-3.5 text-[#0a0a0a]" />
                    <span>Username</span>
                    <span className="text-[#ef4444]">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-[#6a6a6a]">
                    Min. 3 characters
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 text-sm font-bold text-[#6a6a6a] select-none">
                    @
                  </span>
                  <input
                    id="username-input"
                    type="text"
                    required
                    placeholder="your_username"
                    value={profileForm.username}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        username: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_.]/g, ""),
                      })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#0a0a0a] bg-[#fffaf0] py-2 pr-3.5 pl-8 text-sm font-bold text-[#0a0a0a] transition-all outline-none placeholder:font-medium placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]"
                  />
                </div>
                <p className="text-[11px] text-[#6a6a6a]">
                  Unique username for signing in and mentions in Sekkha.
                </p>
              </div>

              {/* Full Name (Mandatory) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="fullname-input"
                    className="flex items-center gap-1 text-xs font-semibold text-[#0a0a0a]"
                  >
                    <span>Full Name</span>
                    <span className="text-[#ef4444]">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-[#6a6a6a]">
                    Min. 2 characters
                  </span>
                </div>
                <input
                  id="fullname-input"
                  type="text"
                  required
                  placeholder="Enter your full legal name..."
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] transition-all outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                />
                <p className="text-[11px] text-[#6a6a6a]">
                  Official full name for your profile and Sekkha temple membership card.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50"
                >
                  {submitting ? (
                    "Saving..."
                  ) : (
                    <>
                      <span>Continue to Additional Details</span>
                      <ArrowRightIcon className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 2: ADDITIONAL DETAILS (OPTIONAL - CAN SKIP)                    */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "details" && (
            <form
              onSubmit={handleStep2Submit}
              className="animate-in space-y-4 fade-in"
            >
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4 text-[#0a0a0a]" />
                  <span className="text-xs font-bold tracking-wider text-[#0a0a0a] uppercase">
                    Additional Personal Details
                  </span>
                </div>
                <span className="rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 text-[10px] font-semibold text-[#6a6a6a] uppercase">
                  Optional • Can Skip
                </span>
              </div>

              {/* Phone / WhatsApp */}
              <div className="space-y-1.5">
                <label
                  htmlFor="phone-input"
                  className="flex items-center gap-1 text-xs font-semibold text-[#0a0a0a]"
                >
                  <PhoneIcon className="size-3 text-[#6a6a6a]" />
                  <span>Phone / WhatsApp Number</span>
                  <span className="text-[11px] font-normal text-[#6a6a6a]">
                    (Optional)
                  </span>
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  placeholder="081234567890"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] transition-all outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                />
              </div>

              {/* Date of Birth & Gender */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="birthdate-input"
                    className="flex items-center gap-1 text-xs font-semibold text-[#0a0a0a]"
                  >
                    <CalendarIcon className="size-3 text-[#6a6a6a]" />
                    <span>Date of Birth</span>
                    <span className="text-[11px] font-normal text-[#6a6a6a]">
                      (Optional)
                    </span>
                  </label>
                  <input
                    id="birthdate-input"
                    type="date"
                    value={profileForm.birth_date}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        birth_date: e.target.value,
                      })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="gender-select"
                    className="text-xs font-semibold text-[#0a0a0a]"
                  >
                    Gender
                  </label>
                  <select
                    id="gender-select"
                    value={profileForm.gender}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, gender: e.target.value })
                    }
                    className="h-11 w-full cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  >
                    <option value="L">Male</option>
                    <option value="P">Female</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-[#6a6a6a]">
                These details can be updated or filled in at any time from Profile Settings.
              </p>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null)
                      setStep("profile")
                    }}
                    className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-sm font-semibold text-[#0a0a0a] transition-all hover:bg-[#faf5e8]"
                  >
                    <ArrowLeftIcon className="size-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50"
                  >
                    {submitting ? (
                      "Saving..."
                    ) : (
                      <>
                        <span>Save & Continue</span>
                        <ArrowRightIcon className="size-4" />
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleStep2Skip}
                  className="w-full cursor-pointer py-2 text-center text-xs font-semibold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
                >
                  Skip this step →
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 3: SCHOOL & CLASS (OPTIONAL - CAN SKIP)                        */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "school" && (
            <div className="animate-in space-y-4 fade-in">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCapIcon className="size-4 text-[#0a0a0a]" />
                  <span className="text-xs font-bold tracking-wider text-[#0a0a0a] uppercase">
                    Select School / Campus
                  </span>
                </div>
                <span className="rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 text-[10px] font-semibold text-[#6a6a6a] uppercase">
                  Optional • Can Skip
                </span>
              </div>

              {/* School Autocomplete Search */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-semibold text-[#0a0a0a]">
                  <span>School / Campus / Institution</span>
                  <span className="text-[11px] font-normal text-[#6a6a6a]">
                    (Optional)
                  </span>
                </label>
                <SchoolCombobox
                  value={profileForm.school}
                  onChange={handleSchoolChange}
                  onRequestSchool={handleOpenRequestModal}
                  placeholder="Search registered & active schools..."
                />
                <p className="text-[11px] text-[#6a6a6a]">
                  Only active and verified institutions appear in search. If yours is not listed, use the "Request New School" button.
                </p>
              </div>

              {/* Grade / Class Level (Junior & Senior High) */}
              {hasGradeLevel && (
                <div className="animate-in space-y-1.5 duration-200 fade-in">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="grade-select"
                      className="text-xs font-semibold text-[#0a0a0a]"
                    >
                      Grade / Class Level
                    </label>
                    <span className="rounded bg-[#ebe6d6] px-1.5 py-0.5 text-[10px] font-semibold text-[#0a0a0a]">
                      Level: {selectedSchoolType}
                    </span>
                  </div>
                  <select
                    id="grade-select"
                    value={profileForm.class_grade}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        class_grade: e.target.value,
                      })
                    }
                    className="h-11 w-full cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  >
                    <option value="">Select your grade (Optional)...</option>
                    {availableGradeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Social Proof Peer Widget */}
              {profileForm.school && (
                <div className="space-y-2 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#0a0a0a] uppercase">
                      <UsersIcon className="size-3.5 text-[#0a0a0a]" />
                      <span>Alumni Community</span>
                    </span>
                    {stats && stats.totalInSchool > 0 && (
                      <span className="rounded-full border border-[#22c55e]/30 bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-bold text-[#22c55e]">
                        Active in Sekkha
                      </span>
                    )}
                  </div>

                  {loadingStats ? (
                    <p className="text-[#6a6a6a]">
                      Checking registered peers...
                    </p>
                  ) : stats && stats.totalInSchool > 0 ? (
                    <div className="space-y-1">
                      <p className="font-medium text-[#0a0a0a]">
                        There are{" "}
                        <span className="font-bold">
                          {stats.totalInSchool} peers
                        </span>{" "}
                        from{" "}
                        <span className="font-semibold">
                          {profileForm.school}
                        </span>{" "}
                        who have joined Sekkha!
                      </p>
                      {hasGradeLevel &&
                        profileForm.class_grade &&
                        stats.totalInClass > 0 && (
                          <p className="flex items-center gap-1 font-semibold text-[#22c55e]">
                            <SparklesIcon className="size-3" />
                            <span>
                              {stats.totalInClass} of them are in{" "}
                              {profileForm.class_grade}!
                            </span>
                          </p>
                        )}
                    </div>
                  ) : (
                    <p className="text-[#6a6a6a]">
                      Be the first representative from{" "}
                      <span className="font-semibold text-[#0a0a0a]">
                        {profileForm.school}
                      </span>{" "}
                      in Sekkha!
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null)
                      setStep("details")
                    }}
                    className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-sm font-semibold text-[#0a0a0a] transition-all hover:bg-[#faf5e8]"
                  >
                    <ArrowLeftIcon className="size-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleFinishOnboarding(false)}
                    className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50"
                  >
                    {submitting ? (
                      "Finishing..."
                    ) : (
                      <>
                        <span>Finish & Enter Home</span>
                        <ArrowRightIcon className="size-4" />
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinishOnboarding(true)}
                  className="w-full cursor-pointer py-2 text-center text-xs font-semibold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a] disabled:opacity-50"
                >
                  Skip this step →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: REQUEST NEW SCHOOL                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/50 p-4 backdrop-blur-xs fade-in">
          <div className="w-full max-w-md space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#ffffff] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2">
                <PlusIcon className="size-4 text-[#0a0a0a]" />
                <h3 className="text-sm font-bold text-[#0a0a0a]">
                  Request New School
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="rounded-full p-1 text-[#6a6a6a] hover:bg-[#e5e5e5]/50 hover:text-[#0a0a0a]"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {requestError && (
              <div className="flex items-center gap-2 rounded-[10px] border border-[#ef4444]/20 bg-[#ef4444]/10 p-2.5 text-xs text-[#ef4444]">
                <AlertTriangleIcon className="size-3.5 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSchoolRequest} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0a0a0a]">
                  School / Campus Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SMA Maitreya or University of Indonesia"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs text-[#0a0a0a] transition outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0a0a0a]">
                  Education Level
                </label>
                <select
                  value={requestType}
                  onChange={(e) =>
                    setRequestType(e.target.value as SchoolTypeValue)
                  }
                  className="h-10 w-full cursor-pointer rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs text-[#0a0a0a] transition outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                >
                  {SCHOOL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] leading-relaxed text-[#6a6a6a]">
                Submitted requests remain <strong>Pending</strong> until verified by administrators. You can proceed with onboarding right away without waiting for approval.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="h-9 cursor-pointer rounded-[10px] border border-[#e5e5e5] px-3.5 text-xs font-semibold text-[#6a6a6a] hover:bg-[#faf5e8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="h-9 cursor-pointer rounded-[10px] bg-[#0a0a0a] px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1f1f1f] disabled:opacity-50"
                >
                  {requestSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
