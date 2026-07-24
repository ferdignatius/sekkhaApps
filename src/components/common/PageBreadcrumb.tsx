// components/common/PageBreadcrumb
// Full-width breadcrumb bar with Back button on the left and Notification menu on the right.

import { Fragment } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { NotificationBell } from "@/modules/notifications"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BreadcrumbEntry {
  label: string
  href?: string
  onClick?: () => void
}

interface PageBreadcrumbProps {
  items: BreadcrumbEntry[]
  onBack?: () => void
  showBack?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PageBreadcrumb({ items, onBack, showBack }: PageBreadcrumbProps) {
  if (items.length === 0) return null

  const lastItem = items[items.length - 1]
  const shouldShowBack = showBack ?? items.length > 1

  function handleBack() {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }

  return (
    <div className="sticky top-0 z-40 border-b border-sekkha-hairline/80 bg-sekkha-canvas/90 backdrop-blur-md shadow-xs transition-all">
      <div className="px-3.5 py-3 sm:px-6 md:py-3.5 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
          
          {/* ── Left: Back Button (Only rendered on nested sub-pages) ── */}
          {shouldShowBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sekkha-hairline bg-white/95 text-sekkha-ink hover:bg-sekkha-surface hover:border-sekkha-hairline-strong transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Kembali ke halaman sebelumnya"
              aria-label="Kembali"
            >
              <ArrowLeftIcon className="size-5 text-sekkha-ink" />
            </button>
          ) : (
            <div className="w-2 shrink-0 md:hidden" />
          )}

          {/* ── Center: Desktop Breadcrumb & Mobile Page Title ── */}
          {/* Desktop Breadcrumb */}
          <div className="hidden md:block flex-1 min-w-0 ml-1">
            <Breadcrumb>
              <BreadcrumbList>
                {items.map((item, idx) => {
                  const isLast = idx === items.length - 1

                  return (
                    <Fragment key={item.label + idx}>
                      {idx > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link
                              to={item.href ?? "#"}
                              onClick={(e) => {
                                if (item.onClick) {
                                  e.preventDefault()
                                  item.onClick()
                                }
                              }}
                              className="hover:text-sekkha-brand-blue transition-colors cursor-pointer"
                            >
                              {item.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Mobile Centered Page Title (Proportional & Bold) */}
          <div className="block md:hidden flex-1 text-center min-w-0 px-2">
            <h1 className="text-body-base font-black text-sekkha-ink tracking-tight truncate">
              {lastItem.label}
            </h1>
          </div>

          {/* ── Right: Notification Menu (HIG Standard 40x40 Touch Target) ── */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/notifications"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sekkha-hairline bg-white/95 text-sekkha-ink hover:bg-sekkha-surface hover:border-sekkha-hairline-strong transition-all shadow-2xs relative active:scale-95"
              title="Notifikasi"
            >
              <NotificationBell />
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
