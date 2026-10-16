import * as React from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChipVariant = "filter" | "assist" | "input" | "suggestion"

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChipVariant
  selected?: boolean
  icon?: React.ReactNode
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  onDismiss?: () => void
}

/**
 * Sekkha Chip Component — Material Design 3 Standard
 *
 * Standard height: 32px (h-8), M3 Small Shape (rounded-[8px]).
 * Designed for filter bars, tagging, and contextual action chips.
 */
export function Chip({
  className,
  variant = "filter",
  selected = false,
  icon,
  leadingIcon,
  trailingIcon,
  onDismiss,
  children,
  ...props
}: ChipProps) {
  const effectiveLeadingIcon = leadingIcon || icon

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border px-3 text-xs font-semibold transition-all select-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-1 focus-visible:outline-none active:scale-[0.97]",
        // State styling
        selected
          ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-2xs"
          : "border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] hover:border-[#bfbfbf] hover:bg-[#f5f0e0]",
        className
      )}
      {...props}
    >
      {variant === "filter" && selected ? (
        <CheckIcon
          className="size-3.5 stroke-[2.5] text-white"
          aria-hidden="true"
        />
      ) : effectiveLeadingIcon ? (
        <span className="inline-flex shrink-0 text-[#6a6a6a] [&>svg]:size-3.5">
          {effectiveLeadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {trailingIcon && (
        <span className="inline-flex shrink-0 text-[#6a6a6a] [&>svg]:size-3.5">
          {trailingIcon}
        </span>
      )}
      {variant === "input" && onDismiss && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="-mr-1 ml-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-full hover:bg-black/10"
        >
          <XIcon className="size-3" />
        </span>
      )}
    </button>
  )
}
