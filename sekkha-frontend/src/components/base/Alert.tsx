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
    container: "bg-blue-50/80 border-blue-200/90 text-blue-950",
    iconClass: "text-blue-600",
    Icon: InfoIcon,
  },
  success: {
    container: "bg-emerald-50/80 border-emerald-200/90 text-emerald-950",
    iconClass: "text-emerald-600",
    Icon: CheckCircle2Icon,
  },
  warning: {
    container: "bg-amber-50/80 border-amber-200/90 text-amber-950",
    iconClass: "text-amber-600",
    Icon: AlertTriangleIcon,
  },
  destructive: {
    container: "bg-red-50/80 border-red-200/90 text-red-950",
    iconClass: "text-red-600",
    Icon: AlertCircleIcon,
  },
}

export interface BaseAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
  description?: React.ReactNode
  icon?: React.ReactNode
}

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
        "flex items-start gap-3 rounded-2xl border p-4 text-body-sm shadow-2xs",
        config.container,
        className
      )}
      {...props}
    >
      <div className={cn("size-5 shrink-0 mt-0.5", config.iconClass)}>
        {icon ?? <DefaultIcon className="size-5" />}
      </div>
      <div className="space-y-0.5 flex-1">
        {title && <p className="font-bold text-caption leading-tight">{title}</p>}
        {description && (
          <div className="text-micro leading-relaxed opacity-90">{description}</div>
        )}
        {children}
      </div>
    </div>
  )
}

export { ShadcnAlertTitle as AlertTitle, ShadcnAlertDescription as AlertDescription }
