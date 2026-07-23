// components/common/PageBreadcrumb
// Full-width breadcrumb bar that visually connects to the sidebar.
// Rendered OUTSIDE the max-w container for true edge-to-edge coverage.

import { Fragment } from "react"
import { Link } from "@tanstack/react-router"
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
}

interface PageBreadcrumbProps {
  items: BreadcrumbEntry[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PageBreadcrumb({ items }: PageBreadcrumbProps) {
  if (items.length === 0) return null

  const lastItem = items[items.length - 1]

  return (
    <div className="sticky top-0 z-40 border-b border-white/80 bg-sekkha-canvas/85 backdrop-blur-md px-4 py-2.5 md:py-3 md:px-8 lg:px-12 shadow-xs transition-all">
      {/* Desktop Breadcrumb Navigation */}
      <div className="hidden md:block">
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
                        <Link to={item.href ?? "#"}>{item.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Mobile Page Title Header (Center-Aligned Glassmorphism Header) */}
      <div className="block md:hidden text-center">
        <h1 className="text-body-sm-medium font-bold text-sekkha-ink tracking-tight">
          {lastItem.label}
        </h1>
      </div>
    </div>
  )
}
