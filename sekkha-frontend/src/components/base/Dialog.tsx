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
 * Sekkha base DialogContent — Apple HIG Material Thick (modal sheets)
 */
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ShadcnDialogContent>) {
  return (
    <ShadcnDialogContent
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/90 p-6 text-[#0a0a0a] shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_16px_-4px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02] backdrop-blur-[40px] sm:max-w-lg",
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
