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
  ChevronRightIcon,
  XIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { InfiniteScrollFooter } from "@/components/common/InfiniteScrollFooter"
import { useAuth } from "@/modules/auth"
import { useDebouncedSearch } from "@/hooks/useDebounce"
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel"
import { useIsDesktop } from "@/hooks/useIsDesktop"
import { notifySchoolRequestsChanged } from "@/hooks/usePendingSchoolRequestsCount"
import { schoolsApi } from "../api/configureApi"
import type {
  SchoolDirectoryStats,
  SchoolDto,
  SchoolRequestDto,
} from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Badge } from "@/components/base/Badge"
import { Input } from "@/components/base/Input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from "@/components/base"

const SCHOOL_TYPES = ["SMP", "SMA/SMK", "Universitas", "Umum"] as const
const PAGE_SIZE = 20

export function SchoolPage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"
  const canReview =
    authState.status === "authenticated" &&
    (authState.role === "admin" || authState.role === "organizer")

  const isDesktop = useIsDesktop(640)
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<SchoolRequestDto | null>(
    null
  )
  const [rejectMode, setRejectMode] = useState<"clear" | "assign">("clear")
  const [assignSchoolSearch, setAssignSchoolSearch] = useState("")
  const [debouncedAssignSearch] = useDebouncedSearch(assignSchoolSearch)
  const [assignSchoolOptions, setAssignSchoolOptions] = useState<SchoolDto[]>(
    []
  )
  const [loadingAssignSchools, setLoadingAssignSchools] = useState(false)
  const [selectedAssignSchool, setSelectedAssignSchool] =
    useState<SchoolDto | null>(null)
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
          setLoadError(null)
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
          setLoadError("Failed to load institutions list.")
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
      await schoolsApi.acceptRequest(id)
      toast.success(`School "${name}" approved and added to directory`)
      notifySchoolRequestsChanged()
      await Promise.all([fetchRequests(), fetchSchools()])
    } catch (err: any) {
      toast.error(err?.message || `Failed to approve school "${name}"`)
    } finally {
      setProcessingId(null)
    }
  }

  const openRejectDialog = (target: SchoolRequestDto) => {
    setRejectTarget(target)
    setRejectMode("clear")
    setAssignSchoolSearch("")
    setSelectedAssignSchool(null)
  }

  useEffect(() => {
    if (!rejectTarget || rejectMode !== "assign") return
    const controller = new AbortController()
    setLoadingAssignSchools(true)
    schoolsApi
      .listCursor(
        {
          search: debouncedAssignSearch.trim() || undefined,
          limit: 10,
          include_stats: false,
        },
        { signal: controller.signal }
      )
      .then((res) => {
        if (!controller.signal.aborted) {
          setAssignSchoolOptions(
            res.items.filter((item) => item.id !== rejectTarget.id)
          )
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingAssignSchools(false)
        }
      })
    return () => controller.abort()
  }, [rejectTarget, rejectMode, debouncedAssignSearch])

  const handleConfirmReject = async () => {
    if (!rejectTarget) return
    if (rejectMode === "assign" && !selectedAssignSchool) return
    const target = rejectTarget
    const assignSchool = rejectMode === "assign" ? selectedAssignSchool : null
    try {
      setProcessingId(target.id)
      await schoolsApi.rejectRequest(target.id, {
        assign_school_id: assignSchool ? assignSchool.id : null,
      })
      toast.success(
        assignSchool
          ? `Request "${target.name}" rejected and waiting users assigned to "${assignSchool.name}"`
          : `School request "${target.name}" rejected`
      )
      setRejectTarget(null)
      notifySchoolRequestsChanged()
      await Promise.all([
        fetchRequests(),
        ...(assignSchool ? [fetchSchools()] : []),
      ])
    } catch (err: any) {
      toast.error(err?.message || `Failed to reject school "${target.name}"`)
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
    <main className="min-h-screen bg-[#fffaf0] pb-28 text-left font-sans md:pb-16">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Schools & Universities" },
        ]}
        backTo="/home"
      />

      <div className="mx-auto max-w-7xl space-y-4 px-3.5 py-2 sm:space-y-5 sm:px-6 sm:py-4 md:px-8">
        {/* Desktop Header (hidden on mobile where PageBreadcrumb already shows title) */}
        <div className="hidden items-center justify-between gap-4 border-b border-[#e5dec9] pb-4 sm:flex">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[#e5dec9] bg-[#faf5e8] text-[#0a0a0a]">
              <GraduationCapIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-[#0a0a0a]">
                Schools & Universities
              </h1>
              <p className="truncate text-xs text-[#6a6a6a]">
                Verified educational institutions for congregation and youth
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              asChild
              className="h-10 shrink-0 gap-2 rounded-full bg-[#0a0a0a] px-4 text-xs font-semibold text-white shadow-2xs hover:bg-[#262626]"
            >
              <Link to="/configure/master/school/new">
                <PlusIcon className="size-4" aria-hidden="true" />
                Add Institution
              </Link>
            </Button>
          )}
        </div>

        {/* Load Error Alert */}
        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" aria-hidden="true" />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={() => void fetchSchools()}
              className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1 font-semibold hover:bg-black/5"
            >
              Retry
            </button>
          </div>
        )}

        {/* Segmented Tab Navigation (Organizer & Admin) */}
        {canReview && (
          <div className="grid grid-cols-2 gap-1 rounded-full border border-[#e5dec9] bg-[#f3eee0] p-1 sm:inline-flex">
            <button
              type="button"
              onClick={() => setActiveTab("directory")}
              className={`flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "directory"
                  ? "bg-[#fffaf0] text-[#0a0a0a] shadow-2xs"
                  : "text-[#6a6a6a] hover:text-[#0a0a0a]"
              }`}
            >
              <Building2Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Verified Directory</span>
              <span className="rounded-full bg-[#e5dec9]/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#0a0a0a]">
                {totalStatCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={`flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "requests"
                  ? "bg-[#fffaf0] text-[#0a0a0a] shadow-2xs"
                  : "text-[#6a6a6a] hover:text-[#0a0a0a]"
              }`}
            >
              <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Pending Requests</span>
              {pendingRequests.length > 0 && (
                <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* TAB 1: DIRECTORY */}
        {activeTab === "directory" && (
          <div className="space-y-3.5 sm:space-y-5">
            {!isDesktop ? (
              /* Mobile Compact Summary Strip */
              <div className="flex items-center justify-between rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] px-3.5 py-2.5 text-xs text-[#6a6a6a]">
                <span>
                  <strong className="font-semibold tabular-nums text-[#0a0a0a]">
                    {totalStatCount}
                  </strong>{" "}
                  {totalStatCount === 1 ? "Institution" : "Institutions"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UsersIcon
                    className="size-3.5 text-[#6a6a6a]"
                    aria-hidden="true"
                  />
                  <strong className="font-semibold tabular-nums text-[#0a0a0a]">
                    {totalLinkedUsers}
                  </strong>{" "}
                  Connected Youth
                </span>
              </div>
            ) : (
              /* Desktop 4-Col Stats Strip */
              <div className="grid grid-cols-4 gap-3">
                <Card className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-4 shadow-none">
                  <p className="text-xs font-medium text-[#6a6a6a]">
                    Total Institutions
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#0a0a0a]">
                    {totalStatCount}
                  </p>
                </Card>
                <Card className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-4 shadow-none">
                  <p className="text-xs font-medium text-[#6a6a6a]">SMA/SMK</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#0a0a0a]">
                    {seniorHighCount}
                  </p>
                </Card>
                <Card className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-4 shadow-none">
                  <p className="text-xs font-medium text-[#6a6a6a]">
                    University
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#0a0a0a]">
                    {universityCount}
                  </p>
                </Card>
                <Card className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-4 shadow-none">
                  <p className="text-xs font-medium text-[#6a6a6a]">
                    Connected Youth
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#0a0a0a]">
                    {totalLinkedUsers}
                  </p>
                </Card>
              </div>
            )}

            {/* Search & Rounded-Full Level Filter Chips */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Input
                  className="rounded-full border border-[#e5dec9] bg-[#fffaf0] pr-9"
                  placeholder="Search institutions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      flushSchoolSearch()
                    }
                  }}
                  startIcon={
                    <SearchIcon
                      className="size-4 text-[#6a6a6a]"
                      aria-hidden="true"
                    />
                  }
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-3 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#e5dec9]/70 text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-white"
                  >
                    <XIcon className="size-3" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="scrollbar-none -mx-3.5 flex items-center gap-1.5 overflow-x-auto px-3.5 py-0.5 sm:mx-0 sm:gap-2 sm:px-0">
                {["all", ...SCHOOL_TYPES].map((t) => {
                  const selected = typeFilter === t
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTypeFilter(t)}
                      className={`inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors active:scale-95 ${
                        selected
                          ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-2xs"
                          : "border-[#e5dec9] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
                      }`}
                    >
                      {t === "all" ? `All · ${totalStatCount}` : t}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Responsive Directory View: Grouped List on Mobile, Card Grid on Desktop */}
            {loadingSchools ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-[16px] border border-[#e5dec9] bg-[#faf5e8] p-4 sm:h-24"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[18px] border border-[#e5dec9] bg-[#faf5e8] py-14 text-center">
                <GraduationCapIcon
                  className="mx-auto size-9 text-[#6a6a6a]/45"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-[#0a0a0a]">
                  No institutions found
                </p>
                <p className="mt-1 text-xs text-[#6a6a6a]">
                  Try adjusting your search query or level filter
                </p>
              </div>
            ) : !isDesktop ? (
              /* Mobile Grouped List */
              <div className="divide-y divide-[#e5dec9] overflow-hidden rounded-[20px] border border-[#e5dec9] bg-[#fffaf0] shadow-2xs">
                {filtered.map((s) => {
                  const isActive = s.is_active !== false
                  const count = s.userCount ?? 0
                  return (
                    <Link
                      key={s.id}
                      to="/configure/master/school/$schoolId"
                      params={{ schoolId: s.id }}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors active:bg-[#faf5e8]"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[#0a0a0a]">
                            {s.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6a6a6a]">
                          <span className="tabular-nums">
                            {count} {count === 1 ? "Member" : "Members"}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <span
                              className={`size-1.5 rounded-full ${
                                isActive ? "bg-emerald-600" : "bg-neutral-400"
                              }`}
                              aria-hidden="true"
                            />
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="secondary"
                          size="sm"
                          className="border border-[#e5dec9] bg-[#faf5e8] font-medium text-[#0a0a0a]"
                        >
                          {s.type || "Umum"}
                        </Badge>
                        <ChevronRightIcon
                          className="size-4 text-[#6a6a6a]"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              /* Desktop Card Grid */
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {filtered.map((s) => {
                  const isActive = s.is_active !== false
                  const count = s.userCount ?? 0
                  return (
                    <Link
                      key={s.id}
                      to="/configure/master/school/$schoolId"
                      params={{ schoolId: s.id }}
                      className="group block rounded-[16px] focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:outline-none"
                    >
                      <Card className="flex h-full flex-col justify-between gap-3 rounded-[16px] border border-[#e5dec9] bg-[#faf5e8] p-4 shadow-none transition-colors hover:border-[#0a0a0a]/30 hover:bg-[#f5efe0]">
                        <div className="flex items-start justify-between gap-2.5">
                          <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-[#0a0a0a]">
                            {s.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            size="sm"
                            className="shrink-0 border border-[#e5dec9] bg-[#fffaf0] font-medium text-[#0a0a0a]"
                          >
                            {s.type || "Umum"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-[#6a6a6a]">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-[#0a0a0a]">
                              <UsersIcon
                                className="size-3.5 text-[#6a6a6a]"
                                aria-hidden="true"
                              />
                              {count} {count === 1 ? "Member" : "Members"}
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <span
                                className={`size-1.5 rounded-full ${
                                  isActive ? "bg-emerald-600" : "bg-neutral-400"
                                }`}
                                aria-hidden="true"
                              />
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <ChevronRightIcon
                            className="size-4 shrink-0 text-[#6a6a6a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0a0a0a]"
                            aria-hidden="true"
                          />
                        </div>
                      </Card>
                    </Link>
                  )
                })}
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
            <div className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] px-4 py-3">
              <p className="text-xs text-[#6a6a6a]">
                New institution requests submitted by youth during onboarding.
                Approving adds them to the verified directory.
              </p>
            </div>

            {loadingRequests ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 animate-pulse rounded-[16px] border border-[#e5dec9] bg-[#faf5e8] p-4"
                  />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="rounded-[18px] border border-[#e5dec9] bg-[#faf5e8] py-14 text-center">
                <CheckCircle2Icon
                  className="mx-auto size-9 text-emerald-600/60"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-[#0a0a0a]">
                  No pending requests
                </p>
                <p className="mt-1 text-xs text-[#6a6a6a]">
                  All institution requests have been reviewed
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map((r) => {
                  const reqName = r.name
                  const reqType = r.type || "SMA/SMK"
                  const isBusy = processingId === r.id

                  return (
                    <Card
                      key={r.id}
                      className="flex flex-col justify-between gap-3 rounded-[16px] border border-[#e5dec9] bg-[#faf5e8] p-4 shadow-none"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 text-sm font-semibold text-[#0a0a0a] sm:text-base">
                            {reqName}
                          </h3>
                          <Badge
                            variant="secondary"
                            size="sm"
                            className="shrink-0 border border-[#e5dec9] bg-[#fffaf0] font-medium text-[#0a0a0a]"
                          >
                            {reqType}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs text-[#6a6a6a]">
                          <p className="flex items-center gap-1.5">
                            <UsersIcon
                              className="size-3.5 shrink-0 text-[#6a6a6a]"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              Requested by{" "}
                              <strong className="font-semibold text-[#0a0a0a]">
                                {r.requester_name || "Community Member"}
                              </strong>
                              {r.userCount !== undefined && r.userCount > 0 && (
                                <span className="ml-1 text-[11px] tabular-nums text-[#8a8a8a]">
                                  ({r.userCount} waiting)
                                </span>
                              )}
                            </span>
                          </p>
                          <p className="text-[11px] text-[#8a8a8a]">
                            Submitted{" "}
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

                      <div className="flex items-center gap-2 border-t border-[#e5dec9]/70 pt-3">
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleApprove(r.id, reqName)}
                          className="min-h-10 flex-1 gap-1.5 rounded-[10px] bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          <CheckIcon className="size-3.5" aria-hidden="true" />
                          {isBusy ? "Processing..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => openRejectDialog(r)}
                          className="min-h-10 gap-1.5 rounded-[10px] border border-destructive/30 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        >
                          <XIcon className="size-3.5" aria-hidden="true" />
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

      {/* Mobile Floating + FAB (Consistent with People & Events) */}
      {isAdmin && (
        <Link
          to="/configure/master/school/new"
          aria-label="Add Institution"
          title="Add Institution"
          className="fixed right-4 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-ink text-canvas shadow-[0_12px_28px_rgba(10,10,10,0.28)] transition-all hover:bg-ink/90 active:scale-95 sm:hidden"
        >
          <PlusIcon className="size-6" aria-hidden="true" />
        </Link>
      )}

      {/* Reject & Optional Reassign Dialog */}
      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !processingId) {
            setRejectTarget(null)
          }
        }}
      >
        <DialogContent className="rounded-[24px] border border-[#e5dec9] bg-[#fffaf0] p-5 text-left font-sans text-[#0a0a0a] shadow-lg sm:max-w-md sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-[#0a0a0a]">
              Reject School Request
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6a6a6a]">
              Rejecting{" "}
              <strong className="font-semibold text-[#0a0a0a]">
                {rejectTarget?.name}
              </strong>
              . Choose whether to leave waiting users unassigned or move them to
              an active institution.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-2.5">
            <button
              type="button"
              onClick={() => setRejectMode("clear")}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-[14px] border p-3 text-left transition-colors ${
                rejectMode === "clear"
                  ? "border-[#0a0a0a] bg-[#faf5e8]"
                  : "border-[#e5dec9] bg-[#fffaf0] hover:bg-[#faf5e8]/70"
              }`}
            >
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  rejectMode === "clear"
                    ? "border-[#0a0a0a] bg-[#0a0a0a]"
                    : "border-[#c7bfa8]"
                }`}
              >
                {rejectMode === "clear" && (
                  <span className="size-1.5 rounded-full bg-white" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0a0a0a]">
                  Reject & Leave Unassigned
                </p>
                <p className="mt-0.5 text-[11px] text-[#6a6a6a]">
                  Clear this pending institution from waiting user profiles.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRejectMode("assign")}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-[14px] border p-3 text-left transition-colors ${
                rejectMode === "assign"
                  ? "border-[#0a0a0a] bg-[#faf5e8]"
                  : "border-[#e5dec9] bg-[#fffaf0] hover:bg-[#faf5e8]/70"
              }`}
            >
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  rejectMode === "assign"
                    ? "border-[#0a0a0a] bg-[#0a0a0a]"
                    : "border-[#c7bfa8]"
                }`}
              >
                {rejectMode === "assign" && (
                  <span className="size-1.5 rounded-full bg-white" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0a0a0a]">
                  Reject & Assign to Active School
                </p>
                <p className="mt-0.5 text-[11px] text-[#6a6a6a]">
                  Move waiting users into an existing verified school.
                </p>
              </div>
            </button>

            {rejectMode === "assign" && (
              <div className="space-y-2 rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-3">
                <Input
                  value={assignSchoolSearch}
                  onChange={(e) => setAssignSchoolSearch(e.target.value)}
                  placeholder="Search active school..."
                  className="h-9 border border-[#e5dec9] bg-[#fffaf0] text-xs"
                  startIcon={
                    <SearchIcon
                      className="size-3.5 text-[#6a6a6a]"
                      aria-hidden="true"
                    />
                  }
                />

                <div className="max-h-44 space-y-1 overflow-y-auto pr-0.5">
                  {loadingAssignSchools ? (
                    <p className="py-3 text-center text-xs text-[#6a6a6a]">
                      Loading active schools...
                    </p>
                  ) : assignSchoolOptions.length === 0 ? (
                    <p className="py-3 text-center text-xs text-[#6a6a6a]">
                      No matching active schools found
                    </p>
                  ) : (
                    assignSchoolOptions.map((opt) => {
                      const isPicked = selectedAssignSchool?.id === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedAssignSchool(opt)}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] px-2.5 py-2 text-left text-xs transition-colors ${
                            isPicked
                              ? "bg-[#0a0a0a] font-semibold text-white"
                              : "bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#efe8d6]"
                          }`}
                        >
                          <span className="truncate">{opt.name}</span>
                          <span
                            className={`shrink-0 text-[10px] ${
                              isPicked ? "text-white/80" : "text-[#6a6a6a]"
                            }`}
                          >
                            {opt.type || "Umum"}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(processingId)}
              onClick={() => setRejectTarget(null)}
              className="min-h-10 rounded-[10px] border-[#e5dec9] text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                Boolean(processingId) ||
                (rejectMode === "assign" && !selectedAssignSchool)
              }
              onClick={() => void handleConfirmReject()}
              className="min-h-10 rounded-[10px] bg-destructive text-xs font-semibold text-white hover:bg-destructive/90"
            >
              {processingId
                ? "Processing..."
                : rejectMode === "assign"
                  ? "Reject & Assign"
                  : "Confirm Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
