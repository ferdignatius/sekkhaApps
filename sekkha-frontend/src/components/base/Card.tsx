import * as React from "react"
import {
  Card as ShadcnCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type CardVariant =
  | "default"
  | "canvas"
  | "cream"
  | "soft"
  | "pink"
  | "teal"
  | "lavender"
  | "peach"
  | "ochre"
  | "mint"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  hoverEffect?: boolean
}

const cardVariantClasses: Record<CardVariant, string> = {
  // product-mockup-card & default card: #fffaf0 bg, 16px radius, hairline border
  default: "rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs",
  canvas: "rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs",
  // testimonial-card & cream feature-card: #f5f0e0 bg, 16px radius
  cream: "rounded-[16px] border border-[#e5e5e5] bg-[#f5f0e0] text-[#0a0a0a] shadow-xs",
  // hero-illustration-card / cta-band: #faf5e8 bg, 24px radius
  soft: "rounded-[24px] bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5]/60 shadow-xs",
  // feature-card-pink: #ff4d8b bg, white text, 24px radius
  pink: "rounded-[24px] bg-[#ff4d8b] text-white border-transparent shadow-xs",
  // feature-card-teal: #1a3a3a bg, white text, 24px radius
  teal: "rounded-[24px] bg-[#1a3a3a] text-white border-transparent shadow-xs",
  // feature-card-lavender: #b8a4ed bg, dark text, 24px radius
  lavender: "rounded-[24px] bg-[#b8a4ed] text-[#0a0a0a] border-transparent shadow-xs",
  // feature-card-peach: #ffb084 bg, dark text, 24px radius
  peach: "rounded-[24px] bg-[#ffb084] text-[#0a0a0a] border-transparent shadow-xs",
  // feature-card-ochre: #e8b94a bg, dark text, 24px radius
  ochre: "rounded-[24px] bg-[#e8b94a] text-[#0a0a0a] border-transparent shadow-xs",
  // feature-card-mint: #a4d4c5 bg, dark text, 24px radius
  mint: "rounded-[24px] bg-[#a4d4c5] text-[#0a0a0a] border-transparent shadow-xs",
}

/**
 * Sekkha base Card — aligned strictly with DESIGN.md specifications.
 */
export function Card({
  className,
  variant = "default",
  hoverEffect = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "transition-all",
        cardVariantClasses[variant],
        hoverEffect && "hover:border-[#9a9a9a] hover:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

