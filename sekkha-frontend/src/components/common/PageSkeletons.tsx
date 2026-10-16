// components/common/PageSkeletons
// Skeleton loading states for each page type.
// Used as pendingComponent in route definitions for lazy loading.
// Design: Apple HIG glassmorphism with Sekkha warm-glass pattern.

import { Skeleton } from "@/components/ui/skeleton"

// ─── Shared: Frosted glass panel wrapper ─────────────────────────────────────

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-4 shadow-2xs backdrop-blur-md sm:rounded-[24px] sm:p-5 ${className}`}
    >
      {children}
    </div>
  )
}

function GlassPanelSoft({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[16px] border border-[#e6decb]/80 bg-[#faf5e8]/90 p-3.5 shadow-2xs backdrop-blur-sm sm:rounded-[20px] sm:p-4 ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Home Page Skeleton ──────────────────────────────────────────────────────

export function HomeSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#fffaf0] antialiased"
      aria-busy="true"
      aria-label="Memuat halaman..."
    >
      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          {/* Profile hero card */}
          <GlassPanel>
            <div className="flex items-center gap-3 sm:gap-4">
              <Skeleton className="size-14 shrink-0 rounded-[16px] sm:size-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="size-9 shrink-0 rounded-[10px]" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="space-y-1.5 rounded-[12px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-2.5 backdrop-blur-sm"
                >
                  <Skeleton className="mx-auto h-5 w-10" />
                  <Skeleton className="mx-auto h-2.5 w-14" />
                </div>
              ))}
            </div>
          </GlassPanel>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
            <div className="flex-1 space-y-4">
              <GlassPanel className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-[8px]" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded-[8px]" />
                  ))}
                </div>
              </GlassPanel>
              <GlassPanel className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-[8px]" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex gap-2.5">
                  {[1, 2, 3].map((i) => (
                    <Skeleton
                      key={i}
                      className="size-14 shrink-0 rounded-[14px]"
                    />
                  ))}
                </div>
              </GlassPanel>
            </div>
            <div className="w-full space-y-4 lg:w-72 xl:w-80">
              <GlassPanel className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-[8px]" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-16 w-full rounded-[12px]" />
              </GlassPanel>
              <GlassPanel className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-20 w-full rounded-[12px]" />
              </GlassPanel>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Events Page Skeleton ────────────────────────────────────────────────────

export function EventsSkeleton() {
  return (
    <main
      className="min-h-screen bg-[#fffaf0] antialiased"
      aria-busy="true"
      aria-label="Memuat events..."
    >
      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 shrink-0 rounded-[10px] sm:size-12 sm:rounded-[12px]" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24 sm:h-5 sm:w-32" />
              <Skeleton className="h-3 w-16 sm:h-3.5 sm:w-20" />
            </div>
          </div>
          {/* Filter chips */}
          <div className="flex gap-2">
            {[80, 64, 80, 72].map((w, i) => (
              <Skeleton
                key={i}
                className="h-9 rounded-full"
                style={{ width: w }}
              />
            ))}
          </div>
          {/* Two-column layout */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="space-y-3 lg:col-span-8">
              {[1, 2, 3].map((i) => (
                <GlassPanelSoft key={i} className="flex gap-3.5">
                  <Skeleton className="h-16 w-14 shrink-0 rounded-[12px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="size-7 shrink-0 self-start rounded-[8px]" />
                </GlassPanelSoft>
              ))}
            </div>
            <aside className="space-y-4 lg:col-span-4">
              <GlassPanel className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-[12px]" />
                  ))}
                </div>
              </GlassPanel>
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
      aria-label="Memuat leaderboard..."
    >
      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          {/* Dark glass header */}
          <div className="rounded-[20px] border border-[#0a0a0a]/10 bg-[#0a0a0a]/90 p-3 backdrop-blur-xl sm:rounded-[24px] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-[12px] bg-white/10 sm:size-12" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24 bg-white/10 sm:h-5 sm:w-32" />
                  <Skeleton className="h-3 w-20 bg-white/10" />
                </div>
              </div>
              <Skeleton className="h-7 w-20 rounded-full bg-white/10" />
            </div>
          </div>
          {/* Metric tabs */}
          <div className="flex gap-2">
            {[100, 80, 96].map((w, i) => (
              <Skeleton
                key={i}
                className="h-9 rounded-full"
                style={{ width: w }}
              />
            ))}
          </div>
          {/* Two-column layout */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
            <div className="space-y-3 lg:col-span-8">
              <div className="rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3 shadow-2xs backdrop-blur-md sm:rounded-[24px] sm:p-5">
                {/* Podium */}
                <div className="mb-4 rounded-[14px] border border-[#e6decb]/80 bg-[#faf5e8]/90 px-2 py-3 backdrop-blur-sm">
                  <div className="flex items-end justify-center gap-3 sm:gap-5">
                    <div className="flex flex-col items-center gap-2">
                      <Skeleton className="size-10 rounded-[10px]" />
                      <Skeleton className="h-14 w-16 rounded-t-[10px]" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Skeleton className="size-5 rounded-full" />
                      <Skeleton className="size-12 rounded-[12px]" />
                      <Skeleton className="h-20 w-16 rounded-t-[12px]" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Skeleton className="size-10 rounded-[10px]" />
                      <Skeleton className="h-10 w-16 rounded-t-[10px]" />
                    </div>
                  </div>
                </div>
                {/* List rows */}
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-[14px] border border-[#e6decb]/80 bg-[#fffaf0]/90 px-3.5 py-3 backdrop-blur-sm"
                    >
                      <Skeleton className="h-4 w-5 shrink-0 rounded" />
                      <Skeleton className="size-9 shrink-0 rounded-[10px]" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                      <div className="space-y-1 text-right">
                        <Skeleton className="h-3.5 w-12" />
                        <Skeleton className="h-2.5 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <aside className="hidden space-y-4 lg:col-span-4 lg:block">
              <div className="space-y-3 rounded-[20px] border border-[#e6decb]/80 bg-[#faf5e8]/90 p-4 shadow-2xs backdrop-blur-md sm:p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-11 shrink-0 rounded-[12px]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex gap-4 rounded-[12px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3 backdrop-blur-sm">
                  <div className="flex-1 space-y-1.5 text-center">
                    <Skeleton className="mx-auto h-5 w-10" />
                    <Skeleton className="mx-auto h-2.5 w-16" />
                  </div>
                  <div className="w-px bg-[#e6decb]/60" />
                  <div className="flex-1 space-y-1.5 text-center">
                    <Skeleton className="mx-auto h-5 w-12" />
                    <Skeleton className="mx-auto h-2.5 w-14" />
                  </div>
                </div>
              </div>
              <GlassPanel className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-8 rounded-[8px]" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                  <Skeleton className="h-6 w-10 rounded-[6px]" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-14 w-full rounded-[12px]" />
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
      className="min-h-screen bg-[#fffaf0] antialiased"
      aria-busy="true"
      aria-label="Memuat profil..."
    >
      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          <GlassPanel className="flex items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-[16px] sm:size-20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
          </GlassPanel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <GlassPanelSoft key={i} className="space-y-1.5 text-center">
                <Skeleton className="mx-auto h-6 w-12" />
                <Skeleton className="mx-auto h-3 w-16" />
              </GlassPanelSoft>
            ))}
          </div>
          <GlassPanel className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-[8px]" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-[8px]" />
              ))}
            </div>
          </GlassPanel>
          <GlassPanel className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-[8px]" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="size-14 rounded-[14px]" />
              ))}
            </div>
          </GlassPanel>
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
      aria-label="Memuat konfigurasi..."
    >
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
                    className="flex items-center justify-between rounded-[12px] border border-[#e6decb]/80 bg-[#faf5e8]/90 px-3.5 py-3 backdrop-blur-sm"
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
      aria-label="Memuat..."
    >
      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 shrink-0 rounded-[10px] sm:size-12" />
            <Skeleton className="h-5 w-32" />
          </div>
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
      aria-label="Memuat people..."
    >
      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          {/* Dark glass header */}
          <div className="rounded-[20px] border border-[#0a0a0a]/10 bg-[#0a0a0a]/90 p-3 backdrop-blur-xl sm:rounded-[24px] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-[12px] bg-white/10 sm:size-12" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 bg-white/10 sm:h-5 sm:w-40" />
                  <Skeleton className="h-3 w-24 bg-white/10" />
                </div>
              </div>
              <Skeleton className="h-8 w-24 rounded-[10px] bg-white/10" />
            </div>
          </div>

          {/* Role donut chart + chips */}
          <div className="rounded-[16px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3 shadow-2xs backdrop-blur-md sm:rounded-[20px] sm:p-4">
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

          {/* Search bar */}
          <Skeleton className="h-10 w-full rounded-[12px] sm:h-11" />

          {/* Section label */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>

          {/* Mobile card grid */}
          <div className="grid grid-cols-2 gap-2.5 md:hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-[16px] border border-[#e6decb]/80 bg-[#faf5e8]/90 p-3 shadow-2xs backdrop-blur-sm"
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[16px] border border-[#e6decb]/80 bg-[#fffaf0]/90 shadow-2xs backdrop-blur-md md:block">
            {/* Table header */}
            <div className="flex gap-4 border-b border-[#e6decb]/80 bg-[#faf5e8]/90 px-4 py-3">
              {[80, 160, 80, 140, 80].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-3.5 rounded"
                  style={{ width: w }}
                />
              ))}
            </div>
            {/* Table rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-[#e6decb]/50 px-4 py-3.5 last:border-0"
              >
                <Skeleton className="h-3.5 w-16 rounded" />
                <div className="flex flex-1 items-center gap-2.5">
                  <Skeleton className="size-8 shrink-0 rounded-[8px]" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="ml-auto h-7 w-24 rounded-[8px]" />
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="rounded-[16px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3 shadow-2xs backdrop-blur-sm sm:p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-32 rounded-[8px]" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="size-8 rounded-[8px]" />
                <Skeleton className="size-8 rounded-[8px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
