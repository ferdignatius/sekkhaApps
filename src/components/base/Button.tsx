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
  // Near-black bg + white text — excellent contrast (21:1). Ring: sekkha-primary (visible against white/light bg).
  primary:
    'bg-sekkha-primary text-sekkha-on-primary rounded-full px-6 py-3 text-button-md hover:opacity-90 focus-visible:ring-sekkha-primary',
  // Transparent bg + dark ink text + hairline border — WCAG AA on white/light surfaces. Ring: sekkha-primary.
  secondary:
    'bg-transparent text-sekkha-ink border border-sekkha-hairline-strong rounded-full px-6 py-3 text-button-md hover:bg-sekkha-surface focus-visible:ring-sekkha-primary',
  // White bg + near-black text — high contrast on dark banner (21:1). Ring: white (visible against dark bg).
  'on-dark':
    'bg-sekkha-on-dark text-sekkha-ink rounded-full px-6 py-3 text-button-md font-medium hover:opacity-90 focus-visible:ring-sekkha-on-dark focus-visible:ring-offset-sekkha-primary',
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
