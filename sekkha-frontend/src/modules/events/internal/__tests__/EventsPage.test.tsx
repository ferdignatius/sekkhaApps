import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { api } from "@/lib/api"
import { EventsPage } from "../components/EventsPage"
import {
  sortEventsForDisplay,
  getDefaultSelectedDateForMonth,
  formatSelectedDate,
} from "../utils/eventOrdering"
import type { EventListItem, EventStatus } from "../types"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}))

function toWibKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function makeEvent(
  id: string,
  title: string,
  dateKey: string,
  hourUtcOrWib: string,
  status: EventStatus
): EventListItem {
  return {
    id,
    title,
    description: `${title} description`,
    location: "Dhammasala",
    event_date: `${dateKey}T${hourUtcOrWib}:00+07:00`,
    tag: "regular-puja",
    event_type: {
      id: "typ_1",
      code: "regular-puja",
      label: "Regular Puja",
      color: "#4262FF",
      default_point_reward: 50,
    },
    status,
    point_reward: 50,
  }
}

function renderEventsPage(eventsByMonth: Record<string, EventListItem[]>, allSearchEvents: EventListItem[] = []) {
  const getSpy = vi.spyOn(api, "get").mockImplementation((url: string) => {
    if (url.includes("/configure/event-types")) {
      return Promise.resolve([
        {
          id: "typ_1",
          code: "regular-puja",
          label: "Regular Puja",
          color: "#4262FF",
          default_point_reward: 50,
          is_active: true,
        },
      ]) as any
    }
    if (url.includes("search=")) {
      return Promise.resolve(allSearchEvents) as any
    }
    const match = url.match(/month=(\d{4}-\d{2})/)
    const monthKey = match ? match[1] : ""
    return Promise.resolve(eventsByMonth[monthKey] ?? []) as any
  })

  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    userId: "usr_org_1",
    role: "organizer",
    name: "Organizer Sekkha",
  }

  return {
    getSpy,
    ...render(
      <AuthContext.Provider value={{ authState } as any}>
        <EventsPage />
      </AuthContext.Provider>
    ),
  }
}

describe("EventsPage — Always-Active Date (Default Today), No Full-Month Dump & Status Ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("defaults to Today as active date, omits Full Month/Show All buttons, and keeps Today selected when clicked again", async () => {
    const now = new Date()
    const todayKey = toWibKey(now)
    const [year, month, day] = todayKey.split("-").map(Number)
    const monthKey = `${year}-${String(month).padStart(2, "0")}`
    const otherDay = day === 2 ? 18 : 2
    const otherDayKey = `${monthKey}-${String(otherDay).padStart(2, "0")}`

    const todayLabel = new Date(year, month - 1, day).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    const otherLabel = new Date(year, month - 1, otherDay).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    const monthEvents: EventListItem[] = [
      makeEvent("evt_other_closed", "Earlier Closed Event", otherDayKey, "09:00", "closed"),
      makeEvent("evt_today_closed", "Today Morning Closed", todayKey, "07:00", "closed"),
      makeEvent("evt_today_sched", "Today Evening Puja", todayKey, "19:00", "scheduled"),
      makeEvent("evt_today_live", "Today Live Service", todayKey, "14:00", "active"),
    ]

    renderEventsPage({ [monthKey]: monthEvents })

    await waitFor(() => {
      expect(screen.getByText("Today Live Service")).toBeTruthy()
    })

    // Header date displays "day, date month year" in both full and short formats
    const headerTitleBtn = screen.getByTitle("Choose month and year")
    const fullHeaderText =
      headerTitleBtn.querySelector(".hidden.sm\\:inline")?.textContent ?? ""
    const shortHeaderText =
      headerTitleBtn.querySelector(".sm\\:hidden")?.textContent ?? ""
    expect(fullHeaderText).toMatch(/^[A-Za-z]+, \d{1,2} [A-Za-z]+ \d{4}$/)
    expect(fullHeaderText).toBe(formatSelectedDate(todayKey))
    expect(shortHeaderText).toMatch(/^[A-Za-z]+, \d{1,2} [A-Za-z]+ \d{4}$/)
    expect(shortHeaderText).toBe(formatSelectedDate(todayKey, "short"))

    // Full Month & Show All controls must not exist
    expect(screen.queryByRole("button", { name: /Full Month/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /Show All/i })).toBeNull()

    // Closed event on other day is hidden by default (only Today's events render)
    expect(screen.queryByText("Earlier Closed Event")).toBeNull()
    expect(screen.getByText("Today Evening Puja")).toBeTruthy()
    expect(screen.getByText("Today Morning Closed")).toBeTruthy()

    // Priority order within active date: active -> scheduled -> closed
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual([
      "Today Live Service",
      "Today Evening Puja",
      "Today Morning Closed",
    ])

    // Clicking Today again on the calendar must NOT clear selectedDate
    const todayButtons = screen.getAllByRole("button", { name: todayLabel })
    expect(todayButtons[0].getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(todayButtons[0])

    expect(todayButtons[0].getAttribute("aria-pressed")).toBe("true")
    expect(screen.queryByText("Earlier Closed Event")).toBeNull()

    // Clicking another date switches active date to show that day's events
    const otherButtons = screen.getAllByRole("button", { name: otherLabel })
    fireEvent.click(otherButtons[0])

    await waitFor(() => {
      expect(screen.getByText("Earlier Closed Event")).toBeTruthy()
    })
    expect(screen.queryByText("Today Live Service")).toBeNull()
  })

  it("keeps an active date selected across Prev/Next month navigation and restores Today cleanly", async () => {
    const now = new Date()
    const todayKey = toWibKey(now)
    const [year, month] = todayKey.split("-").map(Number)
    const currentMonthKey = `${year}-${String(month).padStart(2, "0")}`
    const nextMonthDate = new Date(year, month, 1)
    const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`
    const nextMonthFirstKey = `${nextMonthKey}-01`
    const nextMonthFirstLabel = new Date(
      nextMonthDate.getFullYear(),
      nextMonthDate.getMonth(),
      1
    ).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    const nextFirstEvent = makeEvent(
      "evt_next_1",
      "First Day Next Month",
      nextMonthFirstKey,
      "09:00",
      "scheduled"
    )
    const nextTenthEvent = makeEvent(
      "evt_next_10",
      "Tenth Day Next Month",
      `${nextMonthKey}-10`,
      "09:00",
      "scheduled"
    )

    renderEventsPage({
      [currentMonthKey]: [],
      [nextMonthKey]: [nextFirstEvent, nextTenthEvent],
    })

    // Click Next month -> automatically selects day 1 of next month
    fireEvent.click(screen.getAllByRole("button", { name: /Next month/i })[0])

    await waitFor(() => {
      expect(screen.getByText("First Day Next Month")).toBeTruthy()
    })
    expect(screen.queryByText("Tenth Day Next Month")).toBeNull()
    expect(
      screen.getAllByRole("button", { name: nextMonthFirstLabel })[0].getAttribute(
        "aria-pressed"
      )
    ).toBe("true")
  })

  it("allows global Search across dates/months and returns to the active date when cleared", async () => {
    const now = new Date()
    const todayKey = toWibKey(now)
    const [year, month, day] = todayKey.split("-").map(Number)
    const monthKey = `${year}-${String(month).padStart(2, "0")}`
    const otherDay = day === 2 ? 18 : 2
    const otherDayKey = `${monthKey}-${String(otherDay).padStart(2, "0")}`

    const todayEvent = makeEvent("evt_today", "Today Puja", todayKey, "10:00", "scheduled")
    const archivedEvent = makeEvent("evt_arch", "Archived Retreat", otherDayKey, "09:00", "closed")

    renderEventsPage({ [monthKey]: [todayEvent, archivedEvent] }, [archivedEvent])

    await waitFor(() => {
      expect(screen.getByText("Today Puja")).toBeTruthy()
    })
    expect(screen.queryByText("Archived Retreat")).toBeNull()

    const searchInput = screen.getByPlaceholderText("Search events...")
    fireEvent.change(searchInput, { target: { value: "Retreat" } })

    await waitFor(() => {
      expect(screen.getByText("Archived Retreat")).toBeTruthy()
    })

    fireEvent.click(screen.getByRole("button", { name: "Clear Search" }))

    await waitFor(() => {
      expect(screen.getByText("Today Puja")).toBeTruthy()
    })
    expect(screen.queryByText("Archived Retreat")).toBeNull()
  })

  it("auto-navigates activeMonth and selectedDate to a newly created event date", async () => {
    const now = new Date()
    const todayKey = toWibKey(now)
    const [year, month] = todayKey.split("-").map(Number)
    const currentMonthKey = `${year}-${String(month).padStart(2, "0")}`
    const futureMonthDate = new Date(year, month, 1)
    const futureMonthKey = `${futureMonthDate.getFullYear()}-${String(futureMonthDate.getMonth() + 1).padStart(2, "0")}`
    const futureDateKey = `${futureMonthKey}-15`

    const createdEvent = makeEvent(
      "evt_new_future",
      "Future New Puja",
      futureDateKey,
      "10:00",
      "scheduled"
    )

    const monthStore: Record<string, EventListItem[]> = {
      [currentMonthKey]: [],
      [futureMonthKey]: [],
    }

    vi.spyOn(api, "post").mockImplementation((url: string) => {
      if (url === "/events") {
        monthStore[futureMonthKey] = [createdEvent]
        return Promise.resolve(createdEvent) as any
      }
      return Promise.resolve({}) as any
    })

    renderEventsPage(monthStore)

    // Move to next month (day 01 active) so initialDate is guaranteed in the future
    fireEvent.click(screen.getAllByRole("button", { name: /Next month/i })[0])

    await waitFor(() => {
      expect(screen.getByText(/No events/i)).toBeTruthy()
    })

    // Open Create Event modal
    fireEvent.click(screen.getByRole("button", { name: /Create New Event/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Event name/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole("radio", { name: /Regular Puja/i }))
    fireEvent.change(screen.getByLabelText(/Event name/i), {
      target: { value: "Future New Puja" },
    })

    fireEvent.click(screen.getByRole("button", { name: /^Create Event$/i }))

    // Server returned event on the 15th -> activeDate must jump from 01 to 15 and display it immediately!
    await waitFor(() => {
      expect(screen.getByText("Future New Puja")).toBeTruthy()
    })
  })
})

describe("eventOrdering unit helpers", () => {
  it("formatSelectedDate formats YYYY-MM-DD as 'day, date month year' in long and short forms", () => {
    expect(formatSelectedDate("2026-11-11")).toBe("Wednesday, 11 November 2026")
    expect(formatSelectedDate("2026-11-11", "short")).toBe("Wed, 11 Nov 2026")
    expect(formatSelectedDate("2026-01-05")).toBe("Monday, 5 January 2026")
    expect(formatSelectedDate("2026-01-05", "short")).toBe("Mon, 5 Jan 2026")
  })

  it("getDefaultSelectedDateForMonth returns todayKey for current month and day 01 for other months", () => {
    const fixedNow = new Date("2026-11-11T10:00:00+07:00")
    expect(
      getDefaultSelectedDateForMonth(new Date("2026-11-01T00:00:00+07:00"), fixedNow)
    ).toBe("2026-11-11")
    expect(
      getDefaultSelectedDateForMonth(new Date("2026-12-01T00:00:00+07:00"), fixedNow)
    ).toBe("2026-12-01")
  })

  it("sortEventsForDisplay sorts active -> scheduled ASC -> closed -> cancel", () => {
    const items: EventListItem[] = [
      makeEvent("1", "Cancelled", "2026-11-11", "08:00", "cancel"),
      makeEvent("2", "Closed", "2026-11-11", "07:00", "closed"),
      makeEvent("3", "Sched Late", "2026-11-11", "19:00", "scheduled"),
      makeEvent("4", "Sched Early", "2026-11-11", "10:00", "scheduled"),
      makeEvent("5", "Live Now", "2026-11-11", "14:00", "active"),
    ]

    expect(sortEventsForDisplay(items).map((e) => e.id)).toEqual([
      "5",
      "4",
      "3",
      "2",
      "1",
    ])
  })
})

describe("EventsPage Category Filter Dropdown — Initial 5 + Infinite Scroll", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("loads initial 5 categories (limit=5) and loads page 2 when scrolling the category menu", async () => {
    const getSpy = vi.spyOn(api, "get").mockImplementation((url: string) => {
      if (url.includes("/configure/event-types")) {
        if (url.includes("page=2&limit=5")) {
          return Promise.resolve({
            items: [
              { id: "et_6", code: "retreat", label: "Retreat", color: "#8B5CF6", default_point_reward: 100, is_active: true },
            ],
            total: 6,
            page: 2,
            limit: 5,
            total_pages: 2,
            has_more: false,
          }) as any
        }
        return Promise.resolve({
          items: [
            { id: "et_1", code: "cat-1", label: "Category 1", color: "#4262FF", default_point_reward: 50, is_active: true },
            { id: "et_2", code: "cat-2", label: "Category 2", color: "#0D9488", default_point_reward: 50, is_active: true },
            { id: "et_3", code: "cat-3", label: "Category 3", color: "#EC4899", default_point_reward: 50, is_active: true },
            { id: "et_4", code: "cat-4", label: "Category 4", color: "#F59E0B", default_point_reward: 50, is_active: true },
            { id: "et_5", code: "cat-5", label: "Category 5", color: "#10B981", default_point_reward: 50, is_active: true },
          ],
          total: 6,
          page: 1,
          limit: 5,
          total_pages: 2,
          has_more: true,
        }) as any
      }
      return Promise.resolve([]) as any
    })

    const authState: AuthState = {
      ...initialAuthState,
      status: "authenticated",
      userId: "usr_org_1",
      role: "organizer",
      name: "Organizer Sekkha",
    }

    render(
      <AuthContext.Provider value={{ authState } as any}>
        <EventsPage />
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        expect.stringContaining("/configure/event-types?is_active=true&page=1&limit=5&paginated=true")
      )
    })

    fireEvent.click(screen.getByTitle(/Filter by category/i))

    const listEl = screen.getByTestId("events-category-scroll-list")
    expect(within(listEl).getByText("Category 5")).toBeTruthy()
    expect(within(listEl).queryByText("Retreat")).toBeNull()

    Object.defineProperty(listEl, "scrollHeight", { value: 240, configurable: true })
    Object.defineProperty(listEl, "clientHeight", { value: 168, configurable: true })
    Object.defineProperty(listEl, "scrollTop", { value: 68, configurable: true })

    fireEvent.scroll(listEl)

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        expect.stringContaining("/configure/event-types?is_active=true&page=2&limit=5&paginated=true")
      )
      expect(within(listEl).getByText("Retreat")).toBeTruthy()
    })
  })
})
