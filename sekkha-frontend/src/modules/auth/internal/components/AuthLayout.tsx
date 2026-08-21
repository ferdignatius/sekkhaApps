import React from "react"
import { SparklesIcon } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Premium glassmorphic responsive layout wrapper for Sign Up and Login pages.
 * Features an ambient background glow mesh and refined card styling.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/40 to-blue-100/50 px-4 py-8 sm:py-12">
      {/* Ambient background blur circles */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-indigo-400/20 blur-3xl" />

      {/* Main Centered Container */}
      <div className="relative z-10 mx-auto w-full max-w-[460px] my-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-13 w-13 h-13 items-center justify-center rounded-2xl bg-gradient-to-br from-sekkha-brand-blue to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <SparklesIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-heading-4 font-black tracking-tight text-sekkha-ink">
              Sekkha
            </h1>
            <p className="text-caption text-sekkha-slate mt-0.5">
              Portal Komunitas & Presensi Vihara
            </p>
          </div>
        </div>

        {/* Card Container with glassmorphism */}
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 sm:p-8 shadow-2xl shadow-blue-900/5 backdrop-blur-xl transition-all">
          {children}
        </div>
      </div>

      {/* Subtle Footer */}
      <footer className="relative z-10 text-center text-micro text-sekkha-slate py-4">
        &copy; {new Date().getFullYear()} Sekkha Apps. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  )
}
