import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  ChevronRightIcon,
  EyeOffIcon,
  HelpCircleIcon,
  InfoIcon,
  LogOutIcon,
  MailIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  Trash2Icon,
} from "lucide-react"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/base"
import { InstallAppGuideDialog } from "@/components/common/InstallAppPrompt"
import { usePwaInstall } from "@/hooks/usePwaInstall"
import { DeleteAccountDialog } from "./DeleteAccountDialog"

export interface ProfileSettingsViewProps {
  currentEmail?: string | null
  emailVerified?: boolean
  onOpenSecurity: () => void
  onRequestSignOut: () => void
  onLogout: () => void
  onToast: (message: string, type?: "success" | "error") => void
}

export function ProfileSettingsView({
  currentEmail,
  emailVerified = true,
  onOpenSecurity,
  onRequestSignOut,
  onLogout,
  onToast,
}: ProfileSettingsViewProps) {
  const { isInstalled, isIos, promptInstall } = usePwaInstall()
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  async function handleInstallClick() {
    if (isInstalled) {
      onToast("Sekkha is already installed on this device.")
      return
    }
    const result = await promptInstall()
    if (result === "manual") {
      setInstallGuideOpen(true)
    } else if (result === "accepted") {
      onToast("Sekkha has been added to your home screen.")
    }
  }

  return (
    <div
      data-testid="profile-settings-view"
      className="mx-auto w-full max-w-xl space-y-5"
    >
      {/* ── GROUP 1: ACCOUNT & APP ── */}
      <div className="divide-y divide-hairline overflow-hidden rounded-[20px] border border-hairline bg-canvas shadow-2xs">
        <button
          type="button"
          onClick={onOpenSecurity}
          className="flex min-h-[54px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-soft/70"
        >
          <div className="flex min-w-0 items-center gap-3">
            <ShieldCheckIcon
              className="size-4.5 shrink-0 text-text-muted"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                Password &amp; Email Security
              </p>
              <p className="truncate text-xs text-text-muted">
                {currentEmail
                  ? emailVerified
                    ? currentEmail
                    : `${currentEmail} (unverified)`
                  : "Manage password and account email"}
              </p>
            </div>
          </div>
          <ChevronRightIcon
            className="size-4 shrink-0 text-text-muted"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={() => void handleInstallClick()}
          className="flex min-h-[54px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-soft/70"
        >
          <div className="flex min-w-0 items-center gap-3">
            <SmartphoneIcon
              className="size-4.5 shrink-0 text-text-muted"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Install App</p>
              <p className="text-xs text-text-muted">
                {isInstalled
                  ? "Installed on this device"
                  : "Add Sekkha to your home screen"}
              </p>
            </div>
          </div>
          <ChevronRightIcon
            className="size-4 shrink-0 text-text-muted"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* ── GROUP 2: HELP AND SUPPORT & LEGAL ── */}
      <div className="space-y-2.5">
        <h2 className="px-1 text-sm font-bold text-ink">Help and Support</h2>

        <div className="divide-y divide-hairline overflow-hidden rounded-[20px] border border-hairline bg-canvas shadow-2xs">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-soft/70"
          >
            <div className="flex items-center gap-3">
              <HelpCircleIcon
                className="size-4.5 shrink-0 text-text-muted"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-ink">
                Help &amp; Support
              </span>
            </div>
            <ChevronRightIcon
              className="size-4 shrink-0 text-text-muted"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-soft/70"
          >
            <div className="flex items-center gap-3">
              <InfoIcon
                className="size-4.5 shrink-0 text-text-muted"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-ink">
                About Sekkha
              </span>
            </div>
            <ChevronRightIcon
              className="size-4 shrink-0 text-text-muted"
              aria-hidden="true"
            />
          </button>

          <Link
            to="/privacy"
            className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-soft/70"
          >
            <div className="flex items-center gap-3">
              <EyeOffIcon
                className="size-4.5 shrink-0 text-text-muted"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-ink">
                Privacy Policy
              </span>
            </div>
            <ChevronRightIcon
              className="size-4 shrink-0 text-text-muted"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>

      {/* ── GROUP 3: SESSION & ACCOUNT ACTIONS ── */}
      <div className="space-y-3 pt-1">
        <Button
          type="button"
          variant="outlined"
          onClick={onRequestSignOut}
          className="h-12 w-full justify-center gap-2 rounded-[16px] border-hairline bg-canvas text-sm font-bold text-ink shadow-2xs hover:bg-surface-soft"
        >
          <LogOutIcon className="size-4" aria-hidden="true" />
          <span>Sign Out</span>
        </Button>

        <button
          type="button"
          onClick={() => setDeleteDialogOpen(true)}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-rose-200 bg-rose-50/90 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 active:scale-[0.99]"
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* ── DIALOGS ── */}
      <InstallAppGuideDialog
        open={installGuideOpen}
        onOpenChange={setInstallGuideOpen}
        isIos={isIos}
      />

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="rounded-[24px] border border-hairline bg-canvas p-5 text-left sm:max-w-md sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold text-ink">
              Help &amp; Support
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-text-muted">
              Quick answers for event check-in, karma points, and account help.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs leading-relaxed text-ink">
            <div className="rounded-[14px] border border-hairline bg-surface-soft p-3.5">
              <p className="font-bold">Event Check-In &amp; QR Pass</p>
              <p className="mt-1 text-text-muted">
                Show your Member Pass QR to an organizer during an active event
                to record attendance and earn karma points.
              </p>
            </div>
            <div className="rounded-[14px] border border-hairline bg-surface-soft p-3.5">
              <p className="font-bold">Weekly Streak &amp; Bye-Weeks</p>
              <p className="mt-1 text-text-muted">
                Attend at least one qualifying community event per week to grow
                your streak. Weeks without community events are automatically
                skipped.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-[14px] border border-hairline bg-surface-soft p-3.5">
              <MailIcon
                className="mt-0.5 size-4 shrink-0 text-text-muted"
                aria-hidden="true"
              />
              <div>
                <p className="font-bold">Youth Secretariat Contact</p>
                <p className="mt-0.5 text-text-muted">
                  sekretariat@sekkha.local · privacy@sekkha.local
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="rounded-[24px] border border-hairline bg-canvas p-5 text-left sm:max-w-sm sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold text-ink">
              About Sekkha
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-text-muted">
              Buddhist temple youth community platform for attendance, service
              duties, and mindful participation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-[14px] border border-hairline bg-surface-soft p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Application</span>
              <span className="font-bold text-ink">Sekkha</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Version</span>
              <span className="font-mono font-bold text-ink">v1.0</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onLogout={onLogout}
        onToast={onToast}
      />
    </div>
  )
}
