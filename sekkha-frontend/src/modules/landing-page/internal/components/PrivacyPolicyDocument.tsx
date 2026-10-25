import * as React from "react"
import {
  ShieldCheckIcon,
  LanguagesIcon,
  MailIcon,
  InfoIcon,
} from "lucide-react"
import { privacyPolicyData } from "../data/privacyContent"

export interface PrivacyPolicyDocumentProps {
  language?: "id" | "en"
  onLanguageChange?: (lang: "id" | "en") => void
  showLanguageToggle?: boolean
  showSummaryCard?: boolean
  compact?: boolean
  className?: string
}

export function PrivacyPolicyDocument({
  language = "id",
  onLanguageChange,
  showLanguageToggle = true,
  showSummaryCard = true,
  compact = false,
  className = "",
}: PrivacyPolicyDocumentProps) {
  const [activeLang, setActiveLang] = React.useState<"id" | "en">(language)

  React.useEffect(() => {
    setActiveLang(language)
  }, [language])

  const handleLangToggle = (lang: "id" | "en") => {
    setActiveLang(lang)
    onLanguageChange?.(lang)
  }

  const isId = activeLang === "id"
  const data = privacyPolicyData

  return (
    <div className={`flex flex-col gap-5 text-left font-sans ${className}`}>
      {/* Header Bar: Status & Language Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sekkha-hairline bg-sekkha-surface p-3 text-sekkha-ink">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sekkha-ink text-sekkha-canvas">
            <ShieldCheckIcon className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-micro font-semibold tracking-wider text-sekkha-slate uppercase">
              {isId ? "Status Dokumen Resmi" : "Official Legal Document"}
            </span>
            <span className="text-body-sm font-semibold text-sekkha-ink">
              {isId ? "Terakhir Diperbarui:" : "Last Updated:"}{" "}
              {isId ? data.lastUpdated.id : data.lastUpdated.en}
            </span>
          </div>
        </div>

        {showLanguageToggle && (
          <div className="flex items-center gap-1 rounded-lg border border-sekkha-hairline bg-sekkha-canvas p-1">
            <LanguagesIcon className="ml-1.5 size-3.5 text-sekkha-slate" />
            <button
              type="button"
              onClick={() => handleLangToggle("id")}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                isId
                  ? "bg-sekkha-ink text-sekkha-canvas shadow-xs"
                  : "text-sekkha-slate hover:text-sekkha-ink"
              }`}
            >
              Bahasa Indonesia
            </button>
            <button
              type="button"
              onClick={() => handleLangToggle("en")}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                !isId
                  ? "bg-sekkha-ink text-sekkha-canvas shadow-xs"
                  : "text-sekkha-slate hover:text-sekkha-ink"
              }`}
            >
              English
            </button>
          </div>
        )}
      </div>

      {/* Compliance Notice Card */}
      {showSummaryCard && (
        <div className="flex items-start gap-3 rounded-xl border border-sekkha-hairline bg-surface-soft p-3.5 text-xs text-sekkha-ink">
          <InfoIcon className="mt-0.5 size-4.5 shrink-0 text-[#1a3a3a]" />
          <div className="flex flex-col gap-1 leading-relaxed">
            <p className="font-semibold text-sekkha-ink">
              {isId
                ? "Kepatuhan Regulasi Perlindungan Data Pribadi (UU PDP No. 27/2022)"
                : "Regulatory Compliance (Indonesian PDP Law No. 27/2022)"}
            </p>
            <p className="text-sekkha-slate">
              {isId
                ? `Dokumen ini disusun untuk menjamin transparansi pengelolaan data pemuda Vihara Tri Maha Dharma sesuai ${data.governingLaw.id}. Hak-hak Anda dilindungi penuh oleh undang-undang.`
                : `This document establishes transparency in managing temple youth data under ${data.governingLaw.en}. Your statutory privacy rights are strictly safeguarded.`}
            </p>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className={`flex flex-col ${compact ? "gap-4" : "gap-6"}`}>
        {data.sections.map((section) => {
          const title = isId ? section.title.id : section.title.en
          const summary = isId ? section.summary.id : section.summary.en
          const paragraphs = isId
            ? section.paragraphs.id
            : section.paragraphs.en
          const bulletPoints = section.bulletPoints
            ? isId
              ? section.bulletPoints.id
              : section.bulletPoints.en
            : []

          return (
            <section
              key={section.id}
              id={section.id}
              className={`flex flex-col gap-2 rounded-xl border border-sekkha-hairline bg-sekkha-canvas ${
                compact ? "p-3.5" : "p-5"
              } transition-colors hover:border-sekkha-ink/20`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-sekkha-hairline/60 pb-2">
                <h3
                  className={`font-bold tracking-tight text-sekkha-ink ${
                    compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                  }`}
                >
                  {title}
                </h3>
              </div>

              {/* Quick Summary Pill / Callout */}
              <div className="rounded-lg bg-sekkha-surface/60 px-3 py-1.5 text-xs font-medium text-sekkha-slate">
                <span className="font-semibold text-sekkha-ink">
                  {isId ? "Ringkasan: " : "Summary: "}
                </span>
                {summary}
              </div>

              {/* Paragraphs */}
              <div
                className={`text-sekkha-body space-y-2 leading-relaxed ${
                  compact ? "text-xs" : "text-xs sm:text-sm"
                }`}
              >
                {paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {/* Bullet Points (if any) */}
              {bulletPoints.length > 0 && (
                <ul
                  className={`text-sekkha-body list-disc space-y-1.5 pl-5 ${
                    compact ? "text-xs" : "text-xs sm:text-sm"
                  }`}
                >
                  {bulletPoints.map((bp, bIdx) => {
                    const colonIndex = bp.indexOf(":")
                    if (colonIndex > 0) {
                      const prefix = bp.substring(0, colonIndex + 1)
                      const rest = bp.substring(colonIndex + 1)
                      return (
                        <li key={bIdx} className="leading-relaxed">
                          <strong className="text-sekkha-ink">{prefix}</strong>
                          {rest}
                        </li>
                      )
                    }
                    return (
                      <li key={bIdx} className="leading-relaxed">
                        {bp}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {/* Controller & Contact Card */}
      <div
        className={`flex flex-col gap-2 rounded-xl border border-sekkha-hairline bg-sekkha-surface ${
          compact ? "p-3 text-xs" : "p-5 text-sm"
        }`}
      >
        <div className="flex items-center gap-2 font-semibold text-sekkha-ink">
          <MailIcon className="size-4 text-sekkha-ink" />
          <span>
            {isId
              ? "Sekretariat Pengendali Data Pribadi"
              : "Data Controller Secretariat"}
          </span>
        </div>
        <p className="text-sekkha-slate">
          {data.dataController.organization} — {data.dataController.name}
        </p>
        <p className="text-sekkha-slate">
          Email:{" "}
          <a
            href={`mailto:${data.dataController.email}`}
            className="font-medium text-sekkha-ink underline hover:text-[#1a3a3a]"
          >
            {data.dataController.email}
          </a>
        </p>
      </div>

      {/* End of Policy Banner */}
      <div className="rounded-xl border border-sekkha-hairline bg-surface-card p-3 text-center text-xs font-medium text-sekkha-ink">
        {isId
          ? "— Akhir Dokumen Kebijakan Privasi Sekkha Apps —"
          : "— End of Sekkha Apps Privacy Policy —"}
      </div>
    </div>
  )
}
