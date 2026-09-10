import { useEffect, useState } from "react"
import { BellIcon, InfoIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { notificationsApi } from "../api/notificationsApi"
import type { NotificationDto } from "../api/notificationsApi"

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([])
  const [loading, setLoading] = useState(true)

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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n))
      )
      // Trigger a sidebar refresh if possible, or reload profile/auth context
      window.dispatchEvent(new Event("notifications_updated"))
    } catch (err) {
      console.error("Gagal menandai dibaca:", err)
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
              <span className="text-body-sm text-sekkha-muted">
                Loading notifications...
              </span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center space-y-2 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-6 text-center">
              <InfoIcon className="size-8 text-sekkha-slate" />
              <p className="text-body-sm font-medium text-sekkha-muted">
                No new notifications.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => {
                const isUnread = notif.status === "unread"

                return (
                  <div
                    key={notif.id}
                    className={`flex flex-col justify-between gap-4 rounded-xl border p-4 transition-all md:flex-row md:items-center ${
                      isUnread
                        ? "border-sekkha-brand-blue bg-sekkha-canvas shadow-sm"
                        : "border-sekkha-hairline-soft bg-sekkha-surface"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sekkha-surface text-sekkha-slate">
                        <BellIcon className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-body-sm-medium ${isUnread ? "text-sekkha-ink" : "text-sekkha-slate"}`}
                          >
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
                          {new Date(notif.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-caption-bold rounded-full border border-sekkha-hairline-strong px-3 py-1.5 text-sekkha-ink transition-colors hover:bg-sekkha-surface"
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
