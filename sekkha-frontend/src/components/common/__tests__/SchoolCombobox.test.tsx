import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react"
import { SchoolCombobox } from "../SchoolCombobox"
import { api } from "@/lib/api"

beforeEach(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("SchoolCombobox — Initial Load 5 + Infinite Scroll", () => {
  it("requests page=1&limit=5 initially and loads page=2&limit=5 when user scrolls to bottom", async () => {
    const getSpy = vi.spyOn(api, "get").mockImplementation((url: string) => {
      if (url.includes("page=1&limit=5")) {
        return Promise.resolve({
          items: [
            { id: "s1", name: "SMA 1", type: "SMA/SMK", status: "active" },
            { id: "s2", name: "SMA 2", type: "SMA/SMK", status: "active" },
            { id: "s3", name: "SMA 3", type: "SMA/SMK", status: "active" },
            { id: "s4", name: "SMA 4", type: "SMA/SMK", status: "active" },
            { id: "s5", name: "SMA 5", type: "SMA/SMK", status: "active" },
          ],
          total: 7,
          page: 1,
          limit: 5,
          total_pages: 2,
          has_more: true,
        }) as any
      }
      if (url.includes("page=2&limit=5")) {
        return Promise.resolve({
          items: [
            { id: "s6", name: "SMA 6", type: "SMA/SMK", status: "active" },
            { id: "s7", name: "SMA 7", type: "SMA/SMK", status: "active" },
          ],
          total: 7,
          page: 2,
          limit: 5,
          total_pages: 2,
          has_more: false,
        }) as any
      }
      return Promise.resolve({ items: [], total: 0, page: 1, limit: 5, total_pages: 1, has_more: false }) as any
    })

    render(<SchoolCombobox value="" onChange={vi.fn()} />)

    // Open dropdown
    fireEvent.click(
      screen.getByRole("button", { name: /Search and select your school/i })
    )

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        expect.stringContaining("/configure/schools?include_pending=true&page=1&limit=5&paginated=true"),
        undefined
      )
      expect(screen.getByText("SMA 5")).toBeDefined()
    })
    expect(screen.queryByText("SMA 6")).toBeNull()

    const listbox = screen.getByRole("listbox")
    Object.defineProperty(listbox, "scrollHeight", { value: 260, configurable: true })
    Object.defineProperty(listbox, "clientHeight", { value: 168, configurable: true })
    Object.defineProperty(listbox, "scrollTop", { value: 85, configurable: true })

    fireEvent.scroll(listbox)

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        expect.stringContaining("page=2&limit=5&paginated=true"),
        undefined
      )
      expect(screen.getByText("SMA 7")).toBeDefined()
    })
  })
})
