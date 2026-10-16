import * as React from "react"
import {
  AlertDialog as ShadcnAlertDialog,
  AlertDialogTrigger,
  AlertDialogContent as ShadcnAlertDialogContent,
  AlertDialogHeader as ShadcnAlertDialogHeader,
  AlertDialogFooter as ShadcnAlertDialogFooter,
  AlertDialogTitle as ShadcnAlertDialogTitle,
  AlertDialogDescription as ShadcnAlertDialogDescription,
  AlertDialogAction as ShadcnAlertDialogAction,
  AlertDialogCancel as ShadcnAlertDialogCancel,
  AlertDialogMedia as ShadcnAlertDialogMedia,
} from "@/components/ui/alert-dialog"
import { AlertTriangleIcon, Trash2Icon, InfoIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function AlertDialog({
  children,
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialog>) {
  return <ShadcnAlertDialog {...props}>{children}</ShadcnAlertDialog>
}

/**
 * Sekkha Base AlertDialogContent — Apple HIG & Clay Design System
 * Features 28px rounded squircles, Clay surface (#faf5e8), and hairline border (#e5e5e5).
 */
export function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialogContent>) {
  return (
    <ShadcnAlertDialogContent
      className={cn(
        "rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8] p-6 text-left font-sans text-[#0a0a0a] shadow-2xl backdrop-blur-sm sm:max-w-md",
        className
      )}
      {...props}
    >
      {children}
    </ShadcnAlertDialogContent>
  )
}

export function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialogHeader>) {
  return (
    <ShadcnAlertDialogHeader
      className={cn("flex flex-col gap-2 text-left sm:text-left", className)}
      {...props}
    />
  )
}

export function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialogFooter>) {
  return (
    <ShadcnAlertDialogFooter
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-[#e5e5e5] pt-4 mt-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

export function AlertDialogMedia({
  className,
  variant = "warning",
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialogMedia> & {
  variant?: "destructive" | "warning" | "info"
}) {
  const variantStyles = {
    destructive: "bg-rose-100 text-rose-700",
    warning: "bg-[#0a0a0a] text-[#e8b94a]",
    info: "bg-[#1a3a3a]/10 text-[#1a3a3a]",
  }

  return (
    <ShadcnAlertDialogMedia
      className={cn(
        "mb-2 flex size-12 items-center justify-center rounded-[16px] shadow-2xs",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialogTitle>) {
  return (
    <ShadcnAlertDialogTitle
      className={cn(
        "text-base sm:text-lg font-bold tracking-tight text-[#0a0a0a]",
        className
      )}
      {...props}
    />
  )
}

export function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialogDescription>) {
  return (
    <ShadcnAlertDialogDescription
      className={cn("text-xs sm:text-sm text-[#6a6a6a] leading-relaxed", className)}
      {...props}
    />
  )
}

export function AlertDialogAction({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialogAction> & {
  variant?: "default" | "destructive"
}) {
  return (
    <ShadcnAlertDialogAction
      className={cn(
        "min-h-[40px] cursor-pointer rounded-full px-5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95",
        variant === "destructive"
          ? "bg-rose-600 hover:bg-rose-700"
          : "bg-[#0a0a0a] hover:bg-[#1f1f1f]",
        className
      )}
      {...props}
    />
  )
}

export function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnAlertDialogCancel>) {
  return (
    <ShadcnAlertDialogCancel
      className={cn(
        "min-h-[40px] cursor-pointer rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#6a6a6a] shadow-xs transition-colors hover:bg-[#faf5e8] hover:text-[#0a0a0a]",
        className
      )}
      {...props}
    />
  )
}

// ─── Reusable High-Level ConfirmDialog Component ─────────────────────────────

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: "destructive" | "warning" | "info"
  icon?: React.ReactNode
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

/**
 * Higher-level Apple HIG confirmation dialog.
 * Drop-in modern replacement for browser `window.confirm()`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "warning",
  icon,
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const defaultIcon =
    variant === "destructive" ? (
      <Trash2Icon className="size-6" />
    ) : variant === "info" ? (
      <InfoIcon className="size-6" />
    ) : (
      <AlertTriangleIcon className="size-6" />
    )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia variant={variant}>
            {icon ?? defaultIcon}
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault()
              void onConfirm()
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { AlertDialogTrigger }
