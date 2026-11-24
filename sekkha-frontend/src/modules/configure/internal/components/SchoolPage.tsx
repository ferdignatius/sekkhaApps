import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { InfiniteScrollFooter } from "@/components/common/InfiniteScrollFooter"
import { useAuth } from "@/modules/auth"
import { useDebouncedSearch } from "@/hooks/useDebounce"
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel"
import { schoolsApi } from "../api/configureApi"
import type {
  SchoolDirectoryStats,
  SchoolDto,
  SchoolRequestDto,
} from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Chip } from "@/components/base/Chip"
import { Badge } from "@/components/base/Badge"
import { Input } from "@/components/base/Input"
import { toast } from "@/components/base"

const SCHOOL_TYPES = ["SMP", "SMA/SMK", "Universitas", "Umum"] as const
const PAGE_SIZE = 20

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
  const [totalSchools, setTotalSchools] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [schoolStats, setSchoolStats] = useState<SchoolDirectoryStats | null>(
    null
  )
  const [pendingRequests, setPendingRequests] = useState<SchoolRequestDto[]>([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingMoreSchools, setLoadingMoreSchools] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, flushSchoolSearch] = useDebouncedSearch(search)
  const [typeFilter, setTypeFilter] = useState("all")
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const listAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      listAbortRef.current?.abort()
    }
  }, [])

  const fetchSchools = useCallback(
    async (options: { cursor?: string | null } = {}) => {
      const { cursor } = options
      const isLoadMore = Boolean(cursor)
      if (!isLoadMore) {
        listAbortRef.current?.abort()
      }
      const controller = new AbortController()
      if (!isLoadMore) {
        listAbortRef.current = controller
      }
      try {
        if (isLoadMore) {
          setLoadingMoreSchools(true)
        } else {
          setLoadingSchools(true)
        }
        const res = await schoolsApi.listCursor(
          {
            search: debouncedSearch.trim() || undefined,
            type: typeFilter,
            cursor: cursor ?? undefined,
            limit: PAGE_SIZE,
            include_stats: !isLoadMore,
          },
          { signal: controller.signal }
        )
        if (controller.signal.aborted) return

        if (isLoadMore) {
          setSchools((prev) => {
            const seen = new Set(prev.map((s) => s.id))
            const incoming = res.items.filter((s) => !seen.has(s.id))
            return [...prev, ...incoming]
          })
        } else {
          setSchools(res.items)
          setTotalSchools(res.total ?? res.items.length)
          if (res.stats) {
            setSchoolStats(res.stats)
          }
        }
        setHasMore(res.has_more)
        setNextCursor(res.next_cursor)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        if (!isLoadMore) {
          setFeedback({
            type: "error",
            message: "Failed to load institutions list.",
          })
        }
      } finally {
        if (isLoadMore) {
          setLoadingMoreSchools(false)
        } else if (!controller.signal.aborted) {
          setLoadingSchools(false)
        }
      }
    },
    [debouncedSearch, typeFilter]
  )

  const fetchRequests = useCallback(async () => {
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
  }, [canReview])

  useEffect(() => {
    void fetchSchools()
  }, [fetchSchools])

  useEffect(() => {
    if (canReview) {
      void fetchRequests()
    }
  }, [canReview, fetchRequests])

  const sentinelRef = useInfiniteScrollSentinel({
    hasMore: activeTab === "directory" && hasMore,
    loading: loadingSchools,
    loadingMore: loadingMoreSchools,
    onLoadMore: () => {
      if (nextCursor && !loadingMoreSchools) {
        void fetchSchools({ cursor: nextCursor })
      }
    },
  })

  const handleApprove = async (id: string, name: string) => {
    try {
      setProcessingId(id)
      setFeedback(null)
      await schoolsApi.acceptRequest(id)
      const okMsg = `School "${name}" approved successfully and added to directory.`
      setFeedback({
        type: "success",
        message: okMsg,
      })
      toast.success(okMsg)
      await Promise.all([fetchRequests(), fetchSchools()])
    } catch (err: any) {
      const errMsg = err?.message || `Failed to approve school "${name}".`
      setFeedback({
        type: "error",
        message: errMsg,
      })
      toast.error(errMsg)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string, name: string) => {
    try {
      setProcessingId(id)
      setFeedback(null)
      await schoolsApi.rejectRequest(id)
      const okMsg = `School request "${name}" has been rejected.`
      setFeedback({
        type: "success",
        message: okMsg,
      })
      toast.success(okMsg)
      await fetchRequests()
    } catch (err: any) {
      const errMsg = err?.message || `Failed to reject school "${name}".`
      setFeedback({
        type: "error",
        message: errMsg,
      })
      toast.error(errMsg)
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = schools

  const { totalLinkedUsers, seniorHighCount, universityCount, totalStatCount } =
    useMemo(() => {
      if (schoolStats) {
        return {
          totalLinkedUsers: schoolStats.linked_users,
          seniorHighCount: schoolStats.senior_high,
          universityCount: schoolStats.university,
          totalStatCount: schoolStats.total,
        }
      }
      let linked = 0
      let seniorHigh = 0
      let university = 0
      for (const s of schools) {
        linked += s.userCount ?? 0
        if (s.type === "SMA/SMK") seniorHigh++
        if (s.type === "Universitas") university++
      }
      return {
        totalLinkedUsers: linked,
        seniorHighCount: seniorHigh,
        universityCount: university,
        totalStatCount: totalSchools || schools.length,
      }
    }, [schools, schoolStats, totalSchools])

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
                  {totalStatCount}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      flushSchoolSearch()
                    }
                  }}
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
                    {t === "all" ? `All (${totalStatCount})` : t}
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

            {!loadingSchools && filtered.length > 0 && (
              <InfiniteScrollFooter
                hasMore={hasMore}
                isLoadingMore={loadingMoreSchools}
                loadedCount={filtered.length}
                totalCount={totalSchools || undefined}
                sentinelRef={sentinelRef}
                onLoadMore={() => {
                  if (nextCursor && !loadingMoreSchools) {
                    void fetchSchools({ cursor: nextCursor })
                  }
                }}
                itemLabel="schools"
              />
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
