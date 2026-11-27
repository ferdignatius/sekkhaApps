import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  CheckIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  UserIcon,
  GraduationCapIcon,
  AtSignIcon,
  UsersIcon,
  PlusIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/modules/auth"
import { Button, ManyToOneSelect } from "@/components/base"
import type { ManyToOneSelectOption } from "@/components/base"
import { RequestSchoolModal } from "@/components/common/RequestSchoolModal"
import { SuccessCelebrationModal } from "@/components/common/SuccessLottie"
import { useDebounce } from "@/hooks/useDebounce"
import { usePaginatedDropdown } from "@/hooks/usePaginatedDropdown"
import { DROPDOWN_PAGE_SIZE, fetchSchoolsPaginated } from "@/lib/pagination"

interface SchoolOption {
  id: string
  name: string
  type: string
  status?: "active" | "pending" | "cancel"
  userCount?: number
}

type OnboardingStep = "profile" | "school"

interface SimilarUsersStats {
  school: string
  totalInSchool: number
}

export function OnboardingPage() {
  const { updateUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<OnboardingStep>("profile")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Profile Form State:
  // Step 1: username & name (MANDATORY)
  // Step 2: school, school_id (OPTIONAL - CAN SKIP)
  const [profileForm, setProfileForm] = useState({
    username: "",
    name: "",
    school: "",
    school_id: "",
  })

  // School selector & Request Modal State
  const [schoolSearch, setSchoolSearch] = useState("")
  const debouncedSchoolSearch = useDebounce(schoolSearch)
  const [selectedSchoolCache, setSelectedSchoolCache] =
    useState<SchoolOption | null>(null)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestInitialName, setRequestInitialName] = useState("")

  const {
    items: schools,
    hasMore: hasMoreSchools,
    loading: schoolsLoading,
    loadingMore: loadingMoreSchools,
    total: totalSchools,
    loadMore: loadMoreSchools,
  } = usePaginatedDropdown<SchoolOption>({
    fetcher: ({ page, limit, search: term }) =>
      fetchSchoolsPaginated<SchoolOption>({
        page,
        limit,
        search: term,
        includePending: true,
      }),
    getKey: (s) => s.id,
    pageSize: DROPDOWN_PAGE_SIZE,
    search: debouncedSchoolSearch,
    enabled: step === "school",
  })

  const schoolOptions = useMemo<ManyToOneSelectOption[]>(() => {
    const mapped: ManyToOneSelectOption[] = schools.map((s) => ({
      value: s.id,
      label: s.name,
      description:
        s.status === "pending"
          ? `${s.type || "School"} · Pending review`
          : s.type || "Active Institution",
      schoolObj: s,
    }))

    if (
      profileForm.school_id &&
      profileForm.school &&
      !mapped.some((opt) => opt.value === profileForm.school_id)
    ) {
      const cached = selectedSchoolCache
      mapped.unshift({
        value: profileForm.school_id,
        label: profileForm.school,
        description:
          cached?.status === "pending"
            ? `${cached.type || "School"} · Pending review`
            : cached?.type || "Selected Institution",
        schoolObj: cached ?? {
          id: profileForm.school_id,
          name: profileForm.school,
          type: "Umum",
        },
      })
    }

    return mapped
  }, [schools, profileForm.school_id, profileForm.school, selectedSchoolCache])

  // Stats for matching/similar users
  const [stats, setStats] = useState<SimilarUsersStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Prefill profile data on mount
  useEffect(() => {
    api
      .get<{
        username?: string
        name?: string
        email?: string
        school?: string
        school_id?: string
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
          school: u.school || prev.school,
          school_id: u.school_id || prev.school_id,
        }))

        if (u.school) {
          try {
            await api.get(
              `/configure/schools?limit=5&include_pending=true&search=${encodeURIComponent(u.school)}`
            )
          } catch { }
        }
      })
      .catch(() => { })
  }, [])

  // Fetch similar users stats when school changes
  useEffect(() => {
    if (!profileForm.school) {
      setStats(null)
      return
    }

    let isCurrent = true
    setLoadingStats(true)

    const params = new URLSearchParams()
    params.set("school", profileForm.school)

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
  }, [profileForm.school])

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
      setStep("school")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      setErrorMsg(
        err.message || "Failed to save profile identity. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step 2 Handlers: School (OPTIONAL - CAN SKIP) ───────────────────────────
  function handleSchoolChange(schoolName: string, schoolObj?: SchoolOption) {
    setSelectedSchoolCache(schoolObj ?? null)
    setProfileForm((prev) => ({
      ...prev,
      school: schoolName,
      school_id: schoolObj?.id || "",
    }))
  }

  function handleOpenRequestModal(searchTerm: string) {
    setRequestInitialName(searchTerm.trim())
    setIsRequestModalOpen(true)
  }

  async function handleFinishOnboarding(skipped: boolean = false) {
    setErrorMsg(null)
    try {
      setSubmitting(true)

      // If user selected a school, save it to profile first
      if (!skipped && profileForm.school_id) {
        await api.patch("/users/me", {
          school_id: profileForm.school_id,
        })
      }

      // Mark onboarding as completed
      await api.patch("/users/me/onboarding", {
        onboarding_completed: true,
        skipped,
      })

      updateUser({
        ...(profileForm.name ? { name: profileForm.name } : {}),
        onboardingCompleted: true,
      })

      window.dispatchEvent(
        new CustomEvent("sekkha:profile_updated", {
          detail: { name: profileForm.name },
        })
      )

      // Celebrate completion briefly with success animation, then navigate to /home
      setShowSuccessModal(true)
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
            {step === "school" &&
              "Step 2: Select your school or campus (optional • can skip)"}
          </p>
        </div>

        {/* 2-Step Progress Indicator */}
        <div className="rounded-[16px] border border-[#e5e5e5] bg-[#ffffff] p-3 shadow-xs">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Step 1 Indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all sm:px-3 sm:py-1.5 ${step === "profile"
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
                className={`h-full bg-[#0a0a0a] transition-all duration-300 ${step === "school" ? "w-full" : "w-0"
                  }`}
              />
            </div>

            {/* Step 2 Indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all sm:px-3 sm:py-1.5 ${step === "school"
                ? "bg-[#0a0a0a] text-white"
                : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]"
                }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold sm:size-5 sm:text-[11px]">
                2
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
                  Official full name for your profile and Sekkha temple
                  membership card.
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
                      <span>Continue to School Selection</span>
                      <ArrowRightIcon className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 2: SCHOOL (OPTIONAL - CAN SKIP)                                */}
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

              {/* School Autocomplete Search (ManyToOneSelect) */}
              <div className="space-y-2">
                <ManyToOneSelect
                  id="onboarding-school-select"
                  label="School / Campus / Institution (Optional)"
                  value={profileForm.school_id}
                  onValueChange={(val, opt) => {
                    if (!val) {
                      handleSchoolChange("", undefined)
                      return
                    }
                    const schoolObj = opt?.schoolObj as SchoolOption | undefined
                    handleSchoolChange(
                      opt?.label || schoolObj?.name || "",
                      schoolObj ?? {
                        id: val,
                        name: opt?.label || "",
                        type: "Umum",
                      }
                    )
                  }}
                  options={schoolOptions}
                  loading={schoolsLoading}
                  hasMore={hasMoreSchools}
                  isLoadingMore={loadingMoreSchools}
                  totalCount={totalSchools}
                  onLoadMore={loadMoreSchools}
                  onSearchChange={setSchoolSearch}
                  clientFilter={false}
                  clearable={true}
                  placeholder="Search registered & active schools..."
                  searchPlaceholder="Search school or university..."
                  itemLabel="schools"
                  emptyText="No matching school found."
                  renderEmptyAction={(query, closeMenu) =>
                    query.trim().length >= 2 ? (
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outlined"
                          size="sm"
                          onClick={() => {
                            closeMenu()
                            handleOpenRequestModal(query)
                          }}
                          className="h-8 gap-1 rounded-full px-3 text-[11px] font-bold"
                        >
                          <PlusIcon className="size-3.5" />
                          <span>Request &quot;{query.trim()}&quot;</span>
                        </Button>
                      </div>
                    ) : null
                  }
                />
              </div>

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
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => {
                      setErrorMsg(null)
                      setStep("profile")
                    }}
                    className="h-11 shrink-0 gap-1.5 rounded-[12px] px-4 text-sm font-semibold"
                  >
                    <ArrowLeftIcon className="size-4" />
                    <span>Back</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    disabled={submitting}
                    onClick={() => handleFinishOnboarding(false)}
                    className="h-11 flex-1 gap-2 rounded-[12px] text-sm font-semibold"
                  >
                    {submitting ? (
                      "Finishing..."
                    ) : (
                      <>
                        <span>Finish & Enter Home</span>
                        <ArrowRightIcon className="size-4" />
                      </>
                    )}
                  </Button>
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

      <RequestSchoolModal
        open={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
        initialName={requestInitialName}
        description="Submitted requests remain Pending until verified by administrators. You can proceed with onboarding right away without waiting for approval."
        onSelectExisting={(existing) => {
          handleSchoolChange(existing.name, {
            id: existing.id,
            name: existing.name,
            type: existing.type || "Umum",
            status: existing.status || "active",
            userCount: existing.userCount || 0,
          })
        }}
        onCreated={(created) => {
          handleSchoolChange(created.name, {
            id: created.id,
            name: created.name,
            type: created.type || "Umum",
            status: created.status || "pending",
            userCount: created.userCount || 1,
          })
          setSuccessToast(
            `Registration request for "${created.name}" has been submitted and selected for your profile.`
          )
          setTimeout(() => setSuccessToast(null), 6000)
        }}
      />

      <SuccessCelebrationModal
        open={showSuccessModal}
        title="Welcome to Sekkha!"
        description="Your profile is all set. Redirecting to your community dashboard..."
        actionLabel="Go to Dashboard"
        autoCloseMs={1800}
        onComplete={() => {
          setShowSuccessModal(false)
          void navigate({ to: "/home" })
        }}
      />
    </main>
  )
}
