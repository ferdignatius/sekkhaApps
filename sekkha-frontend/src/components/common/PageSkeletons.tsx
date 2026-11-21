// components/common/PageSkeletons
// Skeleton loading states aligned with the latest page layouts & Sekkha warm-glass tokens.
// Used as pendingComponent in route definitions and during deep-link async loading.

import { Skeleton } from "@/components/ui/skeleton"

// ─── Shared Helpers ──────────────────────────────────────────────────────────

function BreadcrumbBarSkeleton({
  showBack = false,
  withActions = 0,
}: {
  showBack?: boolean
  withActions?: number
}) {
  return (
    <div className="relative z-40 font-sans">
      <div className="px-4 py-1.5 sm:px-6 md:px-8 md:py-2 lg:px-12">
        <div className="mx-auto flex min-h-[48px] max-w-7xl items-center justify-between gap-3 sm:min-h-[52px]">
          <div className="flex min-w-0 items-center gap-3">
            {showBack && (
              <Skeleton className="size-10 shrink-0 rounded-full border border-[#e6decb]/80 bg-[#faf5e8]/90" />
            )}
            <Skeleton className="h-5 w-28 rounded-lg bg-[#ebe1c7]/70" />
          </div>
          {withActions > 0 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: withActions }).map((_, idx) => (
                <Skeleton
                  key={idx}
                  className="size-9 shrink-0 rounded-full border border-[#e6decb]/80 bg-[#faf5e8]/90 sm:size-10"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:rounded-[28px] sm:p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function WarmAmbientBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -top-32 right-1/4 size-96 rounded-full bg-[#e8b94a]/12 blur-3xl" />
      <div className="absolute top-1/3 -left-24 size-96 rounded-full bg-[#ffb084]/12 blur-3xl" />
      <div className="absolute right-12 -bottom-24 size-96 rounded-full bg-[#ff4d8b]/8 blur-3xl" />
    </div>
  )
}

// ─── Home Page Skeleton ──────────────────────────────────────────────────────

export function HomeSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#fffaf0] pb-28 antialiased md:pb-12"
      aria-busy="true"
      aria-label="Loading home..."
    >
      {/* Mobile full-bleed Sunrise Hero behind transparent PageBreadcrumb */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#f6e8c8] via-[#faf2dd] to-[#f4e7c6] md:overflow-visible md:bg-none">
        <BreadcrumbBarSkeleton withActions={1} />

        <div className="md:px-6 md:pt-2 lg:px-8 xl:px-12">
          <section className="relative mx-auto max-w-7xl px-4 pt-3 pb-16 sm:px-6 md:rounded-[32px] md:border md:border-[#e6decb] md:bg-gradient-to-b md:from-[#f6e8c8] md:via-[#faf2dd] md:to-[#f4e7c6] md:px-7 md:py-7 md:shadow-xs lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <Skeleton className="h-7 w-44 rounded-xl bg-[#ebe1c7]" />
                <Skeleton className="h-3.5 w-40 rounded bg-[#ebe1c7]" />
                <div className="flex items-center gap-2.5 pt-1">
                  <Skeleton className="size-10 rounded-[14px] bg-[#ebe1c7] sm:size-11" />
                  <Skeleton className="h-12 w-24 rounded-2xl bg-[#ebe1c7]" />
                </div>
                <Skeleton className="h-4 w-32 rounded bg-[#ebe1c7]" />
              </div>

              <div className="hidden min-w-[230px] space-y-2 rounded-[20px] border border-[#ded3b8] bg-[#fffaf0]/80 px-4 py-3 md:block">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3.5 w-20 bg-[#ebe1c7]" />
                  <Skeleton className="h-3.5 w-14 bg-[#ebe1c7]" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full bg-[#ebe1c7]" />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Main Content Curved Sheet */}
      <div className="relative z-10 -mt-6 rounded-t-[32px] border-t border-[#e5dec9]/80 bg-[#fffaf0] px-4 pt-5 sm:px-6 md:mt-0 md:rounded-none md:border-t-0 md:bg-transparent md:px-6 md:pt-6 lg:px-8 xl:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Quick Access */}
          <section className="space-y-2">
            <Skeleton className="ml-1 h-3 w-24 rounded" />
            <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 px-3 py-4 sm:rounded-[28px] sm:p-5">
              <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6 sm:gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <Skeleton className="size-12 rounded-[16px] sm:size-14 sm:rounded-[18px]" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Today's Highlights (3-col Bento) */}
          <section className="space-y-2">
            <Skeleton className="ml-1 h-3 w-32 rounded" />
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <GlassPanel
                  key={i}
                  className={`flex flex-col justify-between gap-4 ${
                    i === 3 ? "md:col-span-2 xl:col-span-1" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="size-9 rounded-[12px]" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-full rounded-full" />
                </GlassPanel>
              ))}
            </div>
          </section>

          {/* Latest Activity */}
          <section className="space-y-2">
            <Skeleton className="ml-1 h-3 w-28 rounded" />
            <GlassPanel className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </GlassPanel>
          </section>
        </div>
      </div>
    </main>
  )
}

// ─── Event Detail Skeleton (shared for ?eventId= route & page loading) ───────

export function EventDetailSkeletonBody() {
  return (
    <div
      data-testid="event-detail-loading-skeleton"
      aria-busy="true"
      aria-label="Loading event details..."
      className="px-3.5 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-12 md:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Hero Detail Card */}
        <GlassPanel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="size-9 rounded-full" />
          </div>
          <Skeleton className="h-7 w-3/4 max-w-md rounded-xl" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
          <div className="border-t border-[#e5e5e5]/80 pt-3.5">
            <Skeleton className="h-11 w-full rounded-full sm:w-48" />
          </div>
        </GlassPanel>

        {/* Segmented Control Tabs */}
        <Skeleton className="h-12 w-full rounded-full sm:w-64" />

        {/* Inset Grouped Metadata & Description */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <GlassPanel className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </GlassPanel>
          </div>
          <div className="space-y-4 lg:col-span-5">
            <GlassPanel className="space-y-3">
              <Skeleton className="h-4 w-32" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
              ))}
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EventDetailSkeleton() {
  return (
    <main className="relative min-h-screen bg-[#fffaf0] text-left font-sans antialiased">
      <WarmAmbientBackdrop />
      <BreadcrumbBarSkeleton showBack={true} />
      <EventDetailSkeletonBody />
    </main>
  )
}

// ─── Events Page Skeleton ────────────────────────────────────────────────────

export function EventsSkeleton() {
  const hasEventIdParam =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("eventId")

  if (hasEventIdParam) {
    return <EventDetailSkeleton />
  }

  return (
    <main
      className="relative flex min-h-dvh flex-col bg-[#fffaf0] pb-0 text-left font-sans antialiased lg:block lg:min-h-screen lg:pb-12"
      aria-busy="true"
      aria-label="Loading events..."
    >
      <WarmAmbientBackdrop />
      <BreadcrumbBarSkeleton withActions={2} />

      <div className="px-3.5 pt-2 pb-28 sm:px-6 sm:pt-4 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* Month Title + Today/Controls */}
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-9 w-48 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-9 w-16 rounded-full" />
              <Skeleton className="hidden size-9 rounded-full sm:block" />
              <Skeleton className="hidden size-9 rounded-full sm:block" />
            </div>
          </div>

          {/* Mobile Calendar Card */}
          <div className="rounded-[22px] border border-[#e5dec9] bg-[#faf5e8] p-3 lg:hidden">
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 28 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Desktop 2-col: Event Sheet Left + Mini Calendar Right */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="flex-1 space-y-3 rounded-[26px] border border-[#e6decb]/80 bg-[#faf5e8]/80 p-4 sm:rounded-[28px] sm:p-5">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-5 w-36 rounded-lg" />
                </div>
                <Skeleton className="h-9 w-9 rounded-full sm:w-28" />
              </div>

              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/75 p-3.5"
                >
                  <Skeleton className="size-11 shrink-0 rounded-[14px]" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-44 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </div>
                  <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                </div>
              ))}
            </div>

            <aside className="hidden w-full shrink-0 lg:block lg:w-84 xl:w-92">
              <div className="space-y-3 rounded-[28px] border border-[#e6decb]/80 bg-[#faf5e8]/80 p-5">
                <div className="flex items-center justify-between border-b border-black/[0.06] pb-2.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded-lg" />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Leaderboard Page Skeleton ───────────────────────────────────────────────

export function LeaderboardSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#fffaf0] antialiased"
      aria-busy="true"
      aria-label="Loading leaderboard..."
    >
      <BreadcrumbBarSkeleton showBack={true} />

      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* Unified Header + Period Selector */}
          <GlassPanel className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-[14px] sm:size-12" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <div className="flex gap-2">
              {[92, 84, 96].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-8 rounded-full"
                  style={{ width: w }}
                />
              ))}
            </div>
          </GlassPanel>

          {/* Metric Pill Tabs */}
          <div className="flex gap-2">
            {[110, 88, 96].map((w, i) => (
              <Skeleton
                key={i}
                className="h-11 rounded-full"
                style={{ width: w }}
              />
            ))}
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12 lg:gap-6">
            <div className="space-y-3 md:col-span-8">
              <div className="space-y-3 sm:rounded-xl sm:border sm:border-[#e6decb]/80 sm:bg-[#faf5e8]/60 sm:p-5">
                <div className="flex items-end justify-center gap-3 rounded-xl bg-[#faf5e8] p-5 sm:gap-5">
                  <Skeleton className="h-20 w-20 rounded-xl" />
                  <Skeleton className="h-28 w-24 rounded-xl bg-[#e8b94a]/25" />
                  <Skeleton className="h-16 w-20 rounded-xl" />
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex min-h-[60px] items-center gap-3 rounded-xl border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3"
                  >
                    <Skeleton className="size-6 shrink-0 rounded" />
                    <Skeleton className="size-10 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-2.5 w-1/4" />
                    </div>
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            </div>

            <aside className="hidden space-y-4 md:col-span-4 md:block">
              <GlassPanel className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-11 shrink-0 rounded-[12px]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full rounded-[14px]" />
              </GlassPanel>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Profile Page Skeleton ───────────────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#faf5e8] antialiased"
      aria-busy="true"
      aria-label="Loading profile..."
    >
      <BreadcrumbBarSkeleton showBack={false} />

      <div className="mx-auto max-w-7xl px-3.5 py-3 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5 xl:col-span-4">
            <div className="space-y-5 rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="size-16 shrink-0 rounded-[18px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-[#e5e5e5] pt-4">
                <Skeleton className="h-16 rounded-[14px]" />
                <Skeleton className="h-16 rounded-[14px]" />
              </div>
            </div>
            <div className="hidden h-28 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] lg:block" />
          </div>

          <div className="space-y-4 lg:col-span-7 xl:col-span-8">
            <Skeleton className="h-12 w-full rounded-[16px] bg-[#fffaf0]" />
            <Skeleton className="h-56 w-full rounded-[24px] bg-[#fffaf0]" />
            <Skeleton className="h-44 w-full rounded-[20px] bg-[#fffaf0]" />
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Configure Page Skeleton ─────────────────────────────────────────────────

export function ConfigureSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#fffaf0] antialiased"
      aria-busy="true"
      aria-label="Loading configuration..."
    >
      <BreadcrumbBarSkeleton showBack={true} />

      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-32 rounded-[10px]" />
          </div>
          {[1, 2].map((i) => (
            <GlassPanel key={i} className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-[8px]" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between rounded-[14px] border border-[#e6decb]/80 bg-[#fffaf0]/90 px-3.5 py-3"
                  >
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
                  </div>
                ))}
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </main>
  )
}

// ─── Generic Page Skeleton ───────────────────────────────────────────────────

export function GenericSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#fffaf0] antialiased"
      aria-busy="true"
      aria-label="Loading..."
    >
      <BreadcrumbBarSkeleton showBack={true} />

      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          <GlassPanel className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full rounded-[12px]" />
          </GlassPanel>
          <GlassPanel className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-24 w-full rounded-[12px]" />
          </GlassPanel>
        </div>
      </div>
    </main>
  )
}

// ─── People Page Skeleton ────────────────────────────────────────────────────

export function PeopleSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#fffaf0] antialiased"
      aria-busy="true"
      aria-label="Loading directory..."
    >
      <BreadcrumbBarSkeleton showBack={true} />

      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          {/* Role donut chart + chips */}
          <div className="rounded-[20px] border border-[#e6decb]/80 bg-[#faf5e8]/90 p-3.5 shadow-2xs sm:p-4">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-3">
                <Skeleton className="size-20 shrink-0 rounded-full sm:size-24" />
                <div className="space-y-1.5 sm:hidden">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:gap-2">
                {[96, 80, 88].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-14 rounded-[12px] sm:h-12 sm:w-24"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Search bar & Filter pills */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-11 flex-1 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-11 w-full rounded-md sm:w-64" />
              <Skeleton className="hidden h-11 w-32 rounded-md sm:block" />
            </div>
          </div>

          {/* Section label */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>

          {/* Member Card Grid (2-col mobile / 3-col tablet / 4-col desktop) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="space-y-3 rounded-[20px] border border-[#e6decb]/80 bg-[#faf5e8]/90 p-3.5 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-10 shrink-0 rounded-[12px]" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
