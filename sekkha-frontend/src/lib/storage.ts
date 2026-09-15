/**
 * Safe storage wrapper that handles SSR environments, Safari Private Browsing,
 * quota exceptions, and storage-disabled environments gracefully.
 */

class MemoryStorage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

const memoryStorageFallback = new MemoryStorage()

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key)
      }
    } catch {
      // SecurityError / QuotaExceeded / disabled storage fallback
    }
    return memoryStorageFallback.getItem(key)
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value)
        return
      }
    } catch {
      // fallback to memory
    }
    memoryStorageFallback.setItem(key, value)
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key)
        return
      }
    } catch {
      // fallback to memory
    }
    memoryStorageFallback.removeItem(key)
  },

  clear(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear()
      }
    } catch {
      // fallback to memory
    }
    memoryStorageFallback.clear()
  },
}
