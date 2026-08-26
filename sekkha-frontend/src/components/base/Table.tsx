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

export function TableContainer({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas shadow-2xs",
        className
      )}
      {...props}
    >
      <div className="overflow-x-auto scrollbar-none">{children}</div>
    </div>
  )
}

export function Table({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnTable>) {
  return (
    <ShadcnTable
      className={cn("w-full min-w-[500px] text-left text-body-sm", className)}
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
      className={cn("bg-sekkha-surface border-b border-sekkha-hairline-soft", className)}
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
        "border-b border-sekkha-hairline-soft last:border-0 hover:bg-slate-50/70 transition-colors",
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
      className={cn("px-4 py-3 font-semibold text-sekkha-slate text-caption", className)}
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
      className={cn("px-4 py-3.5 text-sekkha-ink align-middle", className)}
      {...props}
    />
  )
}

export {
  ShadcnTableBody as TableBody,
  ShadcnTableFooter as TableFooter,
  ShadcnTableCaption as TableCaption,
}
