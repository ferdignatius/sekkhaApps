import * as React from "react"
import {
  AlertTitle as ShadcnAlertTitle,
  AlertDescription as ShadcnAlertDescription,
} from "@/components/ui/alert"
import {
  InfoIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type AlertVariant = "info" | "success" | "warning" | "destructive"

const variantStyles: Record<AlertVariant, { container: string; iconClass: string; Icon: React.ComponentType<{ className?: string }> }> = {
  info: {
    container: "bg-[#1a3a3a]/10 border-[#1a3a3a]/20 text-[#0a0a0a]",
    iconClass: "text-[#1a3a3a]",
    Icon: InfoIcon,
  },
  success: {
    container: "bg-[#22c55e]/10 border-[#22c55e]/25 text-[#0a0a0a]",
    iconClass: "text-[#22c55e]",
    Icon: CheckCircle2Icon,
  },
  warning: {
    container: "bg-[#f59e0b]/10 border-[#f59e0b]/25 text-[#0a0a0a]",
    iconClass: "text-[#f59e0b]",
    Icon: AlertTriangleIcon,
  },
  destructive: {
    container: "bg-[#ef4444]/10 border-[#ef4444]/25 text-[#0a0a0a]",
    iconClass: "text-[#ef4444]",
    Icon: AlertCircleIcon,
  },
}

export interface BaseAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
  description?: React.ReactNode
  icon?: React.ReactNode
}

/**
 * Sekkha base Alert — aligned strictly with DESIGN.md specifications.
 */
export function Alert({
  variant = "info",
  title,
  description,
  icon,
  className,
  children,
  ...props
}: BaseAlertProps) {
  const config = variantStyles[variant]
  const DefaultIcon = config.Icon

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-[16px] border p-4 text-sm text-[#0a0a0a] shadow-xs transition-all font-sans",
        config.container,
        className
      )}
      {...props}
    >
      <div className={cn("size-5 shrink-0 mt-0.5", config.iconClass)}>
        {icon ?? <DefaultIcon className="size-5" />}
      </div>
      <div className="space-y-1 flex-1 text-left">
        {title && <p className="font-semibold text-sm leading-tight text-[#0a0a0a]">{title}</p>}
        {description && (
          <div className="text-xs leading-relaxed text-[#3a3a3a]">{description}</div>
        )}
        {children}
      </div>
    </div>
  )
}

export { ShadcnAlertTitle as AlertTitle, ShadcnAlertDescription as AlertDescription }

