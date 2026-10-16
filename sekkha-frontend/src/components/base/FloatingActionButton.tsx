import * as React from "react"
import { cn } from "@/lib/utils"

export type FABSize = "small" | "default" | "extended"
export type FABVariant = "primary" | "ochre" | "surface"

export interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: FABSize
  variant?: FABVariant
  icon?: React.ReactNode
  label?: string
}

const variantStyles: Record<FABVariant, string> = {
  primary:
    "bg-[#0a0a0a] text-white hover:bg-[#1f1f1f] shadow-md hover:shadow-lg",
  ochre:
    "bg-[#e8b94a] text-[#0a0a0a] hover:bg-[#d8a839] shadow-md hover:shadow-lg font-bold",
  surface:
    "bg-[#fffaf0] text-[#0a0a0a] border border-[#e5e5e5] hover:bg-[#faf5e8] shadow-md hover:shadow-lg",
}

const sizeStyles: Record<FABSize, string> = {
  // M3 Standard FAB: 56x56dp, rounded-2xl (16px)
  default: "size-14 rounded-[16px]",
  // M3 Small FAB: 40x40dp, rounded-xl (12px)
  small: "size-10 rounded-[12px]",
  // M3 Extended FAB: 56dp height, pill shape with icon + text
  extended: "h-14 rounded-full px-6 gap-2.5",
}

/**
 * Sekkha Floating Action Button (FAB) — Material Design 3 Standard
 *
 * Used for primary contextual actions (e.g. Scan QR Presensi, Buat Event).
 */
export const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(
  (
    {
      className,
      size = "default",
      variant = "primary",
      icon,
      label,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold transition-all select-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {icon && (
          <span className="inline-flex shrink-0 [&>svg]:size-6">{icon}</span>
        )}
        {(label || children) && (
          <span className="text-sm font-bold tracking-tight">
            {label || children}
          </span>
        )}
      </button>
    )
  }
)
FloatingActionButton.displayName = "FloatingActionButton"
export { FloatingActionButton as FAB }
