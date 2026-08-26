import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sekkhaBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro font-semibold transition-colors shrink-0",
  {
    variants: {
      variant: {
        default: "bg-sekkha-primary text-white border-transparent",
        slate: "bg-slate-100/90 text-sekkha-slate border border-slate-200/80",
        blue: "bg-blue-50/90 text-sekkha-brand-blue border border-blue-200/80",
        yellow: "bg-yellow-50/90 text-yellow-800 border border-yellow-200/80",
        coral: "bg-red-50/90 text-red-700 border border-red-200/80",
        teal: "bg-teal-50/90 text-teal-800 border border-teal-200/80",
        emerald: "bg-emerald-50/90 text-emerald-800 border border-emerald-200/80",
        purple: "bg-purple-50/90 text-purple-800 border border-purple-200/80",
        outline: "border border-sekkha-hairline-strong text-sekkha-ink bg-transparent",
      },
      size: {
        sm: "px-2 py-0.5 text-micro",
        default: "px-2.5 py-1 text-micro",
        lg: "px-3.5 py-1.5 text-caption font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface SekkhaBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof sekkhaBadgeVariants> {
  icon?: React.ReactNode
}

export function Badge({
  className,
  variant,
  size,
  icon,
  children,
  ...props
}: SekkhaBadgeProps) {
  return (
    <span
      className={cn(sekkhaBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
