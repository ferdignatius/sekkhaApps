import * as React from "react"
import {
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type CardVariant =
  | "elevated"
  | "filled"
  | "outlined"
  | "default"
  | "canvas"
  | "cream"
  | "soft"
  | "glass"
  | "material-ultra-thin"
  | "material-thin"
  | "material-regular"
  | "material-thick"
  | "material-chrome"
  | "pink"
  | "teal"
  | "lavender"
  | "peach"
  | "ochre"
  | "mint"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  glass?: boolean
  hoverEffect?: boolean
}

const cardVariantClasses: Record<CardVariant, string> = {
  // ─── Material Design 3 Canonical Variants (Clay Material) ───
  // 1. M3 Elevated Card: Surface with subtle elevation shadow
  elevated:
    "rounded-[16px] border border-[#e5e5e5]/70 bg-[#fffaf0] text-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow",
  // 2. M3 Filled Card: Tonal container surface, no border, no shadow
  filled:
    "rounded-[16px] border border-transparent bg-[#faf5e8] text-[#0a0a0a]",
  // 3. M3 Outlined Card: Hairline border on canvas surface
  outlined:
    "rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a]",

  // ─── Clay Design System Variants (DESIGN.md) ───
  // product-mockup-card & default card: #fffaf0 bg, 16px radius, hairline border
  default:
    "rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs",
  canvas:
    "rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs",
  // testimonial-card & cream feature-card: #f5f0e0 bg, 16px radius
  cream:
    "rounded-[16px] border border-[#e5e5e5] bg-[#f5f0e0] text-[#0a0a0a] shadow-xs",
  // hero-illustration-card / cta-band: #faf5e8 bg, 24px radius
  soft: "rounded-[24px] bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5]/60 shadow-xs",
  // ─── Apple HIG Materials System (iOS 15+) ───
  // Ultra Thin Material - for overlays, sheets, popovers
  "material-ultra-thin":
    "rounded-[24px] border border-white/40 bg-white/60 text-[#0a0a0a] backdrop-blur-md [&]:shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
  // Thin Material - for navigation bars, toolbars
  "material-thin":
    "rounded-[24px] border border-white/50 bg-white/70 text-[#0a0a0a] backdrop-blur-[20px] [&]:shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
  // Regular Material - for cards, sheets, modals (RECOMMENDED for most cards)
  "material-regular":
    "rounded-[24px] border border-white/60 bg-white/80 text-[#0a0a0a] backdrop-blur-[30px] [&]:shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_8px_-2px_rgba(0,0,0,0.03)]",
  // Thick Material - for prominent surfaces, sidebars
  "material-thick":
    "rounded-[24px] border border-white/70 bg-white/90 text-[#0a0a0a] backdrop-blur-[40px] [&]:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_16px_-4px_rgba(0,0,0,0.04)]",
  // Chrome Material - for navigation bars, tab bars (opaque)
  "material-chrome":
    "rounded-none border-none bg-white/95 text-[#0a0a0a] backdrop-blur-[50px] [&]:shadow-[0_1px_0_rgba(0,0,0,0.06)]",
  // Legacy glass variant - use material-regular instead
  glass:
    "rounded-[22px] border border-white/70 bg-white/75 text-[#0a0a0a] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]",
  // feature-card-pink: #ff4d8b bg, white text, 24px radius
  pink: "rounded-[24px] bg-[#ff4d8b] text-white border-transparent shadow-xs",
  // feature-card-teal: #1a3a3a bg, white text, 24px radius
  teal: "rounded-[24px] bg-[#1a3a3a] text-white border-transparent shadow-xs",
  // feature-card-lavender: #b8a4ed bg, dark text, 24px radius
  lavender:
    "rounded-[24px] bg-[#b8a4ed] text-[#0a0a0a] border-transparent shadow-xs",
  // feature-card-peach: #ffb084 bg, dark text, 24px radius
  peach:
    "rounded-[24px] bg-[#ffb084] text-[#0a0a0a] border-transparent shadow-xs",
  // feature-card-ochre: #e8b94a bg, dark text, 24px radius
  ochre:
    "rounded-[24px] bg-[#e8b94a] text-[#0a0a0a] border-transparent shadow-xs",
  // feature-card-mint: #a4d4c5 bg, dark text, 24px radius
  mint: "rounded-[24px] bg-[#a4d4c5] text-[#0a0a0a] border-transparent shadow-xs",
}

/**
 * Sekkha base Card — aligned strictly with DESIGN.md specifications
 * with Apple HIG Material Glassmorphism support.
 */
export function Card({
  className,
  variant = "default",
  glass = false,
  hoverEffect = false,
  ...props
}: CardProps) {
  const isGlassVariant = variant.startsWith("material-") || variant === "glass"
  const glassClass = isGlassVariant
    ? "" // Already baked into variant classes
    : glass
      ? "bg-opacity-80 border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04] backdrop-blur-xl"
      : ""

  return (
    <div
      className={cn(
        "transition-all",
        cardVariantClasses[variant],
        glassClass,
        hoverEffect && "hover:border-[#9a9a9a] hover:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
