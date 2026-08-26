import * as React from "react"
import {
  Card as ShadcnCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface CardProps extends React.ComponentProps<typeof ShadcnCard> {
  hoverEffect?: boolean
}

export function Card({ className, hoverEffect = false, ...props }: CardProps) {
  return (
    <ShadcnCard
      className={cn(
        "rounded-3xl border border-sekkha-hairline bg-white/95 text-sekkha-ink shadow-xs transition-all",
        hoverEffect && "hover:border-sekkha-hairline-strong hover:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
