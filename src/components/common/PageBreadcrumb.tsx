// components/common/PageBreadcrumb
// Full-width breadcrumb bar that visually connects to the sidebar.
// Rendered OUTSIDE the max-w container for true edge-to-edge coverage.

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

  return (
    <div className="border-b border-sekkha-hairline-soft bg-sekkha-canvas px-4 py-3 md:px-8 lg:px-12">
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1

            return (
              <BreadcrumbItem key={item.label + idx}>
                {idx > 0 && <BreadcrumbSeparator />}
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.href ?? "#"}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
