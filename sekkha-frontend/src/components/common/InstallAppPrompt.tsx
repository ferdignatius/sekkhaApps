import { useState } from "react"
import {
  CheckCircle2Icon,
  DownloadIcon,
  MoreVerticalIcon,
  PlusSquareIcon,
  ShareIcon,
  SmartphoneIcon,
} from "lucide-react"
import { usePwaInstall } from "@/hooks/usePwaInstall"
import { Badge, Button, Card } from "@/components/base"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/base/Dialog"

export function InstallAppGuideDialog({
  open,
  onOpenChange,
  isIos,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isIos: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[20px] border border-hairline bg-canvas p-6 shadow-md">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-[12px] bg-ink text-white">
            <SmartphoneIcon className="size-5 text-clay-ochre" />
          </div>
          <DialogTitle className="text-base font-bold text-ink">
            Install Sekkha on Your Home Screen
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-text-muted">
            Add Sekkha to your device home screen for quick 1-tap access and a
            full-screen app experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {isIos ? (
            <div className="space-y-2.5 rounded-[14px] border border-hairline bg-surface-soft p-3.5 text-xs text-ink">
              <p className="font-bold">Steps for iPhone / iPad (Safari):</p>
              <ol className="space-y-2 text-xs leading-relaxed text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    1
                  </span>
                  <span>
                    Tap the{" "}
                    <strong className="inline-flex items-center gap-1 text-ink">
                      <ShareIcon className="size-3.5" /> Share
                    </strong>{" "}
                    button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    2
                  </span>
                  <span>
                    Scroll down and select{" "}
                    <strong className="inline-flex items-center gap-1 text-ink">
                      <PlusSquareIcon className="size-3.5" /> Add to Home Screen
                    </strong>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    3
                  </span>
                  <span>
                    Tap <strong className="text-ink">Add</strong> in the
                    top-right corner to place the Sekkha icon on your home
                    screen.
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2.5 rounded-[14px] border border-hairline bg-surface-soft p-3.5 text-xs text-ink">
              <p className="font-bold">
                Steps for Android &amp; Desktop Browsers:
              </p>
              <ol className="space-y-2 text-xs leading-relaxed text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    1
                  </span>
                  <span>
                    Open your browser menu{" "}
                    <strong className="inline-flex items-center gap-0.5 text-ink">
                      <MoreVerticalIcon className="size-3.5" /> (Three Dots)
                    </strong>{" "}
                    or look for the install icon in the address bar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    2
                  </span>
                  <span>
                    Select <strong className="text-ink">Install app</strong> or{" "}
                    <strong className="text-ink">Add to Home screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    3
                  </span>
                  <span>
                    Confirm <strong className="text-ink">Install</strong> to
                    create the Sekkha app shortcut on your home screen.
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-[12px] text-xs font-bold sm:w-auto"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Card rendered inside ProfilePage for adding Sekkha directly to the user's Home Screen.
 */
export function InstallAppCard() {
  const { isInstalled, isIos, promptInstall } = usePwaInstall()
  const [guideOpen, setGuideOpen] = useState(false)

  async function handleClick() {
    const result = await promptInstall()
    if (result === "manual") {
      setGuideOpen(true)
    }
  }

  return (
    <>
      <Card
        data-testid="profile-install-app-card"
        className="border-hairline bg-canvas p-5 shadow-none"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <SmartphoneIcon className="size-4 text-clay-teal" />
                <span>Install This App</span>
              </h2>
              {isInstalled && (
                <Badge
                  variant="mint"
                  size="sm"
                  icon={<CheckCircle2Icon className="size-3" />}
                >
                  Installed
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-text-muted">
              {isInstalled
                ? "Sekkha is installed on this device for fast 1-tap launch."
                : "Add Sekkha to your home screen for quick access and an app-like experience."}
            </p>
          </div>

          <Button
            type="button"
            variant={isInstalled ? "outlined" : "primary"}
            disabled={isInstalled}
            onClick={() => void handleClick()}
            className="h-11 shrink-0 gap-2 rounded-[12px] px-5 text-xs font-bold lg:w-full lg:justify-center"
          >
            {isInstalled ? (
              <>
                <CheckCircle2Icon className="size-4 text-emerald-600" />
                <span>App Installed</span>
              </>
            ) : (
              <>
                <DownloadIcon className="size-4" />
                <span>Install This App</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      <InstallAppGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        isIos={isIos}
      />
    </>
  )
}

/**
 * Compact action item inside AppSidebar's footer dropdown menu.
 * Notifies the parent when manual instructions dialog should open so the modal stays
 * mounted even after the dropdown menu closes.
 */
export function InstallAppMenuItem({
  onSelectDone,
  onOpenGuide,
}: {
  onSelectDone?: () => void
  onOpenGuide?: () => void
}) {
  const { isInstalled, isIos, promptInstall } = usePwaInstall()
  const [fallbackGuideOpen, setFallbackGuideOpen] = useState(false)

  async function handleClick() {
    if (isInstalled) {
      onSelectDone?.()
      return
    }
    const result = await promptInstall()
    if (result === "manual") {
      if (onOpenGuide) {
        onSelectDone?.()
        onOpenGuide()
      } else {
        setFallbackGuideOpen(true)
      }
    } else {
      onSelectDone?.()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isInstalled}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0] disabled:cursor-default disabled:opacity-60"
      >
        <span className="flex items-center gap-2.5">
          <DownloadIcon className="size-4 text-[#0a0a0a]" />
          <span>{isInstalled ? "App Installed" : "Install This App"}</span>
        </span>
      </button>

      {!onOpenGuide && (
        <InstallAppGuideDialog
          open={fallbackGuideOpen}
          onOpenChange={setFallbackGuideOpen}
          isIos={isIos}
        />
      )}
    </>
  )
}
