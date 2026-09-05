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
  actions?: React.ReactNode
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PageBreadcrumb({ items, onBack, showBack, actions }: PageBreadcrumbProps) {
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
    <div className="sticky top-0 z-40 border-b border-[#e5e5e5] bg-[#fffaf0]/95 backdrop-blur-md shadow-2xs transition-all font-sans">
      <div className="px-4 py-2.5 sm:px-6 md:py-3 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
          
          {/* ── Left: Back Button ── */}
          {shouldShowBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] hover:border-[#9a9a9a] transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Back to previous page"
              aria-label="Back"
            >
              <ArrowLeftIcon className="size-4 text-[#0a0a0a]" />
            </button>
          ) : (
            <div className="w-1 shrink-0 md:hidden" />
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
                          <BreadcrumbPage className="font-semibold text-[#0a0a0a]">{item.label}</BreadcrumbPage>
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
                              className="text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors cursor-pointer"
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

          {/* Mobile Centered Page Title */}
          <div className="block md:hidden flex-1 text-left min-w-0 px-1">
            <h1 className="text-sm font-bold text-[#0a0a0a] tracking-tight truncate">
              {lastItem.label}
            </h1>
          </div>

          {/* ── Right: Custom Actions or Notification Bell ── */}
          <div className="flex items-center gap-2 shrink-0">
            {actions ? (
              actions
            ) : (
              <Link
                to="/notifications"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] hover:border-[#9a9a9a] transition-all shadow-2xs relative active:scale-95"
                title="Notifications"
              >
                <NotificationBell />
              </Link>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
