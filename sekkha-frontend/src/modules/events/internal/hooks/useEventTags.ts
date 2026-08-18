// feature/events/hooks/useEventTags
// Fetches event types from master data API and builds tag color map.
// Falls back to DEFAULT_EVENT_TAG_COLORS if API is unavailable.

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { DEFAULT_EVENT_TAG_COLORS, hexToTagColors } from "../types"
import type { TagColors } from "../types"

interface EventTypeFromApi {
  id: string
  code: string
  label: string
  color: string
  is_default: boolean
}

export function useEventTags() {
  const [tagColors, setTagColors] = useState<Record<string, TagColors>>(DEFAULT_EVENT_TAG_COLORS)
  const [tags, setTags] = useState<EventTypeFromApi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchTags() {
      try {
        const data = await api.get<EventTypeFromApi[]>("/configure/event-types")
        if (cancelled) return

        setTags(data)

        // Build color map from API data
        const colors: Record<string, TagColors> = {}
        for (const t of data) {
          colors[t.code] = hexToTagColors(t.color)
        }
        // Merge with defaults (API takes precedence)
        setTagColors({ ...DEFAULT_EVENT_TAG_COLORS, ...colors })
      } catch {
        // API failed — keep defaults
        setTagColors(DEFAULT_EVENT_TAG_COLORS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchTags()
    return () => { cancelled = true }
  }, [])

  return { tagColors, tags, loading }
}
