import { useEffect, useRef, useState } from "react"
import { peopleApi } from "../api/peopleApi"
import type { SimilarMemberDto } from "../api/peopleApi"

interface UseSimilarMembersOptions {
  enabled?: boolean
  minChars?: number
  delayMs?: number
  limit?: number
}

/**
 * Non-blocking, debounced async similarity search for pre-provisioning & manual attendance.
 * Cancels stale in-flight requests and silently clears on abort/network issues.
 */
export function useSimilarMembers(
  nameQuery: string,
  options: UseSimilarMembersOptions = {}
) {
  const { enabled = true, minChars = 3, delayMs = 250, limit = 5 } = options
  const cappedLimit = Math.min(Math.max(limit, 1), 5)

  const [similarMembers, setSimilarMembers] = useState<SimilarMemberDto[]>([])
  const [totalMatches, setTotalMatches] = useState(0)
  const [searching, setSearching] = useState(false)
  const seqRef = useRef(0)

  useEffect(() => {
    const trimmed = nameQuery.trim()
    if (!enabled || trimmed.length < minChars) {
      seqRef.current += 1
      setSimilarMembers([])
      setTotalMatches(0)
      setSearching(false)
      return
    }

    const requestId = ++seqRef.current
    const controller = new AbortController()
    let active = true

    const timer = window.setTimeout(() => {
      setSearching(true)
      peopleApi
        .findSimilarMembers(trimmed, cappedLimit, { signal: controller.signal })
        .then((res) => {
          if (!active || seqRef.current !== requestId) return
          const items = (Array.isArray(res?.items) ? res.items : []).slice(
            0,
            cappedLimit
          )
          setSimilarMembers(items)
          setTotalMatches(items.length)
        })
        .catch(() => {
          if (!active || seqRef.current !== requestId) return
          setSimilarMembers([])
          setTotalMatches(0)
        })
        .finally(() => {
          if (active && seqRef.current === requestId) {
            setSearching(false)
          }
        })
    }, delayMs)

    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [nameQuery, enabled, minChars, delayMs, cappedLimit])

  return {
    similarMembers,
    totalMatches,
    searching,
  }
}

