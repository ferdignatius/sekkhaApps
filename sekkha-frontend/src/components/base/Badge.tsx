import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sekkhaBadgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors shrink-0 select-none",
  {
    variants: {
      variant: {
        // DESIGN.md badge-pill: #f5f0e0 cream fill, ink text, hairline border
        default: "bg-[#f5f0e0] text-[#0a0a0a] border border-[#e5e5e5]",
        primary: "bg-[#0a0a0a] text-white border-transparent",
        secondary: "bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5]",
        // 6-color saturated palette
        pink: "bg-[#ff4d8b] text-white border-transparent",
        teal: "bg-[#1a3a3a] text-white border-transparent",
        lavender: "bg-[#b8a4ed] text-[#0a0a0a] border border-[#b8a4ed]/40",
        peach: "bg-[#ffb084] text-[#0a0a0a] border border-[#ffb084]/40",
        ochre: "bg-[#e8b94a] text-[#0a0a0a] border border-[#e8b94a]/40",
        mint: "bg-[#a4d4c5] text-[#0a0a0a] border border-[#a4d4c5]/40",
        // Semantic & compatibility variants
        slate: "bg-[#faf5e8] text-[#6a6a6a] border border-[#e5e5e5]",
        blue: "bg-[#1a3a3a] text-white border-transparent",
        yellow: "bg-[#e8b94a] text-[#0a0a0a] border border-[#e8b94a]/40",
        coral: "bg-[#ff6b5a] text-white border-transparent",
        emerald: "bg-[#22c55e] text-white border-transparent",
        purple: "bg-[#b8a4ed] text-[#0a0a0a] border border-[#b8a4ed]/40",
        outline: "border border-[#e5e5e5] text-[#0a0a0a] bg-transparent",
        destructive: "bg-[#ef4444] text-white border-transparent",
      },
      size: {
        // DESIGN.md standard badge-pill: padding 4px 12px, font 13px / 500
        sm: "px-2.5 py-0.5 text-xs",
        default: "px-3 py-1 text-[13px]",
        lg: "px-4 py-1.5 text-sm font-semibold",
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

/**
 * Sekkha base Badge — aligned strictly with DESIGN.md badge-pill specifications.
 */
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
      {icon && <span className="inline-flex shrink-0 [&>svg]:size-3.5">{icon}</span>}
      {children}
    </span>
  )
}
