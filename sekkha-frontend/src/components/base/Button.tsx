import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

export type SekkhaButtonVariant =
  | 'primary'
  | 'secondary'
  | 'on-color'
  | 'on-dark'
  | 'ghost'
  | 'destructive'
  | 'link'

export type SekkhaButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: SekkhaButtonVariant
  size?: SekkhaButtonSize
  asChild?: boolean
}

const BASE_CLASSES =
  'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-all select-none disabled:pointer-events-none disabled:bg-[#e5e5e5] disabled:text-[#6a6a6a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 active:scale-[0.98]'

const variantClasses: Record<SekkhaButtonVariant, string> = {
  // button-primary: #0a0a0a bg, white text, active #1f1f1f
  primary:
    'bg-[#0a0a0a] text-white hover:bg-[#1f1f1f] active:bg-[#1f1f1f] shadow-xs',
  // button-secondary: cream canvas bg with hairline border and ink text
  secondary:
    'bg-[#fffaf0] text-[#0a0a0a] border border-[#e5e5e5] hover:bg-[#faf5e8] active:bg-[#f5f0e0] shadow-xs',
  // button-on-color: used over saturated brand cards or dark banners
  'on-color':
    'bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] active:bg-[#f5f0e0] shadow-xs',
  'on-dark':
    'bg-white text-[#0a0a0a] hover:bg-[#faf5e8] active:bg-[#f5f0e0] shadow-xs',
  // button-text-link / ghost
  ghost:
    'bg-transparent text-[#0a0a0a] hover:bg-[#faf5e8] active:bg-[#f5f0e0]',
  destructive:
    'bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c] shadow-xs',
  link:
    'bg-transparent text-[#0a0a0a] underline underline-offset-4 hover:opacity-80 p-0 h-auto',
}

const sizeClasses: Record<SekkhaButtonSize, string> = {
  // Standard DESIGN.md button: 44px height, 12px-20px padding, 12px (rounded-md) radius
  default: 'h-11 rounded-[12px] px-5 py-3 text-sm',
  xs: 'h-7 rounded-[8px] px-2.5 text-xs',
  sm: 'h-9 rounded-[8px] px-3.5 text-xs',
  lg: 'h-12 rounded-[16px] px-6 text-base',
  icon: 'size-11 rounded-[12px] p-0',
}

/**
 * Sekkha base Button — aligned strictly with DESIGN.md specifications.
 *
 * - `button-primary`: #0a0a0a bg, rounded 12px (rounded-md), height 44px, 14px font.
 * - `button-secondary`: #fffaf0 bg, 1px #e5e5e5 border, rounded 12px.
 * - `button-on-color`: inverted white/cream on saturated color cards.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button'

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(BASE_CLASSES, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }

