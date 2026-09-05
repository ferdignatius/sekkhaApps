import { useEffect, useState } from "react"
import { BellIcon, CheckIcon, XIcon, InfoIcon, AwardIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { notificationsApi } from "../api/notificationsApi"
import type { NotificationDto } from "../api/notificationsApi"

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    try {
      setLoading(true)
      const data = await notificationsApi.list()
      setNotifications(data)
    } catch (err) {
      console.error("Gagal memuat notifikasi:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, status: "read" } : n))
      )
      // Trigger a sidebar refresh if possible, or reload profile/auth context
      // Note: we can trigger window dispatchEvent to update the bell count globally
      window.dispatchEvent(new Event("notifications_updated"))
    } catch (err) {
      console.error("Gagal menandai dibaca:", err)
    }
  }

  async function handleAccept(notificationId: string, invitationId: string) {
    try {
      setProcessingId(notificationId)
      const res = await notificationsApi.acceptInvitation(invitationId)
      // Mark notification as read
      await notificationsApi.markAsRead(notificationId)
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, status: "read" } : n))
      )
      
      alert(`Selamat! Peran Anda telah berhasil diubah menjadi ${res.role === "pengurus" ? "Pengurus" : "Aktivis"}. Silakan reload halaman jika menu navigasi belum terupdate.`)
      
      // Reload profile
      window.location.reload()
    } catch (err: any) {
      alert(err.message || "Gagal menerima undangan")
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(notificationId: string, invitationId: string) {
    try {
      setProcessingId(notificationId)
      await notificationsApi.rejectInvitation(invitationId)
      // Mark notification as read
      await notificationsApi.markAsRead(notificationId)

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, status: "read" } : n))
      )

      alert("Undangan ditolak.")
      window.dispatchEvent(new Event("notifications_updated"))
    } catch (err: any) {
      alert(err.message || "Gagal menolak undangan")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Notifications" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-2">
            <BellIcon className="size-5 text-sekkha-brand-blue" />
            <h1 className="text-heading-5 text-sekkha-ink">Notifications</h1>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
              <span className="text-body-sm text-sekkha-muted">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-6 text-center space-y-2">
              <InfoIcon className="size-8 text-sekkha-slate" />
              <p className="text-body-sm text-sekkha-muted font-medium">No new notifications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notif => {
                const isUnread = notif.status === "unread"
                const isInvitation = notif.type === "role_invitation"
                const invitationId = notif.data?.invitationId

                return (
                  <div
                    key={notif.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                      isUnread
                        ? "border-sekkha-brand-blue bg-sekkha-canvas shadow-sm"
                        : "border-sekkha-hairline-soft bg-sekkha-surface"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isInvitation ? "bg-sekkha-teal-light text-sekkha-brand-blue" : "bg-sekkha-surface text-sekkha-slate"
                      }`}>
                        {isInvitation ? <AwardIcon className="size-5" /> : <BellIcon className="size-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-body-sm-medium ${isUnread ? "text-sekkha-ink" : "text-sekkha-slate"}`}>
                            {notif.title}
                          </p>
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-sekkha-brand-blue" />
                          )}
                        </div>
                        <p className="text-caption text-sekkha-slate">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-sekkha-muted">
                          {new Date(notif.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {isInvitation && invitationId && isUnread && (
                        <>
                          <button
                            type="button"
                            disabled={processingId !== null}
                            onClick={() => handleAccept(notif.id, invitationId)}
                            className="flex items-center gap-1 rounded-full bg-sekkha-primary px-3 py-1.5 text-caption-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            <CheckIcon className="size-3" />
                            Terima
                          </button>
                          <button
                            type="button"
                            disabled={processingId !== null}
                            onClick={() => handleReject(notif.id, invitationId)}
                            className="flex items-center gap-1 rounded-full border border-sekkha-hairline-strong px-3 py-1.5 text-caption-bold text-sekkha-ink transition-colors hover:bg-sekkha-surface disabled:opacity-50"
                          >
                            <XIcon className="size-3" />
                            Tolak
                          </button>
                        </>
                      )}

                      {isUnread && (!isInvitation || !invitationId) && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notif.id)}
                          className="rounded-full border border-sekkha-hairline-strong px-3 py-1.5 text-caption-bold text-sekkha-ink transition-colors hover:bg-sekkha-surface"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
