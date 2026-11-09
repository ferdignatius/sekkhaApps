import { useEffect, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  GraduationCapIcon,
  SearchIcon,
  UsersIcon,
  PlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  Building2Icon,
  AlertCircleIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { schoolsApi } from "../api/configureApi"
import type { SchoolDto, SchoolRequestDto } from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Chip } from "@/components/base/Chip"
import { Badge } from "@/components/base/Badge"
import { Input } from "@/components/base/Input"

const SCHOOL_TYPES = ["SMP", "SMA/SMK", "Universitas", "Umum"] as const

export function SchoolPage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"
  const canReview =
    authState.status === "authenticated" &&
    (authState.role === "admin" || authState.role === "organizer")

  const [activeTab, setActiveTab] = useState<"directory" | "requests">(
    "directory"
  )
  const [schools, setSchools] = useState<SchoolDto[]>([])
  const [pendingRequests, setPendingRequests] = useState<SchoolRequestDto[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const fetchSchools = async () => {
    try {
      setLoadingSchools(true)
      const data = await schoolsApi.list({ is_active: undefined })
      setSchools(data)
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to load institutions list.",
      })
    } finally {
      setLoadingSchools(false)
    }
  }

  const fetchRequests = async () => {
    if (!canReview) return
    try {
      setLoadingRequests(true)
      const data = await schoolsApi.requests()
      setPendingRequests(data)
    } catch {
      // Non-blocking error for requests
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    void fetchSchools()
    if (canReview) {
      void fetchRequests()
    }
  }, [canReview])

  const handleApprove = async (id: string, name: string) => {
    try {
      setProcessingId(id)
      setFeedback(null)
      await schoolsApi.acceptRequest(id)
      setFeedback({
        type: "success",
        message: `School "${name}" approved successfully and added to directory.`,
      })
      await Promise.all([fetchRequests(), fetchSchools()])
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || `Failed to approve school "${name}".`,
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string, name: string) => {
    try {
      setProcessingId(id)
      setFeedback(null)
      await schoolsApi.rejectRequest(id)
      setFeedback({
        type: "success",
        message: `School request "${name}" has been rejected.`,
      })
      await fetchRequests()
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || `Failed to reject school "${name}".`,
      })
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return schools.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q)

      const matchesType = typeFilter === "all" ? true : s.type === typeFilter

      return matchesSearch && matchesType
    })
  }, [schools, search, typeFilter])

  const {
    totalLinkedUsers,
    seniorHighCount,
    universityCount,
    activeCount,
    inactiveCount,
  } = useMemo(() => {
    let linked = 0
    let seniorHigh = 0
    let university = 0
    let active = 0
    let inactive = 0
    for (const s of schools) {
      linked += s.userCount ?? 0
      if (s.type === "SMA/SMK") seniorHigh++
      if (s.type === "Universitas") university++
      if (s.is_active === false) {
        inactive++
      } else {
        active++
      }
    }
    return {
      totalLinkedUsers: linked,
      seniorHighCount: seniorHigh,
      universityCount: university,
      activeCount: active,
      inactiveCount: inactive,
    }
  }, [schools])
  void activeCount
  void inactiveCount

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-24 text-left font-sans">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Schools & Universities" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-3.5 py-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#e5e5e5] pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-white shadow-2xs">
              <GraduationCapIcon className="size-6 text-clay-ochre" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0a0a0a]">
                Schools & Universities
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Official master directory of educational institutions for
                congregation and youth.
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button
              asChild
              className="h-10 gap-2 rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#262626]"
            >
              <Link to="/configure/master/school/new">
                <PlusIcon className="size-4" />
                Add Institution
              </Link>
            </Button>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-center justify-between gap-3 rounded-[14px] border p-4 text-xs font-medium shadow-2xs ${
              feedback.type === "success"
                ? "border-clay-success/30 bg-clay-success/15 text-clay-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-clay-success" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="rounded p-1 hover:bg-black/5"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation (Organizer & Admin) */}
        {canReview && (
          <div className="flex items-center gap-2 border-b border-[#e5e5e5] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "directory"
                  ? "bg-[#0a0a0a] text-white shadow-xs"
                  : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:bg-[#ebe6d6] hover:text-[#0a0a0a]"
              }`}
            >
              <Building2Icon className="size-3.5" />
              <span>Verified Directory</span>
              <span
                className={`py-0.2 rounded-full px-1.5 text-[10px] ${
                  activeTab === "directory"
                    ? "bg-white/20 text-white"
                    : "bg-[#e5e5e5] text-[#0a0a0a]"
                }`}
              >
                {schools.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "requests"
                  ? "bg-[#0a0a0a] text-white shadow-xs"
                  : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:bg-[#ebe6d6] hover:text-[#0a0a0a]"
              }`}
            >
              <ClockIcon className="size-3.5" />
              <span>Pending Requests</span>
              {pendingRequests.length > 0 && (
                <span className="py-0.2 rounded-full bg-clay-warning px-1.5 text-[10px] font-black text-white">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* TAB 1: DIRECTORY */}
        {activeTab === "directory" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-2xs">
                <p className="text-xs text-[#6a6a6a]">Total Institutions</p>
                <p className="mt-1 text-2xl font-black text-[#0a0a0a]">
                  {schools.length}
                </p>
              </Card>
              <Card className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-2xs">
                <p className="text-xs text-[#6a6a6a]">
                  Senior & Vocational (SMA/SMK)
                </p>
                <p className="mt-1 text-2xl font-black text-[#0a0a0a]">
                  {seniorHighCount}
                </p>
              </Card>
              <Card className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-2xs">
                <p className="text-xs text-[#6a6a6a]">Higher Education</p>
                <p className="mt-1 text-2xl font-black text-[#0a0a0a]">
                  {universityCount}
                </p>
              </Card>
              <Card className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-2xs">
                <p className="flex items-center gap-1 text-xs text-[#6a6a6a]">
                  <UsersIcon className="size-3 text-clay-ochre" /> Connected
                  Youth
                </p>
                <p className="mt-1 text-2xl font-black text-[#0a0a0a]">
                  {totalLinkedUsers}
                </p>
              </Card>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-xs">
                <Input
                  className="border border-[#e5e5e5] bg-[#fffaf0]"
                  placeholder="Search institution name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  startIcon={<SearchIcon className="size-4 text-[#6a6a6a]" />}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {["all", ...SCHOOL_TYPES].map((t) => (
                  <Chip
                    key={t}
                    variant="filter"
                    selected={typeFilter === t}
                    onClick={() => setTypeFilter(t)}
                    className="shrink-0 text-xs"
                  >
                    {t === "all" ? `All (${schools.length})` : t}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Responsive Clay Card Grid View */}
            {loadingSchools ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 animate-pulse rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-5 shadow-2xs"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] py-16 text-center shadow-2xs">
                <GraduationCapIcon className="mx-auto size-10 text-[#6a6a6a]/40" />
                <p className="mt-3 text-sm font-semibold text-[#0a0a0a]">
                  No institutions found
                </p>
                <p className="mt-1 text-xs text-[#6a6a6a]">
                  Try adjusting your search query or institution level filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((s) => (
                  <Card
                    key={s.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-5 shadow-2xs transition-all hover:border-[#0a0a0a]/30 hover:shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-base font-bold tracking-tight text-[#0a0a0a]">
                          {s.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          size="sm"
                          className="shrink-0 border border-[#e5e5e5] bg-[#fffaf0] font-semibold text-[#0a0a0a]"
                        >
                          {s.type || "Umum"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#6a6a6a]">
                        <span className="flex items-center gap-1 font-semibold text-[#0a0a0a]">
                          <UsersIcon className="size-3.5 text-clay-ochre" />
                          {s.userCount ?? 0} Members
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#f0ece1] pt-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          s.is_active === false
                            ? "text-[#8a8a8a]"
                            : "text-clay-success"
                        }`}
                      >
                        {s.is_active === false ? "Inactive" : "Active"}
                      </span>
                      <Link
                        to="/configure/master/school/$schoolId"
                        params={{ schoolId: s.id }}
                        className="flex items-center gap-1 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 py-1.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] hover:bg-[#ebe6d6]"
                      >
                        View Details
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENDING REQUESTS */}
        {activeTab === "requests" && canReview && (
          <div className="space-y-4">
            <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-2xs">
              <p className="text-xs text-[#6a6a6a]">
                New institution requests submitted by youth during onboarding.
                Approving will immediately add them to the verified directory
                for all members.
              </p>
            </div>

            {loadingRequests ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 animate-pulse rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-5 shadow-2xs"
                  />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] py-16 text-center shadow-2xs">
                <CheckCircle2Icon className="mx-auto size-10 text-clay-success/50" />
                <p className="mt-3 text-sm font-semibold text-[#0a0a0a]">
                  No pending requests
                </p>
                <p className="mt-1 text-xs text-[#6a6a6a]">
                  All institution requests have been reviewed and processed.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map((r) => {
                  const reqName = r.name
                  const reqType = r.type || "SMA/SMK"
                  const isBusy = processingId === r.id

                  return (
                    <Card
                      key={r.id}
                      className="flex flex-col justify-between overflow-hidden rounded-[20px] border border-clay-warning/40 bg-[#faf5e8] p-5 shadow-2xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 text-base font-bold text-[#0a0a0a]">
                            {reqName}
                          </h3>
                          <Badge
                            variant="secondary"
                            size="sm"
                            className="border border-clay-warning/40 bg-clay-warning/15 font-bold text-clay-warning"
                          >
                            {reqType}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs text-[#6a6a6a]">
                          <p className="flex items-center gap-1.5">
                            <UsersIcon className="size-3.5 text-[#6a6a6a]" />
                            <span>
                              Requested by:{" "}
                              <strong className="text-[#0a0a0a]">
                                {r.requester_name || "Community Member"}
                              </strong>
                              {r.userCount !== undefined && r.userCount > 0 && (
                                <span className="ml-1 text-[11px] text-[#8a8a8a]">
                                  ({r.userCount} {r.userCount === 1 ? "user" : "users"} waiting)
                                </span>
                              )}
                            </span>
                          </p>
                          <p className="text-[11px] text-[#8a8a8a]">
                            Submitted:{" "}
                            {r.created_at
                              ? new Date(r.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )
                              : "Recently"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-[#f0ece1] pt-3">
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleApprove(r.id, reqName)}
                          className="flex-1 gap-1.5 rounded-[10px] bg-clay-success text-xs font-bold text-white hover:bg-clay-success/90"
                        >
                          <CheckIcon className="size-3.5" />
                          {isBusy ? "Processing..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => void handleReject(r.id, reqName)}
                          className="gap-1.5 rounded-[10px] border border-destructive/30 text-xs font-bold text-destructive hover:bg-destructive/10"
                        >
                          <XIcon className="size-3.5" />
                          Reject
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
