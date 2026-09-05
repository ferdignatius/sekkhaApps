import React from "react"
import { SparklesIcon } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Clay-themed responsive layout wrapper for Sign Up and Login pages.
 * Strictly adheres to DESIGN.md: warm cream canvas floor (#fffaf0),
 * solid near-black brand header with ochre sparkles, and rounded-xl card container.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#fffaf0] px-4 py-8 sm:py-12 font-sans selection:bg-[#f5f0e0] selection:text-[#0a0a0a]">
      {/* Subtle warm decorative ambient shapes (Clay pastel accents) */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-[#faf5e8] blur-3xl opacity-80" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-[#f5f0e0] blur-3xl opacity-70" />
      <div className="pointer-events-none absolute top-1/2 -right-24 size-64 rounded-full bg-[#ffb084]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 -left-24 size-64 rounded-full bg-[#b8a4ed]/10 blur-3xl" />

      {/* Main Centered Container */}
      <div className="relative z-10 mx-auto w-full max-w-[440px] my-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="mx-auto flex size-13 w-13 h-13 items-center justify-center rounded-[16px] bg-[#0a0a0a] text-white shadow-xs font-bold transition-transform hover:scale-105">
            <SparklesIcon className="size-6 text-[#e8b94a]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a0a0a]">
              Sekkha
            </h1>
            <p className="text-xs sm:text-sm text-[#6a6a6a] mt-1 font-medium">
              Portal Komunitas & Presensi Remaja Vihara
            </p>
          </div>
        </div>

        {/* Card Container strictly following Clay Card token */}
        <div className="rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] p-6 sm:p-8 shadow-xl shadow-[#0a0a0a]/5 transition-all">
          {children}
        </div>
      </div>

      {/* Subtle Warm Footer */}
      <footer className="relative z-10 text-center text-xs font-medium text-[#6a6a6a] py-4">
        &copy; {new Date().getFullYear()} Sekkha Apps. All rights reserved.
      </footer>
    </div>
  )
}
