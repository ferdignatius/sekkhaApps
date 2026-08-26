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

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ShadcnDialogContent>) {
  return (
    <ShadcnDialogContent
      className={cn(
        "rounded-3xl border border-sekkha-hairline bg-white p-6 shadow-xl sm:max-w-lg",
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
