import * as React from "react"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sekkhaBadgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors select-none",
  {
    variants: {
      variant: {
        // DESIGN.md badge-pill: #f5f0e0 cream fill, ink text, hairline border
        default: "border border-[#e5e5e5] bg-[#f5f0e0] text-[#0a0a0a]",
        primary: "border-transparent bg-[#0a0a0a] text-white",
        secondary: "border border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a]",
        // 6-color saturated palette
        pink: "border-transparent bg-[#ff4d8b] text-white",
        teal: "border-transparent bg-[#1a3a3a] text-white",
        lavender: "border border-[#b8a4ed]/40 bg-[#b8a4ed] text-[#0a0a0a]",
        peach: "border border-[#ffb084]/40 bg-[#ffb084] text-[#0a0a0a]",
        ochre: "border border-[#e8b94a]/40 bg-[#e8b94a] text-[#0a0a0a]",
        mint: "border border-[#a4d4c5]/40 bg-[#a4d4c5] text-[#0a0a0a]",
        // Semantic & compatibility variants
        slate: "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]",
        blue: "border-transparent bg-[#1a3a3a] text-white",
        yellow: "border border-[#e8b94a]/40 bg-[#e8b94a] text-[#0a0a0a]",
        coral: "border-transparent bg-[#ff6b5a] text-white",
        emerald: "border-transparent bg-[#22c55e] text-white",
        purple: "border border-[#b8a4ed]/40 bg-[#b8a4ed] text-[#0a0a0a]",
        outline: "border border-[#e5e5e5] bg-transparent text-[#0a0a0a]",
        destructive: "border-transparent bg-[#ef4444] text-white",
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
  extends
    React.HTMLAttributes<HTMLSpanElement>,
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
      {icon && (
        <span className="inline-flex shrink-0 [&>svg]:size-3.5">{icon}</span>
      )}
      {children}
    </span>
  )
}
