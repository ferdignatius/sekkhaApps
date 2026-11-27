import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

export const SCHOOL_REQUESTS_CHANGED_EVENT = "sekkha:school_requests_changed"

export function notifySchoolRequestsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SCHOOL_REQUESTS_CHANGED_EVENT))
  }
}

export function usePendingSchoolRequestsCount(enabled: boolean): number {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCount(0)
      return
    }
    try {
      const res: any = await api.get("/configure/schools/pending")
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.items)
            ? res.items
            : []
      setCount(list.length)
    } catch {
      // Non-blocking badge fetch
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const handler = () => {
      void refresh()
    }
    window.addEventListener(SCHOOL_REQUESTS_CHANGED_EVENT, handler)
    return () =>
      window.removeEventListener(SCHOOL_REQUESTS_CHANGED_EVENT, handler)
  }, [enabled, refresh])

  return count
}
