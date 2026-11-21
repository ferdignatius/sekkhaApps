import { toast } from "sonner"
import type { ToasterProps } from "sonner"
import { Toaster as ShadcnToaster } from "@/components/ui/sonner"

/**
 * Sekkha global Toaster — styled with Clay Design System warm cream tokens
 * and positioned top-center so notifications stay clear of mobile bottom dock & sheets.
 */
export function Toaster(props: ToasterProps) {
  return (
    <ShadcnToaster
      position="top-center"
      expand={false}
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-[18px] !border !border-[#e5dec9] !bg-[#fffaf0]/95 !px-4 !py-3 !text-xs !font-semibold !text-[#0a0a0a] !shadow-[0_14px_34px_rgba(10,10,10,0.12)] !backdrop-blur-xl",
          title: "!text-xs !font-bold !text-[#0a0a0a]",
          description: "!text-[11px] !font-medium !text-[#6a6a6a]",
          closeButton:
            "!border-[#e5dec9] !bg-[#faf5e8] !text-[#6a6a6a] hover:!bg-[#f0e8d5] hover:!text-[#0a0a0a]",
          success: "!border-emerald-300/70 !bg-[#fffaf0]/98",
          error: "!border-rose-300 !bg-rose-50/98 !text-rose-900",
          warning: "!border-amber-300 !bg-amber-50/98 !text-amber-950",
        },
      }}
      {...props}
    />
  )
}

export { toast }
