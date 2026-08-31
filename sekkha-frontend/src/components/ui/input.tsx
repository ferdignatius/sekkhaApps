import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[12px] border border-hairline bg-canvas px-4 py-2 text-base text-ink placeholder:text-text-muted transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-xs",
        className
      )}
      {...props}
    />
  )
}

export { Input }
