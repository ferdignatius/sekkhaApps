import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

type SekkhaButtonVariant = 'primary' | 'secondary' | 'on-dark'

interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: SekkhaButtonVariant
  asChild?: boolean
}

const BASE_CLASSES =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

const variantClasses: Record<SekkhaButtonVariant, string> = {
  // Near-black bg + forced crisp white text — 21:1 contrast guaranteed even on anchor tags
  primary:
    'bg-sekkha-primary text-white !text-white font-semibold rounded-full px-6 py-3 text-button-md hover:bg-black/90 hover:opacity-95 focus-visible:ring-sekkha-primary',
  // Solid white bg + forced dark ink text + crisp border — WCAG AA contrast guaranteed
  secondary:
    'bg-white text-sekkha-ink !text-sekkha-ink border border-sekkha-hairline-strong rounded-full px-6 py-3 text-button-md font-semibold hover:bg-sekkha-surface focus-visible:ring-sekkha-primary shadow-xs',
  // White bg + forced dark ink text — high contrast on dark banner
  'on-dark':
    'bg-white text-sekkha-ink !text-sekkha-ink rounded-full px-6 py-3 text-button-md font-semibold hover:bg-gray-100 focus-visible:ring-white focus-visible:ring-offset-sekkha-primary',
}

/**
 * Sekkha base Button — wraps the shadcn Button primitive with Sekkha design tokens.
 *
 * Variants:
 * - `primary`   — black pill CTA (default)
 * - `secondary` — outlined pill for secondary actions
 * - `on-dark`   — white pill for dark CTA banners
 *
 * All variants include `focus-visible:ring-sekkha-primary` for accessible focus indicators.
 *
 * @requirements 2.3, 2.4, 3.3, 3.4, 6.4, 9.4
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button'

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant}
        className={cn(BASE_CLASSES, variantClasses[variant], className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
export type { ButtonProps, SekkhaButtonVariant }
