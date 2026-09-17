import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

export type TabsVariant = "pill" | "line"

const TabsContext = React.createContext<{ variant: TabsVariant }>({
  variant: "pill",
})

export interface TabsProps extends React.ComponentProps<
  typeof TabsPrimitive.Root
> {
  variant?: TabsVariant
}

export function Tabs({
  variant = "pill",
  className,
  children,
  ...props
}: TabsProps) {
  return (
    <TabsContext.Provider value={{ variant }}>
      <TabsPrimitive.Root
        className={cn("flex flex-col gap-3", className)}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { variant } = React.useContext(TabsContext)

  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center",
        variant === "pill" &&
          "w-fit gap-1 rounded-full border border-[#e5e5e5] bg-[#faf5e8] p-1",
        variant === "line" &&
          "w-full gap-4 border-b border-[#e5e5e5] bg-transparent pb-px",
        className
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { variant } = React.useContext(TabsContext)

  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 sm:text-sm",
        variant === "pill" &&
          "rounded-full px-3.5 py-1.5 text-[#6a6a6a] hover:bg-[#fffaf0]/60 hover:text-[#0a0a0a] data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-white data-[state=active]:shadow-xs",
        variant === "line" &&
          "border-b-2 border-transparent px-3 py-2 text-[#6a6a6a] hover:text-[#0a0a0a] data-[state=active]:border-[#0a0a0a] data-[state=active]:font-bold data-[state=active]:text-[#0a0a0a]",
        className
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("transition-all outline-none", className)}
      {...props}
    />
  )
}
