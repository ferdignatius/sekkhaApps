import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-surface-card text-ink border-hairline",
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-surface-soft text-ink",
        pink: "bg-clay-pink text-white",
        teal: "bg-clay-teal text-white",
        lavender: "bg-clay-lavender text-ink",
        peach: "bg-clay-peach text-ink",
        ochre: "bg-clay-ochre text-ink",
        mint: "bg-clay-mint text-ink",
        outline: "border-hairline text-ink bg-transparent",
        destructive: "bg-destructive text-white",
        ghost: "hover:bg-surface-soft text-text-muted hover:text-ink",
        link: "text-ink underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
