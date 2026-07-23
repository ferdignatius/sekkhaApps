import { useEffect, useState } from "react"
import { BellIcon } from "lucide-react"
import { notificationsApi } from "../api/notificationsApi"

export function useUnreadNotificationsCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
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
    try {
      const data = await notificationsApi.list()
      const unread = data.filter(n => n.status === "unread").length
      setCount(unread)
    } catch (err) {
      console.error("Gagal memuat jumlah notifikasi:", err)
    }
  }

  return count
}

export function NotificationBell() {
  const unreadCount = useUnreadNotificationsCount()

  return (
    <div className="relative">
      <BellIcon className="size-5 shrink-0 text-sekkha-ink" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-2xs">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  )
}
