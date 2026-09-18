import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { api, apiFetch, clearApiCache } from "../api"

describe("api client deduplication and caching", () => {
  beforeEach(() => {
    clearApiCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    clearApiCache()
  })

  it("deduplicates concurrent in-flight GET requests to the same endpoint", async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 50))
      return new Response(JSON.stringify({ name: "User 1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    // Trigger two requests simultaneously
    const [res1, res2] = await Promise.all([
      api.get<{ name: string }>("/users/me"),
      api.get<{ name: string }>("/users/me"),
    ])

    expect(res1).toEqual({ name: "User 1" })
    expect(res2).toEqual({ name: "User 1" })
    expect(callCount).toBe(1)
  })

  it("serves subsequent GET requests from memory cache within TTL", async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(
        new Response(JSON.stringify({ streak: 5 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const first = await api.get<{ streak: number }>("/users/me/streak")
    expect(first).toEqual({ streak: 5 })
    expect(callCount).toBe(1)

    // Call immediately again — should be cached
    const second = await api.get<{ streak: number }>("/users/me/streak")
    expect(second).toEqual({ streak: 5 })
    expect(callCount).toBe(1)
  })

  it("clears cache on mutating requests (POST)", async () => {
    let callCount = 0
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: string, opts?: RequestInit) => {
        callCount++
        if (opts?.method === "POST") {
          return Promise.resolve(
            new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          )
        }
        return Promise.resolve(
          new Response(JSON.stringify({ count: callCount }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      })
    vi.stubGlobal("fetch", fetchMock)

    await api.get("/events")
    expect(callCount).toBe(1)

    // Mutation should invalidate cache
    await api.post("/events", { title: "New Event" })
    expect(callCount).toBe(2)

    // Now GET should fetch fresh data
    await api.get("/events")
    expect(callCount).toBe(3)
  })

  it("bypasses cache when noCache is set to true", async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(
        new Response(JSON.stringify({ value: callCount }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    await api.get("/data", { noCache: true })
    await api.get("/data", { noCache: true })

    expect(callCount).toBe(2)
  })
})
