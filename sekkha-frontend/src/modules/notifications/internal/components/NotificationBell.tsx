import { useEffect, useState } from "react"
import { BellIcon } from "lucide-react"
import { notificationsApi, ENABLE_NOTIFICATIONS } from "../api/notificationsApi"

export function useUnreadNotificationsCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!ENABLE_NOTIFICATIONS) return

    loadCount()

    // Setup window event listener for updates
    const handleUpdate = () => {
      loadCount()
    }
    window.addEventListener("notifications_updated", handleUpdate)
    
    // Optional: poll every 30 seconds
    const interval = setInterval(loadCount, 30000)

    return () => {
      window.removeEventListener("notifications_updated", handleUpdate)
      clearInterval(interval)
    }
  }, [])

  async function loadCount() {
    if (!ENABLE_NOTIFICATIONS) return
    try {
      const data = await notificationsApi.list()
      const unread = data.filter(n => n.status === "unread").length
      setCount(unread)
    } catch {
      // Silent catch if offline
    }
  }

  return count
}

export function NotificationBell() {
  const unreadCount = useUnreadNotificationsCount()

  return (
    <div className="relative" title={ENABLE_NOTIFICATIONS ? "Notifikasi" : "Notifikasi (Fitur Non-aktif)"}>
      <BellIcon className="size-5 shrink-0 text-sekkha-ink opacity-70" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-2xs">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  )
}
