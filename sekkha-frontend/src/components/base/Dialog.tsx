import * as React from "react"
import {
  Dialog as ShadcnDialog,
  DialogTrigger,
  DialogContent as ShadcnDialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function Dialog({
  children,
  ...props
}: React.ComponentProps<typeof ShadcnDialog>) {
  return <ShadcnDialog {...props}>{children}</ShadcnDialog>
}

/**
 * Sekkha base DialogContent — aligned strictly with DESIGN.md specifications.
 */
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ShadcnDialogContent>) {
  return (
    <ShadcnDialogContent
      className={cn(
        "rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-6 shadow-2xl sm:max-w-lg text-[#0a0a0a]",
        className
      )}
      {...props}
    >
      {children}
    </ShadcnDialogContent>
  )
}

export {
  DialogTrigger,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}

