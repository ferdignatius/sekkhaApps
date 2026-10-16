import * as React from "react"
import {
  Table as ShadcnTable,
  TableHeader as ShadcnTableHeader,
  TableBody as ShadcnTableBody,
  TableFooter as ShadcnTableFooter,
  TableHead as ShadcnTableHead,
  TableRow as ShadcnTableRow,
  TableCell as ShadcnTableCell,
  TableCaption as ShadcnTableCaption,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * Sekkha base Table components — aligned strictly with DESIGN.md specifications.
 */
export function TableContainer({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] font-sans shadow-2xs",
        className
      )}
      {...props}
    >
      <div className="scrollbar-none overflow-x-auto">{children}</div>
    </div>
  )
}

export function Table({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnTable>) {
  return (
    <ShadcnTable
      className={cn(
        "w-full min-w-[500px] text-left text-sm text-[#0a0a0a]",
        className
      )}
      {...props}
    />
  )
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnTableHeader>) {
  return (
    <ShadcnTableHeader
      className={cn("border-b border-[#e5e5e5] bg-[#faf5e8]", className)}
      {...props}
    />
  )
}

export function TableRow({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnTableRow>) {
  return (
    <ShadcnTableRow
      className={cn(
        "border-b border-[#f0f0f0] transition-colors last:border-0 hover:bg-[#f5f0e0]",
        className
      )}
      {...props}
    />
  )
}

export function TableHead({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnTableHead>) {
  return (
    <ShadcnTableHead
      className={cn(
        "px-4 py-3 text-xs font-semibold tracking-wider text-[#6a6a6a] uppercase",
        className
      )}
      {...props}
    />
  )
}

export function TableCell({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnTableCell>) {
  return (
    <ShadcnTableCell
      className={cn(
        "px-4 py-3.5 align-middle text-sm text-[#0a0a0a]",
        className
      )}
      {...props}
    />
  )
}

export {
  ShadcnTableBody as TableBody,
  ShadcnTableFooter as TableFooter,
  ShadcnTableCaption as TableCaption,
}
