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

export function PageBreadcrumb({
  items,
  onBack,
  showBack,
  actions,
}: PageBreadcrumbProps) {
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
    <div className="sticky top-0 z-40 border-b border-black/[0.05] bg-[#fffaf0]/80 font-sans shadow-2xs backdrop-blur-xl backdrop-saturate-150 transition-all">
      <div className="px-4 py-1.5 sm:px-6 md:px-8 md:py-2 lg:px-12">
        <div className="mx-auto flex min-h-[48px] max-w-7xl items-center justify-between gap-3 sm:min-h-[52px]">
          {/* ── Left: Back Button ── */}
          {shouldShowBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/80 bg-[#faf5e8]/80 text-[#0a0a0a] shadow-2xs ring-1 ring-black/[0.04] backdrop-blur-xl transition-all hover:bg-[#faf5e8] active:scale-95"
              title="Back to previous page"
              aria-label="Back"
            >
              <ArrowLeftIcon className="size-4.5 text-[#0a0a0a]" />
            </button>
          ) : null}

          {/* ── Center: Desktop Breadcrumb & Mobile Page Title ── */}
          {/* Desktop Breadcrumb */}
          <div className="hidden min-w-0 flex-1 md:block">
            <Breadcrumb>
              <BreadcrumbList>
                {items.map((item, idx) => {
                  const isLast = idx === items.length - 1

                  return (
                    <Fragment key={item.label + idx}>
                      {idx > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="text-sm font-bold text-[#0a0a0a]">
                            {item.label}
                          </BreadcrumbPage>
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
                              className="cursor-pointer text-sm font-medium text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
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

          {/* Mobile Page Title */}
          <div className="block min-w-0 flex-1 text-left md:hidden">
            <h1 className="truncate text-base font-bold tracking-tight text-[#0a0a0a]">
              {lastItem.label}
            </h1>
          </div>

          {/* ── Right: Custom Actions ── */}
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
