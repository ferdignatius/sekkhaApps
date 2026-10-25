import React, { useState, useRef, useEffect } from "react"
import { CheckCircle2Icon, ArrowDownIcon } from "lucide-react"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Button } from "@/components/base/Button"
import { PrivacyPolicyDocument } from "@/modules/landing-page"

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  onAgree: () => void
}

export function PrivacyPolicyModal({
  isOpen,
  onClose,
  onAgree,
}: PrivacyPolicyModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [language, setLanguage] = useState<"id" | "en">("id")

  const isId = language === "id"

  // Check if content is scrollable or already at bottom upon opening or language change
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false)
      // Slight timeout to let DOM layout settle
      const timer = setTimeout(() => {
        const el = scrollContainerRef.current
        if (el) {
          // If content does not overflow, enable immediately
          if (el.scrollHeight <= el.clientHeight + 10) {
            setHasScrolledToBottom(true)
          }
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen, language])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    // Tolerance of 25px for cross-browser subpixel calculations
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 25
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true)
    }
  }

  function handleAccept() {
    if (!hasScrolledToBottom) return
    onAgree()
    onClose()
  }

  return (
    <ResponsiveFormModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={
        isId ? "Kebijakan Privasi Sekkha Apps" : "Sekkha Apps Privacy Policy"
      }
      description={
        isId
          ? "Silakan baca kebijakan privasi kami hingga akhir untuk melanjutkan pendaftaran."
          : "Please read our privacy policy in its entirety to proceed with registration."
      }
    >
      <div className="flex flex-col gap-4 text-left font-sans">
        {/* Policy Content Scrollable Box */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          tabIndex={0}
          aria-label="Privacy Policy Content"
          className="h-[360px] overflow-y-auto rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 text-xs leading-relaxed text-[#3a3a3a] shadow-inner focus:ring-1 focus:ring-[#0a0a0a] focus:outline-none sm:h-[400px] sm:p-5"
        >
          <PrivacyPolicyDocument
            compact
            language={language}
            onLanguageChange={setLanguage}
            showLanguageToggle
            showSummaryCard
          />
        </div>

        {/* Scroll Progress / Status Notice */}
        <div className="flex items-center justify-between gap-2 px-1">
          {hasScrolledToBottom ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e]">
              <CheckCircle2Icon className="size-4" />
              <span>
                {isId
                  ? "Anda telah membaca seluruh kebijakan privasi."
                  : "You have read the full privacy policy."}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#6a6a6a]">
              <ArrowDownIcon className="size-3.5 animate-bounce text-[#0a0a0a]" />
              <span>
                {isId
                  ? "Gulir ke bawah hingga akhir untuk mengaktifkan persetujuan."
                  : "Scroll to the bottom to enable agreement."}
              </span>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e5e5e5] pt-2">
          <Button type="button" variant="outlined" onClick={onClose}>
            {isId ? "Batal" : "Cancel"}
          </Button>

          <Button
            type="button"
            variant="filled"
            disabled={!hasScrolledToBottom}
            onClick={handleAccept}
          >
            <CheckCircle2Icon className="size-3.5" />
            <span>
              {isId ? "Saya Mengerti & Setuju" : "I Understand & Agree"}
            </span>
          </Button>
        </div>
      </div>
    </ResponsiveFormModal>
  )
}
