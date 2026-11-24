import { useState } from "react"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
} from "lucide-react"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/base"
import { clearApiCache } from "@/lib/api"
import { safeStorage } from "@/lib/storage"
import { userApi } from "../api/userApi"

export interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout: () => void
  onToast: (message: string, type?: "success" | "error") => void
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onLogout,
  onToast,
}: DeleteAccountDialogProps) {
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteReason, setDeleteReason] = useState("")
  const [showDeletePass, setShowDeletePass] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    if (deletingAccount) return
    if (nextOpen) {
      setDeletePassword("")
      setDeleteReason("")
      setDeleteError(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!deletePassword) {
      setDeleteError("Current password is required to delete your account")
      return
    }

    setDeletingAccount(true)
    setDeleteError(null)
    try {
      await userApi.deleteMyAccount({
        password: deletePassword,
        ...(deleteReason.trim() ? { reason: deleteReason.trim() } : {}),
      })
      clearApiCache()
      safeStorage.removeItem("sekkha_access_token")
      onToast("Your account has been permanently deleted.")
      onOpenChange(false)
      onLogout()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    } catch (err: any) {
      const msg =
        err?.message || "Failed to delete account. Please check your password."
      setDeleteError(msg)
      onToast(msg, "error")
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-[24px] border border-rose-200 bg-canvas p-5 text-left sm:max-w-md sm:p-6">
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <DialogHeader className="text-left">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-rose-100 text-rose-600">
                <AlertTriangleIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-ink">
                  Confirm Account Deletion
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed text-text-muted">
                  This action is permanent and cannot be undone. Please enter
                  your current password to confirm deleting your account.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deleteError && (
            <div className="flex items-center gap-2 rounded-[10px] border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800">
              <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="delete-account-password"
                className="text-xs font-bold text-ink"
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  id="delete-account-password"
                  type={showDeletePass ? "text" : "password"}
                  required
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value)
                    if (deleteError) setDeleteError(null)
                  }}
                  placeholder="Confirm your current password"
                  className="h-11 w-full rounded-[12px] border border-hairline bg-surface-soft pr-10 pl-3.5 text-xs font-semibold text-ink transition-colors outline-none focus:border-rose-600 focus:bg-canvas sm:text-sm"
                />
                <button
                  type="button"
                  aria-label={showDeletePass ? "Hide password" : "Show password"}
                  onClick={() => setShowDeletePass(!showDeletePass)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-text-muted hover:text-ink"
                >
                  {showDeletePass ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="delete-account-reason"
                className="text-xs font-bold text-ink"
              >
                Reason for leaving (optional)
              </label>
              <input
                id="delete-account-reason"
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Optional feedback"
                className="h-11 w-full rounded-[12px] border border-hairline bg-surface-soft px-3.5 text-xs font-medium text-ink transition-colors outline-none focus:border-ink focus:bg-canvas sm:text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={deletingAccount}
              onClick={() => onOpenChange(false)}
              className="h-11 flex-1 rounded-[12px] text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={deletingAccount || !deletePassword}
              className="h-11 flex-1 gap-1.5 rounded-[12px] text-xs font-bold"
            >
              {deletingAccount ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Permanently Delete</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
