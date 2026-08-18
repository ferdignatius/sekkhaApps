// feature/configure/hooks/useConfigureCrud
// Generic hook for master data CRUD — fetches from API, falls back to initial data on error.

import { useState, useEffect, useCallback } from "react"

interface CrudApi<T> {
  list: () => Promise<T[]>
  create: (data: any) => Promise<{ id: string }>
  update: (id: string, data: any) => Promise<{ id: string }>
  remove: (id: string) => Promise<unknown>
}

export function useConfigureCrud<T extends { id: string }>(
  apiService: CrudApi<T>,
  fallbackData: T[] = [],
) {
  const [items, setItems] = useState<T[]>(fallbackData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.list()
      setItems(data)
    } catch (err) {
      console.warn("Failed to fetch from API, using fallback:", err)
      setError("Gagal memuat data dari server")
      setItems(fallbackData)
    } finally {
      setLoading(false)
    }
  }, [apiService, fallbackData])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  const create = async (data: Omit<T, "id">) => {
    try {
      const result = await apiService.create(data)
      await fetchItems() // refresh from server
      return result
    } catch (err) {
      // Optimistic: add locally
      const newItem = { ...data, id: `temp-${Date.now()}` } as T
      setItems(prev => [...prev, newItem])
      throw err
    }
  }

  const update = async (id: string, data: Partial<T>) => {
    try {
      const result = await apiService.update(id, data)
      await fetchItems()
      return result
    } catch (err) {
      // Optimistic: update locally
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item))
      throw err
    }
  }

  const remove = async (id: string) => {
    try {
      await apiService.remove(id)
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      // Optimistic: remove locally anyway
      setItems(prev => prev.filter(item => item.id !== id))
      throw err
    }
  }

  return { items, setItems, loading, error, create, update, remove, refetch: fetchItems }
}
