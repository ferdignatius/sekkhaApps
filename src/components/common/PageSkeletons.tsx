// components/common/PageSkeletons
// Skeleton loading states for each page type.
// Used as pendingComponent in route definitions for lazy loading.

import { Skeleton } from "@/components/ui/skeleton"

// ─── Home Page Skeleton ──────────────────────────────────────────────────────

export function HomeSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 lg:px-12" aria-busy="true" aria-label="Memuat halaman...">
      <div className="mx-auto max-w-8xl space-y-5">
        {/* Profile header */}
        <Skeleton className="h-44 w-full rounded-xl" />
        {/* Two column */}
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
          <div className="w-full space-y-4 lg:w-80">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Events Page Skeleton ────────────────────────────────────────────────────

export function EventsSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 lg:px-12" aria-busy="true" aria-label="Memuat events...">
      <div className="mx-auto max-w-8xl space-y-4">
        {/* Title + filters */}
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        {/* Two column */}
        <div className="flex flex-col-reverse gap-4 lg:flex-row">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <div className="w-full lg:w-1/3">
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Leaderboard Page Skeleton ───────────────────────────────────────────────

export function LeaderboardSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 lg:px-12" aria-busy="true" aria-label="Memuat leaderboard...">
      <div className="mx-auto max-w-8xl space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <div className="md:flex md:gap-6">
          <div className="flex-1">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
          <div className="hidden w-80 md:block">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Profile Page Skeleton ───────────────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 lg:px-12" aria-busy="true" aria-label="Memuat profil...">
      <div className="mx-auto max-w-8xl space-y-4">
        <Skeleton className="h-8 w-24" />
        {/* Profile card */}
        <Skeleton className="h-28 w-full rounded-xl" />
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        {/* Attendance */}
        <Skeleton className="h-44 w-full rounded-xl" />
        {/* Badges */}
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    </div>
  )
}

// ─── Community Page Skeleton ─────────────────────────────────────────────────

export function CommunitySkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 lg:px-12" aria-busy="true" aria-label="Memuat komunitas...">
      <div className="mx-auto max-w-8xl space-y-4">
        {/* Tabs */}
        <Skeleton className="h-10 w-full max-w-xs rounded-full" />
        {/* Posts */}
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Configure Page Skeleton ─────────────────────────────────────────────────

export function ConfigureSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 lg:px-12" aria-busy="true" aria-label="Memuat konfigurasi...">
      <div className="mx-auto max-w-8xl space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}

// ─── Generic Page Skeleton ───────────────────────────────────────────────────

export function GenericSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8 lg:px-12" aria-busy="true" aria-label="Memuat...">
      <div className="mx-auto max-w-8xl space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    </div>
  )
}
