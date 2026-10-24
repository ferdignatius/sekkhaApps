import React, { useState, useRef, useEffect } from "react"
import { ShieldCheckIcon, CheckCircle2Icon, ArrowDownIcon } from "lucide-react"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Button } from "@/components/base/Button"

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

  // Check if content is scrollable or already at bottom upon opening
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
  }, [isOpen])

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
      title="Sekkha Apps Privacy Policy"
      description="Please read our privacy policy in its entirety to proceed with registration."
    >
      <div className="flex flex-col gap-4 text-left font-sans">
        {/* Policy Content Scrollable Box */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          tabIndex={0}
          aria-label="Privacy Policy Content"
          className="h-[360px] space-y-4 overflow-y-auto rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 text-xs leading-relaxed text-[#3a3a3a] shadow-inner focus:ring-1 focus:ring-[#0a0a0a] focus:outline-none sm:h-[400px] sm:p-5"
        >
          <div className="flex items-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-2.5 text-[#0a0a0a]">
            <ShieldCheckIcon className="size-5 shrink-0 text-[#1a3a3a]" />
            <span className="text-xs font-semibold">
              Last updated: September 1, 2026
            </span>
          </div>

          <section className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#0a0a0a]">
              1. Introduction
            </h4>
            <p>
              Welcome to <strong>Sekkha Apps</strong>, a Buddhist temple youth
              community platform supporting activity tracking, attendance
              check-in, and a gamified experience. Your privacy is our top
              priority. This Privacy Policy outlines how we collect, use, store,
              and protect your personal data when using the Sekkha application.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#0a0a0a]">
              2. Information We Collect
            </h4>
            <p>
              To provide a safe and organized community experience, we collect
              the following information:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-[#3a3a3a]">
              <li>
                <strong>Account & Identity Details:</strong> Full legal name,
                email address, phone/WhatsApp number, school or campus name,
                date of birth, and your username.
              </li>
              <li>
                <strong>Member Number & QR Code:</strong> A unique Member ID
                automatically generated for temple event attendance and
                verification.
              </li>
              <li>
                <strong>Attendance & Participation Records:</strong> Event
                check-in history, arrival timestamps, duty roles (Puja,
                Chanting, Committee, etc.), and gamification points/badges.
              </li>
              <li>
                <strong>Community Activity:</strong> Discussion forum
                contributions, public posts, and private support requests to
                temple youth advisors.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#0a0a0a]">
              3. How We Use Your Information
            </h4>
            <p>
              Collected data is used solely for the internal purposes of the
              temple youth community, including:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-[#3a3a3a]">
              <li>Verifying the identity of temple community members.</li>
              <li>
                Recording and monitoring attendance at regular services and
                special events.
              </li>
              <li>
                Calculating gamification points, attendance streaks, achievement
                badges, and community leaderboard rankings.
              </li>
              <li>
                Providing aggregated engagement analytics to assist temple
                leaders in supporting community members.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#0a0a0a]">
              4. Data Security & Confidentiality
            </h4>
            <p>
              We apply modern encryption security standards (including bcrypt
              password hashing and authenticated JWT tokens). Your password is
              encrypted and can never be viewed by anyone, including temple
              leaders. We will <strong>never sell or rent</strong> your personal
              information to any third party.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#0a0a0a]">
              5. User Rights & Controls
            </h4>
            <p>As a member, you have full rights to:</p>
            <ul className="list-disc space-y-1 pl-5 text-[#3a3a3a]">
              <li>
                View and update your profile information anytime via Profile
                Settings.
              </li>
              <li>Change your account password independently at any time.</li>
              <li>
                Contact administrators or temple leaders to request account
                deactivation or correction of membership data.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#0a0a0a]">
              6. Consent & Agreement
            </h4>
            <p>
              By checking the agreement box and clicking{" "}
              <em>"I Understand & Agree"</em>, you acknowledge that you have
              read, understood, and agreed to all terms of the Sekkha Apps
              Privacy Policy.
            </p>
          </section>

          <div className="rounded-[12px] border border-[#ebe6d6] bg-[#f5f0e0] p-3 text-center text-xs font-medium text-[#0a0a0a]">
            — End of Sekkha Apps Privacy Policy —
          </div>
        </div>

        {/* Scroll Progress / Status Notice */}
        <div className="flex items-center justify-between gap-2 px-1">
          {hasScrolledToBottom ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e]">
              <CheckCircle2Icon className="size-4" />
              <span>You have read the full privacy policy.</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#6a6a6a]">
              <ArrowDownIcon className="size-3.5 animate-bounce text-[#0a0a0a]" />
              <span>Scroll to the bottom to enable agreement.</span>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e5e5e5] pt-2">
          <Button type="button" variant="outlined" onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="filled"
            disabled={!hasScrolledToBottom}
            onClick={handleAccept}
          >
            <CheckCircle2Icon className="size-3.5" />
            <span>I Understand & Agree</span>
          </Button>
        </div>
      </div>
    </ResponsiveFormModal>
  )
}
