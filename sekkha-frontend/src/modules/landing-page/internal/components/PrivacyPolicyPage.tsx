import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  PrinterIcon,
  ShieldCheckIcon,
  ListOrderedIcon,
  CheckCircle2Icon,
  UserPlusIcon,
} from "lucide-react"

import { landingContent } from "../data/landingContent"
import { privacyPolicyData } from "../data/privacyContent"
import { PrivacyPolicyDocument } from "./PrivacyPolicyDocument"
import { LandingFooter } from "./LandingFooter"

/**
 * PrivacyPolicyPage — Halaman publik Kebijakan Privasi Sekkha Apps.
 * Rute: /privacy
 * Sesuai UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP).
 */
export function PrivacyPolicyPage() {
  const [language, setLanguage] = React.useState<"id" | "en">("id")
  const isId = language === "id"
  const data = privacyPolicyData

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <div className="relative min-h-screen bg-sekkha-canvas text-sekkha-ink">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-sekkha-hairline bg-sekkha-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-semibold text-sekkha-ink transition-colors hover:opacity-80"
            >
              <img
                src="/sekkha_logo.svg"
                alt="Sekkha Logo"
                className="size-6 object-contain"
              />
              <span className="font-bold tracking-tight">Sekkha</span>
            </Link>
            <span className="text-sekkha-hairline">/</span>
            <span className="text-xs font-medium text-sekkha-slate">
              {isId ? "Kebijakan Privasi" : "Privacy Policy"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sekkha-hairline bg-sekkha-surface px-3 py-1.5 text-xs font-semibold text-sekkha-ink transition-colors hover:bg-surface-card"
            >
              <ArrowLeftIcon className="size-3.5" />
              <span className="hidden sm:inline">
                {isId ? "Beranda" : "Home"}
              </span>
            </Link>

            <Link
              to="/sign-up"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sekkha-ink px-3 py-1.5 text-xs font-semibold text-sekkha-canvas shadow-xs transition-opacity hover:opacity-90"
            >
              <UserPlusIcon className="size-3.5" />
              <span>{isId ? "Daftar Akun" : "Sign Up"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="border-b border-sekkha-hairline bg-sekkha-surface py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sekkha-hairline bg-sekkha-canvas px-3 py-1 text-xs font-semibold text-[#1a3a3a]">
              <ShieldCheckIcon className="size-4" />
              <span>
                {isId
                  ? "Kepatuhan UU PDP No. 27/2022"
                  : "Compliant with UU PDP No. 27/2022"}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-sekkha-ink sm:text-4xl md:text-5xl">
              {isId ? "Kebijakan Privasi" : "Privacy Policy"}
            </h1>

            <p className="max-w-3xl text-sm leading-relaxed text-sekkha-slate sm:text-base">
              {isId
                ? "Komitmen transparansi dan perlindungan data pribadi pemuda dan umat di lingkungan Vihara Tri Maha Dharma dalam penggunaan aplikasi Sekkha."
                : "Our firm commitment to transparency and personal data protection for youth and members of Vihara Tri Maha Dharma on Sekkha Apps."}
            </p>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage("id")}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isId
                      ? "bg-sekkha-ink text-sekkha-canvas shadow-xs"
                      : "border border-sekkha-hairline bg-sekkha-canvas text-sekkha-slate hover:text-sekkha-ink"
                  }`}
                >
                  🇮🇩 Bahasa Indonesia
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    !isId
                      ? "bg-sekkha-ink text-sekkha-canvas shadow-xs"
                      : "border border-sekkha-hairline bg-sekkha-canvas text-sekkha-slate hover:text-sekkha-ink"
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sekkha-hairline bg-sekkha-canvas px-3 py-1.5 text-xs font-semibold text-sekkha-ink shadow-xs transition-colors hover:bg-surface-card"
              >
                <PrinterIcon className="size-3.5" />
                <span>{isId ? "Cetak Dokumen" : "Print Document"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area: TOC + Document */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Table of Contents - Desktop Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 flex flex-col gap-3 rounded-xl border border-sekkha-hairline bg-sekkha-surface p-4 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-sekkha-ink">
                <ListOrderedIcon className="size-4" />
                <span className="text-xs tracking-wider text-sekkha-slate uppercase">
                  {isId ? "Daftar Isi" : "Table of Contents"}
                </span>
              </div>
              <nav
                aria-label="Table of contents"
                className="flex flex-col gap-1"
              >
                {data.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="line-clamp-1 rounded-md px-2 py-1.5 text-xs font-medium text-sekkha-slate transition-colors hover:bg-sekkha-canvas hover:text-sekkha-ink"
                  >
                    {isId ? section.title.id : section.title.en}
                  </a>
                ))}
              </nav>

              <hr className="border-sekkha-hairline" />

              <div className="flex flex-col gap-1 text-xs text-sekkha-slate">
                <span className="font-semibold text-sekkha-ink">
                  {isId ? "Pengendali Data:" : "Data Controller:"}
                </span>
                <span>{data.dataController.organization}</span>
                <a
                  href={`mailto:${data.dataController.email}`}
                  className="text-sekkha-ink underline"
                >
                  {data.dataController.email}
                </a>
              </div>
            </div>
          </aside>

          {/* Privacy Document */}
          <div className="lg:col-span-8">
            <PrivacyPolicyDocument
              language={language}
              onLanguageChange={setLanguage}
              showLanguageToggle={false}
              showSummaryCard={true}
            />

            {/* Post Document Banner */}
            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-sekkha-hairline bg-sekkha-surface p-6 text-center sm:flex-row sm:text-left">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-sekkha-ink sm:text-base">
                  {isId
                    ? "Bergabung Bersama Komunitas Sekkha"
                    : "Join the Sekkha Community"}
                </h4>
                <p className="text-xs text-sekkha-slate">
                  {isId
                    ? "Daftarkan diri Anda untuk mengikuti kegiatan kebaktian dan gamifikasi pemuda vihara."
                    : "Register to take part in Sunday services and Buddhist youth gamification."}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to="/sign-up"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sekkha-ink px-4 py-2 text-xs font-semibold text-sekkha-canvas shadow-xs transition-opacity hover:opacity-90"
                >
                  <CheckCircle2Icon className="size-4" />
                  <span>{isId ? "Daftar Sekarang" : "Register Now"}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <LandingFooter navColumns={landingContent.footer.navColumns} />
    </div>
  )
}
