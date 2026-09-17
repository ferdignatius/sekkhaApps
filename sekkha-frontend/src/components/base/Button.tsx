import * as React from "react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

export type SekkhaButtonVariant =
  | "filled"
  | "tonal"
  | "elevated"
  | "outlined"
  | "outline"
  | "text"
  | "primary"
  | "secondary"
  | "on-color"
  | "on-dark"
  | "ghost"
  | "destructive"
  | "danger"
  | "link"

export type SekkhaButtonSize = "default" | "xs" | "sm" | "lg" | "icon"

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: SekkhaButtonVariant
  size?: SekkhaButtonSize
  asChild?: boolean
}

const BASE_CLASSES =
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap font-semibold transition-all select-none disabled:pointer-events-none disabled:bg-[#e5e5e5] disabled:text-[#6a6a6a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 active:scale-[0.97]"

const variantClasses: Record<SekkhaButtonVariant, string> = {
  // ─── Material Design 3 Canonical Variants (Clay Material) ───
  // 1. M3 Filled Button: Dominant high-emphasis CTA
  filled:
    "bg-[#0a0a0a] text-white hover:bg-[#1f1f1f] active:bg-[#2a2a2a] shadow-2xs hover:shadow-xs",
  // 2. M3 Tonal Button: Medium emphasis with surface container tint
  tonal:
    "bg-[#faf5e8] text-[#0a0a0a] hover:bg-[#f5f0e0] active:bg-[#ebe6d6] border border-[#e5e5e5]/50",
  // 3. M3 Elevated Button: Surface with subtle elevation shadow
  elevated:
    "bg-[#fffaf0] text-[#0a0a0a] border border-[#e5e5e5]/60 shadow-xs hover:shadow-md active:bg-[#faf5e8]",
  // 4. M3 Outlined Button: Border with transparent surface
  outlined:
    "bg-transparent text-[#0a0a0a] border border-[#e5e5e5] hover:border-[#bfbfbf] hover:bg-[#faf5e8] active:bg-[#f5f0e0]",
  outline:
    "bg-transparent text-[#0a0a0a] border border-[#e5e5e5] hover:border-[#bfbfbf] hover:bg-[#faf5e8] active:bg-[#f5f0e0]",
  // 5. M3 Text Button: Flat low-emphasis
  text: "bg-transparent text-[#0a0a0a] hover:bg-[#faf5e8] active:bg-[#f5f0e0]",

  // ─── Clay Compatibility Aliases ───
  primary:
    "bg-[#0a0a0a] text-white hover:bg-[#1f1f1f] active:bg-[#2a2a2a] shadow-2xs hover:shadow-xs",
  secondary:
    "bg-[#fffaf0] text-[#0a0a0a] border border-[#e5e5e5] hover:border-[#bfbfbf] hover:bg-[#faf5e8] active:bg-[#f5f0e0] shadow-2xs",
  "on-color":
    "bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] active:bg-[#f5f0e0] shadow-xs hover:shadow-md",
  "on-dark":
    "bg-white text-[#0a0a0a] hover:bg-[#faf5e8] active:bg-[#f5f0e0] shadow-xs hover:shadow-md",
  ghost: "bg-transparent text-[#0a0a0a] hover:bg-[#faf5e8] active:bg-[#f5f0e0]",
  destructive:
    "bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c] shadow-xs",
  danger:
    "bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c] shadow-xs",
  link: "bg-transparent text-[#0a0a0a] underline underline-offset-4 hover:opacity-80 p-0 h-auto",
}

const sizeClasses: Record<SekkhaButtonSize, string> = {
  // Standard Material Design 3 Pill Scale (40px standard height)
  default: "h-10 rounded-full px-5 py-2.5 text-sm",
  xs: "h-7 rounded-full px-3 text-xs",
  sm: "h-8.5 rounded-full px-4 text-xs font-semibold",
  lg: "h-12 rounded-full px-6 text-base",
  icon: "size-10 rounded-full p-0",
}

/**
 * Sekkha Button — Aligned with Google Material Design 3 ergonomics
 * combined with the warm, playful Clay Design System palette.
 *
 * M3 Variants:
 * - `filled` (high emphasis, near-black)
 * - `tonal` (medium emphasis, soft cream container)
 * - `elevated` (surface with elevation shadow)
 * - `outlined` (hairline border)
 * - `text` (flat text button)
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      className,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot.Root : "button"

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(
          BASE_CLASSES,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
