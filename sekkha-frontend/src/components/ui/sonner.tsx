import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CheckCircle2Icon,
  InfoIcon,
  AlertTriangleIcon,
  XCircleIcon,
  LoaderCircleIcon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CheckCircle2Icon className="size-4 text-emerald-700" />,
        info: <InfoIcon className="size-4 text-sky-700" />,
        warning: <AlertTriangleIcon className="size-4 text-amber-600" />,
        error: <XCircleIcon className="size-4 text-rose-600" />,
        loading: <LoaderCircleIcon className="size-4 animate-spin text-ink" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-canvas, #fffaf0)",
          "--normal-text": "var(--color-ink, #0a0a0a)",
          "--normal-border": "var(--color-hairline, #e5dec9)",
          "--border-radius": "16px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
