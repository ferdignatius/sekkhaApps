import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react"
import { Select } from "../Select"
import { usePaginatedDropdown } from "@/hooks/usePaginatedDropdown"
import { useState } from "react"

beforeEach(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function PaginatedSelectHarness({
  fetcher,
}: {
  fetcher: (params: { page: number; limit: number }) => Promise<any>
}) {
  const [val, setVal] = useState("")
  const { items, hasMore, loadingMore, loadMore, total } = usePaginatedDropdown<{
    id: string
    name: string
  }>({
    fetcher,
    getKey: (item) => item.id,
    pageSize: 5,
    enabled: true,
  })

  return (
    <Select
      id="test-infinite-select"
      label="Test School"
      value={val}
      onValueChange={setVal}
      options={items.map((item) => ({ value: item.id, label: item.name }))}
      hasMore={hasMore}
      isLoadingMore={loadingMore}
      totalCount={total}
      onLoadMore={loadMore}
    />
  )
}

describe("Base Select — Infinite Scroll Support (initial limit=5 + load on scroll)", () => {
  it("loads initial 5 options and fetches page 2 when scrolled to bottom", async () => {
    const fetcher = vi.fn(({ page, limit }) => {
      expect(limit).toBe(5)
      if (page === 1) {
        return Promise.resolve({
          items: [
            { id: "1", name: "School 1" },
            { id: "2", name: "School 2" },
            { id: "3", name: "School 3" },
            { id: "4", name: "School 4" },
            { id: "5", name: "School 5" },
          ],
          total: 8,
          page: 1,
          limit: 5,
          total_pages: 2,
          has_more: true,
        })
      }
      return Promise.resolve({
        items: [
          { id: "6", name: "School 6" },
          { id: "7", name: "School 7" },
          { id: "8", name: "School 8" },
        ],
        total: 8,
        page: 2,
        limit: 5,
        total_pages: 2,
        has_more: false,
      })
    })

    render(<PaginatedSelectHarness fetcher={fetcher} />)

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith({ page: 1, limit: 5, search: undefined })
    })

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: "ArrowDown" })

    await waitFor(() => {
      expect(screen.getByText("School 5")).toBeDefined()
    })
    expect(screen.queryByText("School 6")).toBeNull()

    const scrollList = document.querySelector(
      '[data-slot="select-infinite-list"]'
    ) as HTMLElement
    expect(scrollList).not.toBeNull()

    Object.defineProperty(scrollList, "scrollHeight", { value: 240, configurable: true })
    Object.defineProperty(scrollList, "clientHeight", { value: 168, configurable: true })
    Object.defineProperty(scrollList, "scrollTop", { value: 65, configurable: true })

    fireEvent.scroll(scrollList)

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledWith({ page: 2, limit: 5, search: undefined })
      expect(screen.getByText("School 8")).toBeDefined()
    })
  })
})
