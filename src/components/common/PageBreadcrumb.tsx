// components/common/PageBreadcrumb
// Reusable breadcrumb nav for authenticated pages.
// Usage: <PageBreadcrumb items={[{ label: "Beranda", href: "/dashboard" }, { label: "Profil" }]} />
// The last item is rendered as the current page (no link).

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
    <Breadcrumb className="mb-4">
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
  )
}
