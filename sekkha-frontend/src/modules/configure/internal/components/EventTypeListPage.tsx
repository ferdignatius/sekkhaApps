// feature/configure/components/EventTypeListPage
// Event Types Master Data list page — aligned with SchoolPage layout & design tokens.

import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  AlertCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/base/Badge"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Input } from "@/components/base/Input"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useIsDesktop } from "@/hooks/useIsDesktop"
import { useAuth } from "@/modules/auth"

import { eventTypesApi } from "../api/configureApi"
import type { EventTypeDto } from "../api/configureApi"

type StatusFilter = "all" | "active" | "inactive"

function formatLatePolicy(type: EventTypeDto): string {
  if (!type.apply_late_penalty) return "No late penalty"
  const pts = type.default_late_penalty_points ?? 0
  return pts > 0 ? `Late -${pts} pts` : "Late penalty"
}

export function EventTypePage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"
  const isDesktop = useIsDesktop(640)

  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const fetchEventTypes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await eventTypesApi.list()
      setEventTypes(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load event types"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchEventTypes()
  }, [])

  const filteredTypes = useMemo(() => {
    const q = search.toLowerCase().trim()
    return eventTypes.filter((t) => {
      const matchQuery =
        !q ||
        t.label.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && t.is_active) ||
        (statusFilter === "inactive" && !t.is_active)

      return matchQuery && matchStatus
    })
  }, [eventTypes, search, statusFilter])

  const stats = useMemo(() => {
    const total = eventTypes.length
    const active = eventTypes.filter((t) => t.is_active).length
    const mandatory = eventTypes.filter(
      (t) => t.counts_toward_streak !== false
    ).length
    const avgPoints =
      total > 0
        ? Math.round(
          eventTypes.reduce((sum, t) => sum + t.default_point_reward, 0) /
          total
        )
        : 0
    return { total, active, mandatory, avgPoints }
  }, [eventTypes])

  const hasFilters = search.trim().length > 0 || statusFilter !== "all"

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-28 text-left font-sans md:pb-16">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Event Types" },
        ]}
        backTo="/home"
      />

      <div className="mx-auto max-w-7xl space-y-4 px-3.5 py-2 sm:space-y-5 sm:px-6 sm:py-4 md:px-8">
        {/* Desktop Header (hidden on mobile where PageBreadcrumb already shows title) */}
        <div className="hidden items-center justify-between gap-4 border-b border-[#e5dec9] pb-4 sm:flex">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[#e5dec9] bg-[#faf5e8] text-[#0a0a0a]">
              <TagIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-[#0a0a0a]">
                Event Types Master Data
              </h1>
              <p className="truncate text-xs text-[#6a6a6a]">
                Manage event categories, default karma rewards, and attendance
                rules
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              asChild
              className="h-10 shrink-0 gap-2 rounded-full bg-[#0a0a0a] px-4 text-xs font-semibold text-white shadow-2xs hover:bg-[#262626]"
            >
              <Link to="/configure/master/event-type/new">
                <PlusIcon className="size-4" aria-hidden="true" />
                Add Event Type
              </Link>
            </Button>
          )}
        </div>

        {/* Load Error Alert */}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void fetchEventTypes()}
              className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1 font-semibold hover:bg-black/5"
            >
              Retry
            </button>
          </div>
        )}

        {/* 2x2 Stats Grid on Mobile, 4-Col Stats Strip on Desktop */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <Card className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-3.5 shadow-none sm:p-4">
            <p className="text-xs font-medium text-[#6a6a6a]">Total Types</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[#0a0a0a] sm:text-2xl">
              {stats.total}
            </p>
          </Card>
          <Card className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-3.5 shadow-none sm:p-4">
            <p className="text-xs font-medium text-[#6a6a6a]">Active</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[#0a0a0a] sm:text-2xl">
              {stats.active}
            </p>
          </Card>
          <Card className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-3.5 shadow-none sm:p-4">
            <p className="text-xs font-medium text-[#6a6a6a]">
              Mandatory Streak
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[#0a0a0a] sm:text-2xl">
              {stats.mandatory}
            </p>
          </Card>
          <Card className="rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-3.5 shadow-none sm:p-4">
            <p className="text-xs font-medium text-[#6a6a6a]">Avg Reward</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-[#0a0a0a] sm:text-2xl">
              {stats.avgPoints} pts
            </p>
          </Card>
        </div>

        {/* Search & Rounded-Full Filter Chips */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Input
              className="rounded-full border border-[#e5dec9] bg-[#fffaf0] pr-9"
              placeholder="Search event types..."
              aria-label="Search event types"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            {(
              [
                { key: "all", label: `All · ${stats.total}` },
                { key: "active", label: "Active" },
                { key: "inactive", label: "Inactive" },
              ] as const
            ).map((chip) => {
              const selected = statusFilter === chip.key
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setStatusFilter(chip.key)}
                  className={`inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors active:scale-95 ${selected
                    ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-2xs"
                    : "border-[#e5dec9] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
                    }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Event Types Cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-[16px] border border-[#e5dec9] bg-[#faf5e8] p-4 sm:h-24"
              />
            ))}
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="rounded-[18px] border border-[#e5dec9] bg-[#faf5e8] py-14 text-center">
            <TagIcon
              className="mx-auto size-9 text-[#6a6a6a]/45"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-[#0a0a0a]">
              {hasFilters
                ? "No event types found"
                : "No event types configured yet"}
            </p>
            <p className="mt-1 text-xs text-[#6a6a6a]">
              {hasFilters
                ? "Try adjusting your search query or status filter"
                : "Create an event type to start organizing community events"}
            </p>
            {hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setStatusFilter("all")
                }}
                className="mt-4 rounded-full border-[#e5dec9] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a]"
              >
                Reset Filters
              </Button>
            ) : (
              isAdmin && (
                <Button
                  size="sm"
                  onClick={() =>
                    void navigate({ to: "/configure/master/event-type/new" })
                  }
                  className="mt-4 rounded-full bg-[#0a0a0a] px-4 text-xs font-semibold text-white hover:bg-[#262626]"
                >
                  <PlusIcon className="mr-1.5 size-3.5" aria-hidden="true" />
                  Add Event Type
                </Button>
              )
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {filteredTypes.map((type) => {
              const isMandatory = type.counts_toward_streak !== false
              return (
                <Link
                  key={type.id}
                  to="/configure/master/event-type/$categoryId"
                  params={{ categoryId: type.id }}
                  className="group flex items-center justify-between gap-3 rounded-[16px] border border-[#e5dec9] bg-[#fffaf0] p-4 shadow-2xs transition-colors hover:border-[#d4cbb3] hover:bg-[#faf5e8] active:bg-[#faf5e8]"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: type.color || "#4262FF" }}
                          aria-hidden="true"
                        />
                        <p className="truncate text-sm font-semibold text-[#0a0a0a]">
                          {type.label}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        size="sm"
                        className="shrink-0 border border-[#e5dec9] bg-[#faf5e8] font-semibold tabular-nums text-[#0a0a0a]"
                      >
                        {type.default_point_reward} Pts
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 truncate text-xs text-[#6a6a6a] tabular-nums">
                        <span>{formatLatePolicy(type)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{isMandatory ? "Streak" : "Optional"}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`size-1.5 rounded-full ${type.is_active
                              ? "bg-emerald-600"
                              : "bg-neutral-400"
                              }`}
                            aria-hidden="true"
                          />
                          {type.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <ChevronRightIcon
                        className="size-4 shrink-0 text-[#6a6a6a] transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button */}
      {!isDesktop && isAdmin && (
        <button
          type="button"
          onClick={() =>
            void navigate({ to: "/configure/master/event-type/new" })
          }
          aria-label="Add Event Type"
          className="fixed right-4 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-30 flex size-13 items-center justify-center rounded-full bg-[#0a0a0a] text-white shadow-lg transition-transform active:scale-95 sm:hidden"
        >
          <PlusIcon className="size-6" aria-hidden="true" />
        </button>
      )}
    </main>
  )
}
