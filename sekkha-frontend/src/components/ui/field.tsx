import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal"
}) {
  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "flex gap-2",
        orientation === "horizontal" ? "flex-row items-center" : "flex-col",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "text-xs font-semibold whitespace-nowrap text-[#6a6a6a]",
        className
      )}
      {...props}
    />
  )
}

export { Field, FieldLabel }
