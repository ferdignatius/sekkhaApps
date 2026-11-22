import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import {
  Drawer as ShadcnDrawer,
  DrawerPortal,
  DrawerTrigger,
  DrawerClose,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

/**
 * Sekkha base Drawer root — wraps shadcn/vaul Drawer.
 */
export function Drawer({
  ...props
}: React.ComponentProps<typeof ShadcnDrawer>) {
  return <ShadcnDrawer {...props} />
}

/**
 * Sekkha base DrawerOverlay — warm neutral scrim matching desktop modals.
 */
export function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Sekkha base DrawerContent — warm canvas surface (#fffaf0) with clean
 * rounded-t-[28px] corners (no backdrop-filter corner artifacts).
 */
export function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] max-h-[88dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-[#e5dec9] bg-[#fffaf0] text-sm text-[#0a0a0a] shadow-[0_-10px_28px_-4px_rgba(10,10,10,0.12)] outline-none",
          className
        )}
        {...props}
      >
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

export {
  DrawerPortal,
  DrawerTrigger,
  DrawerClose,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
