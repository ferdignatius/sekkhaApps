import React from "react"

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Clay-themed responsive layout wrapper for Sign Up and Login pages.
 * Strictly adheres to DESIGN.md: warm cream canvas floor (#fffaf0),
 * solid near-black brand header with Sekkha logo, and rounded-xl card container.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-[#fffaf0] px-4 py-8 font-sans selection:bg-[#f5f0e0] selection:text-[#0a0a0a] sm:py-12">
      {/* Subtle warm decorative ambient shapes (Clay pastel accents) */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-[#faf5e8] opacity-80 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 size-96 rounded-full bg-[#f5f0e0] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-24 size-64 rounded-full bg-[#ffb084]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 -left-24 size-64 rounded-full bg-[#b8a4ed]/10 blur-3xl" />

      {/* Main Centered Container */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-[440px] space-y-6">
        {/* Brand Header */}
        <div className="space-y-2.5 text-center">
          <div className="mx-auto flex size-14 items-center justify-center transition-transform hover:scale-105">
            <img
              src="/sekkha_logo.svg"
              alt="Sekkha Logo"
              className="size-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] sm:text-3xl">
              Sekkha
            </h1>
            <p className="mt-1 text-xs font-medium text-[#6a6a6a] sm:text-sm">
              Portal Komunitas & Presensi Remaja Vihara
            </p>
          </div>
        </div>

        {/* Card Container strictly following Clay Card token */}
        <div className="rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] p-6 shadow-xl shadow-[#0a0a0a]/5 transition-all sm:p-8">
          {children}
        </div>
      </div>

      {/* Subtle Warm Footer */}
      <footer className="relative z-10 py-4 text-center text-xs font-medium text-[#6a6a6a]">
        &copy; {new Date().getFullYear()} Sekkha Apps. All rights reserved.
      </footer>
    </div>
  )
}
