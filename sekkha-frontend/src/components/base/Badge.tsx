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
        // Apple HIG Materials
        "material-ultra-thin":
          "border border-white/40 bg-white/60 text-[#0a0a0a] backdrop-blur-md",
        "material-thin":
          "border border-white/50 bg-white/70 text-[#0a0a0a] backdrop-blur-[20px]",
        "material-regular":
          "border border-white/60 bg-white/80 text-[#0a0a0a] backdrop-blur-[30px]",
        "material-thick":
          "border border-white/70 bg-white/90 text-[#0a0a0a] backdrop-blur-[40px]",
        "material-chrome":
          "border-none bg-white/95 text-[#0a0a0a] backdrop-blur-[50px]",
        glass:
          "border border-white/80 bg-white/70 text-[#0a0a0a] shadow-2xs ring-1 ring-black/[0.03] backdrop-blur-md",
      },
      size: {
        // DESIGN.md standard badge-pill: padding 4px 12px, font 13px / 500
        sm: "px-2.5 py-0.5 text-xs",
        default: "px-3 py-1 text-[13px]",
        lg: "px-4 py-1.5 text-sm font-semibold",
        // M3 Notification Badge Sizes
        counter:
          "h-[18px] min-w-[18px] rounded-full px-1 text-[10px] leading-none font-bold",
        dot: "size-2.5 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Apple HIG Translucent Glassmorphic overrides per color variant
 * Using Apple HIG Materials System (iOS 15+)
 */
const badgeGlassVariants: Record<string, string> = {
  default:
    "border-black/[0.08] bg-white/70 text-[#0a0a0a] backdrop-blur-md shadow-2xs ring-1 ring-black/[0.02]",
  primary: "border-black/20 bg-black/80 text-white backdrop-blur-md shadow-2xs",
  secondary:
    "border-black/[0.06] bg-[#faf5e8]/80 text-[#0a0a0a] backdrop-blur-md shadow-2xs",
  pink: "border-[#ff4d8b]/30 bg-[#ff4d8b]/15 text-[#d62865] backdrop-blur-md ring-1 ring-[#ff4d8b]/10",
  teal: "border-[#1a3a3a]/25 bg-[#1a3a3a]/12 text-[#1a3a3a] backdrop-blur-md ring-1 ring-black/[0.03]",
  lavender:
    "border-[#7c5cdb]/30 bg-[#b8a4ed]/25 text-[#543b91] backdrop-blur-md ring-1 ring-[#7c5cdb]/10",
  peach:
    "border-[#ffb084]/40 bg-[#ffb084]/25 text-[#9e4618] backdrop-blur-md ring-1 ring-[#ffb084]/10",
  ochre:
    "border-[#e8b94a]/40 bg-[#e8b94a]/25 text-[#855f05] backdrop-blur-md ring-1 ring-[#e8b94a]/10",
  mint: "border-emerald-600/30 bg-[#a4d4c5]/25 text-[#0f674f] backdrop-blur-md ring-1 ring-emerald-600/10",
  slate:
    "border-black/[0.08] bg-black/[0.04] text-[#6a6a6a] backdrop-blur-md ring-1 ring-black/[0.02]",
  blue: "border-sky-500/30 bg-sky-500/15 text-sky-800 backdrop-blur-md ring-1 ring-sky-500/10",
  yellow:
    "border-[#e8b94a]/40 bg-[#e8b94a]/25 text-[#855f05] backdrop-blur-md ring-1 ring-[#e8b94a]/10",
  coral:
    "border-[#ff6b5a]/30 bg-[#ff6b5a]/15 text-[#c23b2b] backdrop-blur-md ring-1 ring-[#ff6b5a]/10",
  emerald:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 backdrop-blur-md ring-1 ring-emerald-500/10",
  purple:
    "border-[#7c5cdb]/30 bg-[#b8a4ed]/25 text-[#543b91] backdrop-blur-md ring-1 ring-[#7c5cdb]/10",
  outline: "border-black/[0.1] bg-white/40 text-[#0a0a0a] backdrop-blur-md",
  destructive:
    "border-red-500/30 bg-red-500/15 text-red-700 backdrop-blur-md ring-1 ring-red-500/10",
  // Apple HIG Materials
  "material-ultra-thin":
    "border-white/40 bg-white/60 text-[#0a0a0a] backdrop-blur-md shadow-2xs ring-1 ring-black/[0.02]",
  "material-thin":
    "border-white/50 bg-white/70 text-[#0a0a0a] backdrop-blur-[20px] shadow-2xs ring-1 ring-black/[0.02]",
  "material-regular":
    "border-white/60 bg-white/80 text-[#0a0a0a] backdrop-blur-[30px] shadow-2xs ring-1 ring-black/[0.03]",
  "material-thick":
    "border-white/70 bg-white/90 text-[#0a0a0a] backdrop-blur-[40px] shadow-2xs ring-1 ring-black/[0.03]",
  "material-chrome":
    "border-none bg-white/95 text-[#0a0a0a] backdrop-blur-[50px]",
  glass:
    "border-white/80 bg-white/70 text-[#0a0a0a] backdrop-blur-md shadow-2xs ring-1 ring-black/[0.03]",
}

export interface SekkhaBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof sekkhaBadgeVariants> {
  icon?: React.ReactNode
  glass?: boolean
}

/**
 * Sekkha base Badge — aligned with DESIGN.md and Apple HIG Glassmorphic vibrancy.
 */
export function Badge({
  className,
  variant = "default",
  size,
  icon,
  glass,
  children,
  ...props
}: SekkhaBadgeProps) {
  const isGlass = glass || variant === "glass"
  const glassClass = isGlass
    ? badgeGlassVariants[variant ?? "default"] || badgeGlassVariants.default
    : undefined

  return (
    <span
      className={cn(
        sekkhaBadgeVariants({ variant, size }),
        glassClass,
        className
      )}
      {...props}
    >
      {icon && (
        <span className="inline-flex shrink-0 [&>svg]:size-3.5">{icon}</span>
      )}
      {children}
    </span>
  )
}
